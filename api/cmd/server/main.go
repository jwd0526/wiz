package main

import (
	"fmt"
	"log"
	"net/http"
	
	"zipper-backend/handlers"
)

func main() {
	http.HandleFunc("/api/generate", handlers.GenerateGame)
	http.HandleFunc("/generate-game", handlers.GenerateGame) // Legacy endpoint
	
	fmt.Println("🚀 Local development server starting on :8000")
	fmt.Println("📡 API endpoints:")
	fmt.Println("   • http://localhost:8000/api/generate")
	fmt.Println("   • http://localhost:8000/generate-game")
	
	log.Fatal(http.ListenAndServe(":8000", nil))
}