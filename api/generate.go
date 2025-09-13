package handler

import (
	"net/http"
	
	"zipper-backend/handlers"
)

// Handler is the Vercel function entry point
func Handler(w http.ResponseWriter, r *http.Request) {
	handlers.GenerateGame(w, r)
}