// main.go
package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/joho/godotenv"
	"github.com/robfig/cron/v3"
	"github.com/rs/cors"
)

func init() {
	if err := godotenv.Load(); err != nil {
		log.Println("⚠️  .env not found, using real environment")
	}
}

var db *sql.DB

// FileData represents struktur data pada tabel db_sizes
type FileData struct {
	ID       int    `json:"id"`
	Date     string `json:"date"`
	Filename string `json:"filename"`
	SizeKB   int64  `json:"size_kb"`
}

func main() {
	// Ganti DSN sesuai kredensial Anda
	dsn := "root:@tcp(localhost:3306)/monitoring_db"
	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}
	defer db.Close()

	if err = db.Ping(); err != nil {
		log.Fatalf("DB ping error: %v", err)
	}

	// Buat tabel jika belum ada
	_, err = db.Exec(`
        CREATE TABLE IF NOT EXISTS db_sizes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            filename VARCHAR(255) NOT NULL,
            size_kb BIGINT NOT NULL
        );

		`)
	if err != nil {
		log.Fatalf("Create table error: %v", err)
	}

	// Jadwal cron: sync dan notify setiap hari tiap 5 menit
	c := cron.New()
	c.AddFunc("*/5 * * *", func() {
		log.Println("⏰ Running daily sync + notify")
		if err := syncFileDataToDB("./sql_files"); err != nil {
			log.Println("Sync error:", err)
			return
		}
		if err := checkAndNotify(); err != nil {
			log.Println("Notify error:", err)
		}
	})
	c.Start()
	defer c.Stop()

	mux := http.NewServeMux()
	// Endpoint upload file .sql
	mux.HandleFunc("/upload", uploadSQLFile)
	// Endpoint lain
	mux.HandleFunc("/db-sizes", getDBSizes)
	mux.HandleFunc("/alerts", getAlerts)

	// CORS: izinkan frontend
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowCredentials: true,
	}).Handler(mux)

	log.Println("🚀 Server running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

// uploadSQLFile menangani upload .sql dan simpan ke folder sql_files tanpa batasan ukuran
func uploadSQLFile(w http.ResponseWriter, r *http.Request) {
	// Ambil file dari form
	file, header, err := r.FormFile("sqlfile")
	if err != nil {
		http.Error(w, "Gagal membaca file: "+err.Error(), http.StatusBadRequest)
		return
	}
	defer file.Close()

	// Pastikan folder sql_files ada
	dstDir := "./sql_files"
	if err := os.MkdirAll(dstDir, 0755); err != nil {
		http.Error(w, "Gagal membuat folder: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// Simpan file ke disk
	dstPath := filepath.Join(dstDir, header.Filename)
	out, err := os.Create(dstPath)
	if err != nil {
		http.Error(w, "Gagal membuat file: "+err.Error(), http.StatusInternalServerError)
		return
	}
	defer out.Close()
	if _, err := io.Copy(out, file); err != nil {
		http.Error(w, "Gagal menulis file: "+err.Error(), http.StatusInternalServerError)
		return
	}

	// --- INSERT KE DATABASE SEGERA ---
	info, err := out.Stat()
	if err != nil {
		log.Printf("Stat error: %v", err)
	} else {
		sizeKB := info.Size() / 1024
		today := time.Now().Format("2006-01-02")

		// Masukkan record baru
		_, err = db.Exec(
			"INSERT INTO db_sizes (date, filename, size_kb) VALUES (?, ?, ?)",
			today, header.Filename, sizeKB,
		)
		if err != nil {
			log.Printf("DB insert error: %v", err)
		} else {
			// Cek ukuran sebelumnya untuk file yang sama
			var prevKB int64
			err = db.QueryRow(`
                SELECT size_kb
                FROM db_sizes
                WHERE filename = ?
                ORDER BY date DESC, id DESC
                LIMIT 1 OFFSET 1
            `, header.Filename).Scan(&prevKB)

			// Jika ada prevKB dan penurunan → kirim notifikasi email segera
			if err == nil && sizeKB < prevKB {
				body := fmt.Sprintf(
					"Subject: [ALERT] Database size decreased for %s\n\n%s: %d KB → %d KB\n",
					header.Filename, header.Filename, prevKB, sizeKB,
				)
				go func() {
					if err := sendGmail(body); err != nil {
						log.Println("❌ sendGmail error:", err)
					} else {
						log.Println("✉️  Email alert sent")
					}
				}()
			}
		}
	}
	// --- selesai insert & notifikasi ---

	w.WriteHeader(http.StatusCreated)
	w.Write([]byte("File berhasil di-upload dan dicatat di DB"))
}

// syncFileDataToDB membaca file .sql dalam folder, lalu simpan ukurannya ke DB
func syncFileDataToDB(folder string) error {
	if _, err := db.Exec("TRUNCATE TABLE db_sizes"); err != nil {
		return err
	}
	return filepath.Walk(folder, func(path string, info os.FileInfo, err error) error {
		if err != nil || info.IsDir() || filepath.Ext(info.Name()) != ".sql" {
			return err
		}
		date := info.ModTime().Format("2006-01-02")
		sizeKB := info.Size() / 1024
		_, err = db.Exec(
			"INSERT INTO db_sizes (date, filename, size_kb) VALUES (?, ?, ?)",
			date, info.Name(), sizeKB,
		)
		return err
	})
}

// checkAndNotify mengirim email jika ada penurunan ukuran dari hari sebelumnya
func checkAndNotify() error {
	today := time.Now().Format("2006-01-02")

	// Perbaiki query SQL untuk mengambil `date`
	rows, err := db.Query(`
        SELECT c.filename, c.date, MAX(p.size_kb) AS prev, c.size_kb AS cur
        FROM db_sizes c
        LEFT JOIN db_sizes p
          ON c.filename = p.filename
          AND DATE_SUB(c.date, INTERVAL 1 DAY) = p.date
        WHERE c.date = ?
        GROUP BY c.filename, c.date
        HAVING cur < prev
    `, today)
	if err != nil {
		return err
	}
	defer rows.Close()

	// Pastikan ada `Date` dalam struct alert
	var alerts []struct {
		File string `json:"filename"`
		Date string `json:"date"` // Field Date
		Prev int64  `json:"prev"`
		Cur  int64  `json:"cur"`
	}

	// Mengambil data dari query
	for rows.Next() {
		var f, date string
		var prev, cur int64
		if err := rows.Scan(&f, &date, &prev, &cur); err != nil {
			return err
		}
		alerts = append(alerts, struct {
			File string `json:"filename"`
			Date string `json:"date"`
			Prev int64  `json:"prev"`
			Cur  int64  `json:"cur"`
		}{f, date, prev, cur})
	}

	// Jika tidak ada data alert, kembalikan
	if len(alerts) == 0 {
		return nil
	}

	// Membuat body email dengan penurunan ukuran dan tanggal
	body := "Subject: [ALERT] Penurunan Size Database\n\n"
	for _, a := range alerts {
		body += fmt.Sprintf("Pada hari ini\n • %s on %s: %d KB → %d KB\n", a.File, a.Date, a.Prev, a.Cur)
	}

	// Kirim email
	return sendGmail(body)
}

// sendGmail kirim email via Gmail SMTP
func sendGmail(body string) error {
	from := os.Getenv("GMAIL_USER")
	pass := os.Getenv("GMAIL_PASS")
	to := os.Getenv("ALERT_RECIPIENT")

	if from == "" || pass == "" || to == "" {
		return fmt.Errorf("missing SMTP env vars (GMAIL_USER, GMAIL_PASS, ALERT_RECIPIENT)")
	}

	auth := smtp.PlainAuth("", from, pass, "smtp.gmail.com")
	return smtp.SendMail("smtp.gmail.com:587", auth, from, []string{to}, []byte(body))
}

// getDBSizes kembalikan semua record ukuran sebagai JSON
func getDBSizes(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT id, date, filename, size_kb FROM db_sizes ORDER BY date")
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	var out []FileData
	for rows.Next() {
		var f FileData
		if err := rows.Scan(&f.ID, &f.Date, &f.Filename, &f.SizeKB); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		out = append(out, f)
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(out)
}

// getAlerts kembalikan daftar file yang ukurannya menurun hari ini
func getAlerts(w http.ResponseWriter, r *http.Request) {
	today := time.Now().Format("2006-01-02")
	rows, err := db.Query(`
        SELECT c.filename, c.date, MAX(p.size_kb) AS prev, c.size_kb AS cur
        FROM db_sizes c
        LEFT JOIN db_sizes p
          ON c.filename = p.filename
          AND DATE_SUB(c.date, INTERVAL 1 DAY) = p.date
        WHERE c.date = ?
        GROUP BY c.filename, c.date
        HAVING cur < prev
    `, today)
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	// Struktur untuk menyimpan data alerts dengan date
	var alerts []struct {
		Filename string `json:"filename"`
		Date     string `json:"date"` // Menambahkan field Date
		Prev     int64  `json:"prev"`
		Cur      int64  `json:"cur"`
	}

	// Loop untuk mengisi alerts dengan data dari query
	for rows.Next() {
		var f, date string
		var prev, cur int64
		if err := rows.Scan(&f, &date, &prev, &cur); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		alerts = append(alerts, struct {
			Filename string `json:"filename"`
			Date     string `json:"date"`
			Prev     int64  `json:"prev"`
			Cur      int64  `json:"cur"`
		}{f, date, prev, cur})
	}

	// Kirimkan data alerts ke frontend dalam format JSON
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}
