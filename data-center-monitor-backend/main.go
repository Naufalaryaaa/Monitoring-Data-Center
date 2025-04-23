package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"net/smtp"
	"os"
	"path/filepath"
	"time"

	_ "github.com/go-sql-driver/mysql"
	"github.com/robfig/cron/v3" // Package cron untuk penjadwalan
	"github.com/rs/cors"        // Untuk CORS (Cross-Origin Resource Sharing)
)

var db *sql.DB

// FileData represents the structure of the data to be stored in db_sizes
type FileData struct {
	ID       int    `json:"id"`
	Date     string `json:"date"`
	Filename string `json:"filename"`
	SizeKB   int64  `json:"size_kb"`
}

func main() {
	// Gunakan DSN untuk koneksi ke MySQL
	dsn := "root:@tcp(localhost:3306)/monitoring_db" // Ganti dengan kredensial yang sesuai

	var err error
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("DB open error: %v", err)
	}
	defer db.Close()

	// Verifikasi koneksi
	if err = db.Ping(); err != nil {
		log.Fatalf("DB ping error: %v", err)
	}

	// Membuat tabel db_sizes jika belum ada
	if _, err := db.Exec(`
		CREATE TABLE IF NOT EXISTS db_sizes (
			id INT AUTO_INCREMENT PRIMARY KEY,
			date DATE NOT NULL,
			filename VARCHAR(255) NOT NULL,
			size_kb BIGINT NOT NULL
		);
	`); err != nil {
		log.Fatalf("Create table error: %v", err)
	}

	// Menjalankan cron job untuk sinkronisasi dan pemberitahuan setiap hari jam 08:00
	c := cron.New()
	c.AddFunc("0 8 * * *", func() {
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

	// Menyiapkan route untuk fetch data secara manual
	mux := http.NewServeMux()
	mux.HandleFunc("/db-sizes", getDBSizes) // Endpoint untuk mengambil ukuran database
	mux.HandleFunc("/alerts", getAlerts)    // Endpoint untuk mengambil alert penurunan ukuran

	// Menambahkan CORS untuk frontend
	handler := cors.New(cors.Options{
		AllowedOrigins: []string{"http://localhost:3000"},
	}).Handler(mux)

	log.Println("🚀 Server running on port 8080")
	log.Fatal(http.ListenAndServe(":8080", handler))
}

// syncFileDataToDB membaca semua file .sql dan memasukkannya ke dalam tabel db_sizes
func syncFileDataToDB(folder string) error {
	// Truncate data yang ada di db_sizes
	if _, err := db.Exec("TRUNCATE TABLE db_sizes"); err != nil {
		return err
	}

	// Walk melalui folder sql_files dan insert data file ke db_sizes
	err := filepath.Walk(folder, func(path string, info os.FileInfo, err error) error {
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
	return err
}

// checkAndNotify memeriksa penurunan ukuran dan mengirimkan email jika ada
func checkAndNotify() error {
	today := time.Now().Format("2006-01-02")
	rows, err := db.Query(`
		SELECT c.filename, c.size_kb, MAX(p.size_kb)
		FROM db_sizes c
		LEFT JOIN db_sizes p
			ON c.filename = p.filename
			AND c.date = p.date
		WHERE c.date = ?
		GROUP BY c.filename
		HAVING c.size_kb < MAX(p.size_kb)
	`, today)
	if err != nil {
		return err
	}
	defer rows.Close()

	var alerts []struct {
		File      string
		Prev, Cur int64
	}
	for rows.Next() {
		var f string
		var prev, cur int64
		if err := rows.Scan(&f, &cur, &prev); err != nil {
			return err
		}
		alerts = append(alerts, struct {
			File      string
			Prev, Cur int64
		}{f, prev, cur})
	}
	if len(alerts) == 0 {
		log.Println("No size decreases today.")
		return nil
	}

	// Menyiapkan body email
	body := "Subject: [ALERT] Database size decreased\n\n"
	for _, a := range alerts {
		body += fmt.Sprintf(
			"• %s: %d KB → %d KB\n", a.File, a.Prev, a.Cur,
		)
	}

	// Kirim email
	return sendGmail(body)
}

// sendGmail mengirim email pemberitahuan menggunakan Gmail SMTP
func sendGmail(body string) error {
	from := os.Getenv("monitoringdataa@gmail.com")
	pass := os.Getenv("monitoringdata1.")
	to := os.Getenv("naufalaryaputra1210@gmail.com")
	auth := smtp.PlainAuth("", from, pass, "smtp.gmail.com")

	addr := "smtp.gmail.com:587"
	msg := []byte(body)
	log.Printf("Sending alert to %s\n", to)
	return smtp.SendMail(addr, auth, from, []string{to}, msg)
}

// getDBSizes mengembalikan data ukuran file database sebagai JSON
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

// getAlerts mengembalikan daftar notifikasi alert penurunan ukuran database sebagai JSON
func getAlerts(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query(`
		SELECT c.filename, c.size_kb, MAX(p.size_kb)
		FROM db_sizes c
		LEFT JOIN db_sizes p
			ON c.filename = p.filename
			AND c.date = p.date
		WHERE c.date = ?
		GROUP BY c.filename
		HAVING c.size_kb < MAX(p.size_kb)
	`, time.Now().Format("2006-01-02"))
	if err != nil {
		http.Error(w, err.Error(), 500)
		return
	}
	defer rows.Close()

	var alerts []struct {
		Filename string
		Prev     int64
		Cur      int64
	}
	for rows.Next() {
		var f string
		var p, c int64
		if err := rows.Scan(&f, &p, &c); err != nil {
			http.Error(w, err.Error(), 500)
			return
		}
		alerts = append(alerts, struct {
			Filename string
			Prev     int64
			Cur      int64
		}{f, p, c})
	}

	if len(alerts) == 0 {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]interface{}{})
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(alerts)
}
