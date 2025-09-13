#!/bin/bash

echo "🎮 Starting WIZ development environment..."
echo ""

# Start the Go API server
echo "📡 Starting API server on port 8000..."
cd api && go run cmd/server/main.go &
API_PID=$!

# Wait a moment for the API to start
sleep 2

# Start the frontend development server
echo "🎨 Starting frontend dev server on port 3000..."
cd frontend && npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ Development servers started!"
echo "🎮 Game: http://localhost:3000"
echo "📡 API:  http://localhost:8000/api/generate"
echo ""
echo "Press Ctrl+C to stop both servers"

# Function to cleanup when script exits
cleanup() {
    echo ""
    echo "🛑 Shutting down development servers..."
    kill $API_PID $FRONTEND_PID 2>/dev/null
    echo "✅ Cleanup complete"
    exit 0
}

# Set trap to cleanup on script termination
trap cleanup SIGINT SIGTERM

# Wait for background processes
wait