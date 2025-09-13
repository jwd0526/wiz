package types

type Config struct {
	Size  int
	Nodes int
	Walls int
	Prob  float32
}

type Wall struct {
	X1         int  `json:"x1"`
	Y1         int  `json:"y1"`
	X2         int  `json:"x2"`
	Y2         int  `json:"y2"`
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