package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"path/filepath"

	_ "github.com/go-sql-driver/mysql" // MySQL driver
	"github.com/rs/cors"               // Untuk menangani CORS
)

// FileData merepresentasikan struktur data untuk masing-masing file dummy (database)
type FileData struct {
	ID       int    `json:"id"`       // ID auto-increment
	Date     string `json:"date"`     // Tanggal modifikasi file (YYYY-MM-DD)
	Filename string `json:"filename"` // Nama file (misal: database1.sql)
	SizeKB   int64  `json:"sizeKB"`   // Ukuran file dalam kilobyte
}

var db *sql.DB

// createTable membuat tabel db_sizes jika belum ada
func createTable() error {
	query := `
        CREATE TABLE IF NOT EXISTS db_sizes (
            id INT AUTO_INCREMENT PRIMARY KEY,
            date DATE NOT NULL,
            filename VARCHAR(255) NOT NULL,
            size_kb BIGINT NOT NULL
        );
    `
	_, err := db.Exec(query)
	return err
}

// syncFileDataToDB membaca semua file .sql dalam folder sql_files dan menyimpannya ke tabel db_sizes
func syncFileDataToDB(folder string) error {
	// Hapus dulu data lama (optional, tergantung kebutuhan)
	_, err := db.Exec("TRUNCATE TABLE db_sizes;")
	if err != nil {
		return err
	}

	// Traverse folder untuk mencari file .sql
	err = filepath.Walk(folder, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		// Lewati folder
		if info.IsDir() {
			return nil
		}
		// Hanya proses file dengan extension .sql
		if filepath.Ext(info.Name()) != ".sql" {
			return nil
		}

		// Ambil tanggal modifikasi dan konversi ukuran ke KB
		modDate := info.ModTime().Format("2006-01-02")
		sizeKB := info.Size() / 1024

		// Masukkan data ke tabel db_sizes
		_, err = db.Exec("INSERT INTO db_sizes (date, filename, size_kb) VALUES (?, ?, ?)",
			modDate, info.Name(), sizeKB)
		if err != nil {
			return err
		}
		return nil
	})
	return err
}

// getDBSizes mengambil data dari tabel db_sizes dan mengembalikannya sebagai JSON
func getDBSizes(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	rows, err := db.Query("SELECT id, date, filename, size_kb FROM db_sizes")
	if err != nil {
		http.Error(w, fmt.Sprintf("Query error: %v", err), http.StatusInternalServerError)
		return
	}
	defer rows.Close()

	var results []FileData
	for rows.Next() {
		var file FileData
		if err := rows.Scan(&file.ID, &file.Date, &file.Filename, &file.SizeKB); err != nil {
			http.Error(w, fmt.Sprintf("Scan error: %v", err), http.StatusInternalServerError)
			return
		}
		results = append(results, file)
	}

	if err = rows.Err(); err != nil {
		http.Error(w, fmt.Sprintf("Rows error: %v", err), http.StatusInternalServerError)
		return
	}

	json.NewEncoder(w).Encode(results)
}

func main() {
	var err error

	// Buka koneksi ke MySQL dengan database monitoring_db
	// Sesuaikan username, password, dan host sesuai dengan konfigurasi MySQL kamu
	dsn := "root:@tcp(localhost:3306)/monitoring_db"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("Error opening database: %v", err)
	}
	defer db.Close()

	// Cek koneksi
	if err = db.Ping(); err != nil {
		log.Fatalf("Error connecting to database: %v", err)
	}

	// Buat tabel db_sizes jika belum ada
	if err = createTable(); err != nil {
		log.Fatalf("Error creating table: %v", err)
	}

	// Sinkronisasi data dummy dari folder sql_files ke tabel monitoring_db
	folder := "./sql_files"
	if err = syncFileDataToDB(folder); err != nil {
		log.Fatalf("Error syncing file data: %v", err)
	} else {
		log.Printf("Successfully synced file data from folder %s", folder)
	}

	// Daftarkan endpoint untuk mengambil data ukuran file
	mux := http.NewServeMux()
	mux.HandleFunc("/db-sizes", getDBSizes)

	// Atur CORS agar frontend (misal, http://localhost:3000) bisa mengakses
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}).Handler(mux)

	fmt.Println("Server running on port 8080...")
	log.Fatal(http.ListenAndServe(":8080", handler))
}
