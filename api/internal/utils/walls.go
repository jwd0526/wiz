package utils

import (
	"api/internal/types"
	"math"
	"math/rand"
)

func PlaceWalls(board [][]types.Node, path []types.Node, numWalls int) []types.Wall {
	if numWalls <= 0 {
		return []types.Wall{}
	}

	size := len(board)
	walls := make([]types.Wall, 0, numWalls)

	wouldBlockPath := func(wall types.Wall) bool {
		return checkWallBlocksPath(wall, path)
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
			wall := generateWall(x, y, horizontal, size, wouldBlockPath)

			if wall != nil && !wouldBlockPath(*wall) {
				if !hasOverlap(*wall, walls) {
					walls = append(walls, *wall)
					break
				}
			}
		}
	}

	return combineAdjacentWalls(walls)
}


func checkWallBlocksPath(wall types.Wall, path []types.Node) bool {
	for i := 0; i < len(path)-1; i++ {
		curr := path[i]
		next := path[i+1]

		if wall.Horizontal {
			if curr.X == next.X && curr.X >= wall.X1 && curr.X <= wall.X2 {
				minY := min(curr.Y, next.Y)
				maxY := max(curr.Y, next.Y)
				if minY <= wall.Y1 && maxY >= wall.Y1+1 {
					return true
				}
			}
		} else {
			if curr.Y == next.Y && curr.Y >= wall.Y1 && curr.Y <= wall.Y2 {
				minX := min(curr.X, next.X)
				maxX := max(curr.X, next.X)
				if minX <= wall.X1 && maxX >= wall.X1+1 {
					return true
				}
			}
		}
	}
	return false
}

func generateWall(x, y int, horizontal bool, size int, wouldBlockPath func(types.Wall) bool) *types.Wall {
	if horizontal {
		if y >= size-1 {
			return nil
		}

		maxLength := calculateMaxLength(x, y, horizontal, size, wouldBlockPath)
		length := calculateWallLength(maxLength)

		return &types.Wall{
			X1:         x,
			Y1:         y,
			X2:         x + length - 1,
			Y2:         y,
			Horizontal: true,
		}
	} else {
		if x >= size-1 {
			return nil
		}

		maxLength := calculateMaxLength(x, y, horizontal, size, wouldBlockPath)
		length := calculateWallLength(maxLength)

		return &types.Wall{
			X1:         x,
			Y1:         y,
			X2:         x,
			Y2:         y + length - 1,
			Horizontal: false,
		}
	}
}

func calculateMaxLength(x, y int, horizontal bool, size int, wouldBlockPath func(types.Wall) bool) int {
	maxLength := 1
	if horizontal {
		for length := 2; x+length-1 < size; length++ {
			testWall := types.Wall{X1: x, Y1: y, X2: x + length - 1, Y2: y, Horizontal: true}
			if wouldBlockPath(testWall) {
				break
			}
			maxLength = length
		}
	} else {
		for length := 2; y+length-1 < size; length++ {
			testWall := types.Wall{X1: x, Y1: y, X2: x, Y2: y + length - 1, Horizontal: false}
			if wouldBlockPath(testWall) {
				break
			}
			maxLength = length
		}
	}
	return maxLength
}

func calculateWallLength(maxLength int) int {
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
	return length
}

func hasOverlap(wall types.Wall, walls []types.Wall) bool {
	for _, existingWall := range walls {
		if wallsOverlap(wall, existingWall) {
			return true
		}
	}
	return false
}

func wallsOverlap(w1, w2 types.Wall) bool {
	if w1.Horizontal && w2.Horizontal {
		return w1.Y1 == w2.Y1 && !(w1.X2 < w2.X1 || w2.X2 < w1.X1)
	} else if !w1.Horizontal && !w2.Horizontal {
		return w1.X1 == w2.X1 && !(w1.Y2 < w2.Y1 || w2.Y2 < w1.Y1)
	}
	return false
}

func canCombineWalls(w1, w2 types.Wall) bool {
	if w1.Horizontal && w2.Horizontal && w1.Y1 == w2.Y1 {
		return !(w1.X2 < w2.X1-1 || w2.X2 < w1.X1-1)
	} else if !w1.Horizontal && !w2.Horizontal && w1.X1 == w2.X1 {
		return !(w1.Y2 < w2.Y1-1 || w2.Y2 < w1.Y1-1)
	}
	return false
}

func combineWalls(w1, w2 types.Wall) types.Wall {
	if w1.Horizontal && w2.Horizontal {
		return types.Wall{
			X1:         min(w1.X1, w2.X1),
			Y1:         w1.Y1,
			X2:         max(w1.X2, w2.X2),
			Y2:         w1.Y1,
			Horizontal: true,
		}
	} else {
		return types.Wall{
			X1:         w1.X1,
			Y1:         min(w1.Y1, w2.Y1),
			X2:         w1.X1,
			Y2:         max(w1.Y2, w2.Y2),
			Horizontal: false,
		}
	}
}

func combineAdjacentWalls(walls []types.Wall) []types.Wall {
	if len(walls) <= 1 {
		return walls
	}

	combined := make([]types.Wall, 0, len(walls))
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