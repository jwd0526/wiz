package generator

import (
	"api/internal/types"
	"api/internal/utils"
	"errors"
	"math/rand"
)

func NewConfig(req types.GenerateRequest) (types.Config, error) {
	if req.Size < 5 || req.Size > 20 {
		return types.Config{}, errors.New("size must be between 5 and 20, inclusive")
	}
	if req.Nodes < 1 {
		return types.Config{}, errors.New("nodes must be at least 1")
	}
	if req.Walls < 0 {
		return types.Config{}, errors.New("walls cannot be negative")
	}

	return types.Config{
		Size:  req.Size,
		Nodes: req.Nodes,
		Walls: req.Walls,
		Prob:  0.04 * float32(req.Size),
	}, nil
}

func GenerateGame(config types.Config) (types.Game, error) {
	board := initBoard(config)

	attempts := 0
	var path []types.Node
	for attempts < 3 {
		path = findHamiltonian(board)
		if path == nil {
			attempts++
		} else {
			break
		}
	}

	if path == nil {
		return types.Game{}, errors.New("unable to generate valid path in 3 attempts")
	}

	preGame := types.Game{
		Board: board,
		Path:  path,
	}

	game := placeGameNodes(preGame, config)
	game.Walls = utils.PlaceWalls(game.Board, game.Path, config.Walls)

	return game, nil
}

func initBoard(c types.Config) [][]types.Node {
	s := c.Size
	board := make([][]types.Node, s)
	for i := range board {
		board[i] = make([]types.Node, s)
	}

	for i := 0; i < c.Size; i++ {
		for j := 0; j < c.Size; j++ {
			board[i][j] = types.Node{
				X:        j,
				Y:        i,
				GameNode: false,
				GamePos:  -1,
			}
		}
	}

	return board
}

func findHamiltonian(board [][]types.Node) []types.Node {
	n := len(board)
	maxAttempts := 100

	for attempt := 0; attempt < maxAttempts; attempt++ {
		startNode := types.Node{
			X:        rand.Intn(n),
			Y:        rand.Intn(n),
			GameNode: false,
		}

		visited := make([][]bool, n)
		for i := range visited {
			visited[i] = make([]bool, n)
		}

		path := make([]types.Node, 0, n*n)
		dirs := [][2]int{{0, 1}, {1, 0}, {0, -1}, {-1, 0}}
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

			// Sort neighbors by connectivity (fewer connections first)
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

func placeGameNodes(g types.Game, c types.Config) types.Game {
	board := g.Board
	path := g.Path
	pathLen := len(path)

	// Place first node
	firstPathIndex := 0
	board[path[firstPathIndex].Y][path[firstPathIndex].X].GameNode = true
	board[path[firstPathIndex].Y][path[firstPathIndex].X].GamePos = 1

	// Place last node
	lastPathIndex := pathLen - 1
	board[path[lastPathIndex].Y][path[lastPathIndex].X].GameNode = true
	board[path[lastPathIndex].Y][path[lastPathIndex].X].GamePos = c.Nodes + 1

	// Place intermediate nodes
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

	return types.Game{Board: board, Path: path, Walls: g.Walls}
}