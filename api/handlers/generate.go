package handler

import (
	"encoding/json"
	"log"
	"net/http"
	"errors"
	"fmt"
	"math"
	"math/rand"
)

type Config struct {
	Size  int
	Nodes int
	Walls int
	Prob  float32
}

type Wall struct {
	X1 int `json:"x1"`
	Y1 int `json:"y1"`
	X2 int `json:"x2"`
	Y2 int `json:"y2"`
	Horizontal bool `json:"horizontal"`
}

type Node struct {
	X        int  `json:"x"`
	Y        int  `json:"y"`
	GameNode bool `json:"gameNode"`
	GamePos  int  `json:"gamePos"`
}

type Game struct {
	Board [][]Node `json:"board"`
	Path  []Node   `json:"path"`
	Walls []Wall   `json:"walls"`
}

type GenerateRequest struct {
	Size  int `json:"size"`
	Nodes int `json:"nodes"`
	Walls int `json:"walls"`
}

func GetGameConfig(req GenerateRequest) (Config, error) {
	if req.Size < 5 || req.Size > 20 {
		return Config{}, errors.New("size must be between 5 and 20, inclusive")
	}
	if req.Nodes < 1 {
		return Config{}, errors.New("nodes must be at least 1")
	}
	if req.Walls < 0 {
		return Config{}, errors.New("walls cannot be negative")
	}

	return Config{
		Size:  req.Size,
		Nodes: req.Nodes,
		Walls: req.Walls,
		Prob:  0.04 * float32(req.Size),
	}, nil
}

func Generate(config Config) (Game, error) {
	board := initBoard(config)

	attempts := 0
	var path []Node
	for attempts < 3 {
		path = findHamiltonian(board)
		if path == nil {
			attempts++
		} else {
			break
		}
	}

	if path == nil {
		return Game{}, errors.New("unable to generate valid path in 3 attempts")
	}

	preGame := Game{
		Board: board,
		Path:  path,
	}

	game := placeNodesAndWalls(preGame, config)
	return game, nil
}

func initBoard(c Config) [][]Node {
	s := c.Size
	board := make([][]Node, s)
	for i := range board {
		board[i] = make([]Node, s)
	}

	for i := 0; i < c.Size; i++ {
		for j := 0; j < c.Size; j++ {
			if !board[i][j].GameNode {
				board[i][j] = Node{
					X: j,
					Y: i,
					GameNode: false,
					GamePos: -1,
				}
			} 
		}
	}

	return board
}

func findHamiltonian(board [][]Node) []Node {
	n := len(board)
	maxAttempts := 100
	
	for attempt := 0; attempt < maxAttempts; attempt++ {
		startNode := Node{
			X: rand.Intn(n),
			Y: rand.Intn(n),
			GameNode: false,
		}

		visited := make([][]bool, n)
		for i := range visited {
			visited[i] = make([]bool, n)
		}

		path := make([]Node, 0, n*n)
		dirs := [][2]int{{0,1}, {1,0}, {0,-1}, {-1,0}}
		steps := 0
		maxSteps := n * n * 10

		var backtrack func(x, y int) bool
		backtrack = func(x, y int) bool {
			steps++
			if steps > maxSteps {
				return false
			}
			
			visited[y][x] = true
			path = append(path, board[y][x])

			if len(path) == n*n {
				return true
			}

			neighbors := make([][3]int, 0, 4)
			for _, dir := range dirs {
				newX, newY := x+dir[0], y+dir[1]
				if newX >= 0 && newX < n && newY >= 0 && newY < n && !visited[newY][newX] {
					count := 0
					for _, dir2 := range dirs {
						nx, ny := newX+dir2[0], newY+dir2[1]
						if nx >= 0 && nx < n && ny >= 0 && ny < n && !visited[ny][nx] {
							count++
						}
					}
					neighbors = append(neighbors, [3]int{newX, newY, count})
				}
			}

			for i := 1; i < len(neighbors); i++ {
				key := neighbors[i]
				j := i - 1
				for j >= 0 && (neighbors[j][2] > key[2] || 
					(neighbors[j][2] == key[2] && rand.Intn(2) == 0)) {
					neighbors[j+1] = neighbors[j]
					j--
				}
				neighbors[j+1] = key
			}

			for _, neighbor := range neighbors {
				if backtrack(neighbor[0], neighbor[1]) {
					return true
				}
			}
			
			visited[y][x] = false
			path = path[:len(path)-1]
			return false
		}

		if backtrack(startNode.X, startNode.Y) {
			return path
		}
	}
	return nil
}

