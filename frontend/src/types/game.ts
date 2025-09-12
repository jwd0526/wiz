export interface Node {
  x: number;
  y: number;
  gameNode: boolean;
  gamePos: number;
}

export interface Wall {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  horizontal: boolean;
}

export interface Game {
  board: Node[][];
  path: Node[];
  walls: Wall[];
}


export interface GameState {
  currentPath: string[];
  isDrawing: boolean;
}