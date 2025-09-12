# WIZ - Path Puzzle Game

Path finding puzzle game based on hamiltonian path logic.

## Overview

- **Sequential Path Solving**: Connect numbered nodes in order (1 -> 2 -> 3 -> 4...)
- **'Infinite' Difficulty**: Increasing in difficulty each level, scales infinitely
- **Keyboard & Mouse Support**: Play with arrow keys or mouse/touch
- **Responsive Design**: Works best on a laptop/desktop

## Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for build tooling
- **CSS3** with smooth transitions and animations
- Grid-based game board

### Backend
- **Go** with net/http
- Hamiltonian path generation algorithm
- Wall placement with collision detection
- RESTful API design

### Level Progression System
- Levels 1-4: 5×5 grid, increasing nodes, no walls
- Level 5: Introduction of walls (5×5, 2 nodes, 2 walls)
- Levels 6-15: 6×6 grid with random walls
- Levels 16-30: 7×7 grid with scaling complexity
- Levels 31+: Dynamic sizing up to 20×20

## Development

### Prereqs
- Node.js 18+
- Go 1.19+

### Setup
```bash
# Clone repository
git clone github.com/jwd0526/wiz
cd wiz

# Install frontend dependencies
cd frontend
npm install

# Start development servers
npm run dev          # Frontend (http://localhost:5173)
cd ../backend
go run main.go       # Backend (http://localhost:8000)
```

### Build
```bash
# Build frontend
cd frontend
npm run build

# Build backend
cd ../backend
go build -o game-server main.go
```

## Features

### Technical Feature Highlights
- **Hamiltonian Path Algorithm**: Ensures every puzzle has a valid solution
- **Wall Placement**: Wall generation doesn't block solutions
- **Visual Design**: Walls rendered as positioned elements
- **Combination Logic**: Adjacent walls merge automatically

## Visual Feature Highlights
- **Smooth Transitions**: CSS transitions for all state changes  
- **Game Node Styling**: Distinct visual treatment for numbered nodes
- **Path Highlighting**: Clear visual feedback for current path
- **Completion Animations**: Satisfying end-of-level effects


## Game Progression

In theory, each level should be harder on average:
- **Early Levels**: Learn basic mechanics
- **Mid Levels**: Introduction of walls and larger grids
- **Advanced Levels**: Complex wall patterns and maximum grid sizes
- **Endless Challenge**: Procedurally generated complexity scaling