func placeNodesAndWalls(g Game, c Config) Game {
	board := g.Board
	path := g.Path
	pathLen := len(path)

	firstPathIndex := 0
	board[path[firstPathIndex].Y][path[firstPathIndex].X].GameNode = true
	board[path[firstPathIndex].Y][path[firstPathIndex].X].GamePos = 1

	lastPathIndex := pathLen - 1
	board[path[lastPathIndex].Y][path[lastPathIndex].X].GameNode = true
	board[path[lastPathIndex].Y][path[lastPathIndex].X].GamePos = c.Nodes + 1

	if c.Nodes > 1 {
		availableLength := pathLen - 2
		if availableLength > 0 {
			segmentSize := availableLength / (c.Nodes - 1)
			if segmentSize == 0 {
				segmentSize = 1
			}

			for nodeIndex := 1; nodeIndex < c.Nodes; nodeIndex++ {
				offset := 0
				if segmentSize > 1 {
					offset = rand.Intn(segmentSize/2 + 1)
				}
				pathIndex := 1 + (nodeIndex-1)*segmentSize + offset

				if pathIndex >= lastPathIndex {
					pathIndex = lastPathIndex - 1
				}
				if pathIndex <= firstPathIndex {
					pathIndex = firstPathIndex + 1
				}

				board[path[pathIndex].Y][path[pathIndex].X].GameNode = true
				board[path[pathIndex].Y][path[pathIndex].X].GamePos = nodeIndex + 1
			}
		}
	}

	walls := placeWalls(board, path, c.Walls)
	return Game{board, path, walls}
}

func placeWalls(board [][]Node, path []Node, numWalls int) []Wall {
	if numWalls <= 0 {
		return []Wall{}
	}
	
	size := len(board)
	walls := make([]Wall, 0, numWalls)
	pathSet := make(map[string]bool)
	
	for _, node := range path {
		pathSet[fmt.Sprintf("%d,%d", node.X, node.Y)] = true
	}
	
	wouldBlockPath := func(wall Wall) bool {
		for i := 0; i < len(path)-1; i++ {
			curr := path[i]
			next := path[i+1]
			
			if wall.Horizontal {
				if curr.X == next.X && curr.X >= wall.X1 && curr.X <= wall.X2 {
					minY := curr.Y
					maxY := next.Y
					if minY > maxY {
						minY, maxY = maxY, minY
					}
					if minY <= wall.Y1 && maxY >= wall.Y1+1 {
						return true
					}
				}
			} else {
				if curr.Y == next.Y && curr.Y >= wall.Y1 && curr.Y <= wall.Y2 {
					minX := curr.X
					maxX := next.X
					if minX > maxX {
						minX, maxX = maxX, minX
					}
					if minX <= wall.X1 && maxX >= wall.X1+1 {
						return true
					}
				}
			}
		}
		return false
	}
	
	attempts := 0
	maxAttempts := numWalls * 50
	
	for len(walls) < numWalls && attempts < maxAttempts {
		attempts++
		
		x := rand.Intn(size)
		y := rand.Intn(size)
		
		orientations := []bool{true, false}
		rand.Shuffle(len(orientations), func(i, j int) {
			orientations[i], orientations[j] = orientations[j], orientations[i]
		})
		
		for _, horizontal := range orientations {
			var wall Wall
			
			if horizontal {
				if y >= size-1 {
					continue
				}
				
				maxLength := 1
				for length := 2; x+length-1 < size; length++ {
					testWall := Wall{X1: x, Y1: y, X2: x + length - 1, Y2: y, Horizontal: true}
					if wouldBlockPath(testWall) {
						break
					}
					maxLength = length
				}
				
				length := 1
				if maxLength > 1 {
					biasedRand := math.Pow(rand.Float64(), 0.5)
					length = int(biasedRand*float64(maxLength-1)) + 1
					if length < 1 {
						length = 1
					}
					if length > maxLength {
						length = maxLength
					}
				}
				wall = Wall{X1: x, Y1: y, X2: x + length - 1, Y2: y, Horizontal: true}
			} else {
				if x >= size-1 {
					continue
				}
				
				maxLength := 1
				for length := 2; y+length-1 < size; length++ {
					testWall := Wall{X1: x, Y1: y, X2: x, Y2: y + length - 1, Horizontal: false}
					if wouldBlockPath(testWall) {
						break
					}
					maxLength = length
				}
				
				length := 1
				if maxLength > 1 {
					biasedRand := math.Pow(rand.Float64(), 0.5)
					length = int(biasedRand*float64(maxLength-1)) + 1
					if length < 1 {
						length = 1
					}
					if length > maxLength {
						length = maxLength
					}
				}
				wall = Wall{X1: x, Y1: y, X2: x, Y2: y + length - 1, Horizontal: false}
			}
			
			if !wouldBlockPath(wall) {
				overlap := false
				for _, existingWall := range walls {
					if wallsOverlap(wall, existingWall) {
						overlap = true
						break
					}
				}
				
				if !overlap {
					walls = append(walls, wall)
					break
				}
			}
		}
	}
	
	return combineAdjacentWalls(walls)
}

