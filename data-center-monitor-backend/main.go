package main

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"path/filepath"

	"github.com/rs/cors"
)

type FileData struct {
	Date     string `json:"date"`
	SizeKB   int64  `json:"sizeKB"`
	Filename string `json:"filename"`
}

func getFileSizes(w http.ResponseWriter, r *http.Request) {
	directory := "./sql_files" // Direktori file-file SQL
	var filesData []FileData

	err := filepath.Walk(directory, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if !info.IsDir() {
			// Simulasikan tanggal file dengan tanggal modifikasi file
			modTime := info.ModTime().Format("2006-01-02")

			filesData = append(filesData, FileData{
				Date:     modTime,
				SizeKB:   info.Size() / 1024, // Konversi ke KB
				Filename: info.Name(),
			})
		}
		return nil
	})

	if err != nil {
		http.Error(w, "Error reading files", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(filesData)
}

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("/file-size", getFileSizes)

	// Tambahkan middleware CORS
	handler := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:3000"}, // Izinkan frontend
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type"},
		AllowCredentials: true,
	}).Handler(mux)

	fmt.Println("Server running on port 8080...")
	http.ListenAndServe(":8080", handler)
}