func wallsOverlap(w1, w2 Wall) bool {
	if w1.Horizontal && w2.Horizontal {
		return w1.Y1 == w2.Y1 && !(w1.X2 < w2.X1 || w2.X2 < w1.X1)
	} else if !w1.Horizontal && !w2.Horizontal {
		return w1.X1 == w2.X1 && !(w1.Y2 < w2.Y1 || w2.Y2 < w1.Y1)
	}
	return false
}

func canCombineWalls(w1, w2 Wall) bool {
	if w1.Horizontal && w2.Horizontal && w1.Y1 == w2.Y1 {
		return !(w1.X2 < w2.X1-1 || w2.X2 < w1.X1-1)
	} else if !w1.Horizontal && !w2.Horizontal && w1.X1 == w2.X1 {
		return !(w1.Y2 < w2.Y1-1 || w2.Y2 < w1.Y1-1)
	}
	return false
}

func combineWalls(w1, w2 Wall) Wall {
	if w1.Horizontal && w2.Horizontal {
		return Wall{
			X1: min(w1.X1, w2.X1),
			Y1: w1.Y1,
			X2: max(w1.X2, w2.X2),
			Y2: w1.Y1,
			Horizontal: true,
		}
	} else {
		return Wall{
			X1: w1.X1,
			Y1: min(w1.Y1, w2.Y1),
			X2: w1.X1,
			Y2: max(w1.Y2, w2.Y2),
			Horizontal: false,
		}
	}
}

func combineAdjacentWalls(walls []Wall) []Wall {
	if len(walls) <= 1 {
		return walls
	}
	
	combined := make([]Wall, 0, len(walls))
	used := make([]bool, len(walls))
	
	for i := 0; i < len(walls); i++ {
		if used[i] {
			continue
		}
		
		currentWall := walls[i]
		
		for j := i + 1; j < len(walls); j++ {
			if used[j] {
				continue
			}
			
			if canCombineWalls(currentWall, walls[j]) {
				currentWall = combineWalls(currentWall, walls[j])
				used[j] = true
			}
		}
		
		combined = append(combined, currentWall)
		used[i] = true
	}
	
	if len(combined) < len(walls) {
		return combineAdjacentWalls(combined)
	}
	
	return combined
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	if a > b {
		return a
	}
	return b
}

func EnableCORS(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE")
	w.Header().Set("Access-Control-Allow-Headers", "Accept, Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization")
}

func generateGame(w http.ResponseWriter, r *http.Request) {
	EnableCORS(w)
	
	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}
	
	var request GenerateRequest
	err := json.NewDecoder(r.Body).Decode(&request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	config, err := GetGameConfig(request)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	gameResult, err := Generate(config)
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	err = json.NewEncoder(w).Encode(gameResult)
	if err != nil {
		log.Printf("Error encoding response: %v", err)
	}
}

func Handler(w http.ResponseWriter, r *http.Request) {
	generateGame(w, r)
}