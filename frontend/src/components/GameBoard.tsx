import React, { useState, useCallback, useRef, useEffect } from 'react';
import classNames from 'classnames';
import type { Game, GameState } from '../types/game';
import './GameBoard.css';
import '../Theme.css';

interface GameBoardProps {
  game: Game | null;
  onGameComplete?: () => void;
  onPathChange?: (isValid: boolean, pathLength: number) => void;
  onNextLevel?: () => void;
  onAnimationStatusChange?: (greenAnimationComplete: boolean) => void;
  isTransitioningOut?: boolean;
  gameStatus: {
    isValid: boolean;
    pathLength: number;
    isComplete: boolean;
  }
}

const GameBoard: React.FC<GameBoardProps> = ({ game, onGameComplete, onPathChange, onNextLevel, onAnimationStatusChange, isTransitioningOut, gameStatus }) => {
  const [gameState, setGameState] = useState<GameState>({
    currentPath: [],
    isDrawing: false
  });
  
  
  const [solutionAnimation, setSolutionAnimation] = useState<{
    animatingCells: string[];
    currentIndex: number;
    showGreenPhase: boolean;
    greenAnimationComplete: boolean;
  }>({
    animatingCells: [],
    currentIndex: -1,
    showGreenPhase: false,
    greenAnimationComplete: false
  });
  
  const [boardRevealAnimation, setBoardRevealAnimation] = useState<{
    showCompleteClasses: boolean;
  }>({
    showCompleteClasses: false
  });
  
  const boardRef = useRef<HTMLDivElement>(null);
  
  const [windowSize, setWindowSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  
  React.useEffect(() => {
    const handleResize = () => {
      setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const calculateDimensions = useCallback((boardSize: number) => {
    const headerHeight = 80;
    const navControlsHeight = windowSize.height * 0.05 + 80;
    const availableHeight = windowSize.height - headerHeight - navControlsHeight;
    const availableWidth = windowSize.width;
    
    const maxAvailableSpace = Math.min(availableHeight * 0.9, availableWidth * 0.9);
    
    const BOARD_PADDING = Math.max(15, Math.min(30, maxAvailableSpace * 0.04));
    const BOARD_GAP = Math.max(2, Math.min(20, maxAvailableSpace * 0.025));
    
    const spaceForCells = maxAvailableSpace - (BOARD_PADDING * 2) - (BOARD_GAP * (boardSize - 1));
    const cellSize = Math.max(20, spaceForCells / boardSize);
    
    const contentSize = (cellSize * boardSize) + (BOARD_GAP * (boardSize - 1));
    
    return {
      contentSize,
      cellSize,
      boardGap: BOARD_GAP,
      boardPadding: BOARD_PADDING
    };
  }, [windowSize]);

  const getCellId = (x: number, y: number): string => `${x},${y}`;
  
  const getCellFromId = (cellId: string): { x: number; y: number } => {
    const [x, y] = cellId.split(',').map(Number);
    return { x, y };
  };

  const isMovementBlockedByWall = useCallback((fromCellId: string, toCellId: string): boolean => {
    if (!game?.walls) return false;
    
    const fromCell = getCellFromId(fromCellId);
    const toCell = getCellFromId(toCellId);
    
    for (const wall of game.walls) {
      if (wall.horizontal) {
        if (fromCell.x === toCell.x &&
            fromCell.x >= wall.x1 && fromCell.x <= wall.x2) {
          const minY = Math.min(fromCell.y, toCell.y);
          const maxY = Math.max(fromCell.y, toCell.y);
          if (minY <= wall.y1 && maxY >= wall.y1 + 1) {
            return true;
          }
        }
      } else {
        if (fromCell.y === toCell.y &&
            fromCell.y >= wall.y1 && fromCell.y <= wall.y2) {
          const minX = Math.min(fromCell.x, toCell.x);
          const maxX = Math.max(fromCell.x, toCell.x);
          if (minX <= wall.x1 && maxX >= wall.x1 + 1) {
            return true;
          }
        }
      }
    }
    
    return false;
  }, [game]);

  const isAdjacent = useCallback((cellId1: string, cellId2: string): boolean => {
    const cell1 = getCellFromId(cellId1);
    const cell2 = getCellFromId(cellId2);
    
    const dx = Math.abs(cell1.x - cell2.x);
    const dy = Math.abs(cell1.y - cell2.y);
    
    return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
  }, []);

  const getNextExpectedNumber = useCallback((path: string[]): number => {
    if (!game || path.length === 0) return 1;

    let expectedNumber = 1;
    for (const cellId of path) {
      const { x, y } = getCellFromId(cellId);
      const node = game.board[y][x];
      if (node.gameNode && node.gamePos === expectedNumber) {
        expectedNumber++;
      }
    }
    return expectedNumber;
  }, [game]);

  const validatePath = useCallback((path: string[]): { isValid: boolean; nextExpected: number } => {
    if (!game || path.length === 0) return { isValid: true, nextExpected: 1 };

    const nextExpected = getNextExpectedNumber(path);
    const maxGameNode = Math.max(...game.board.flat().filter(n => n.gameNode).map(n => n.gamePos));
    const allNumbersConnected = nextExpected > maxGameNode;
    const allCellsFilled = path.length === game.board.length * game.board.length;
    
    const lastCellId = path[path.length - 1];
    const { x: lastX, y: lastY } = getCellFromId(lastCellId);
    const endsOnGameNode = game.board[lastY][lastX].gameNode;
    
    return {
      isValid: allNumbersConnected && allCellsFilled && endsOnGameNode,
      nextExpected
    };
  }, [game, getNextExpectedNumber]);

  const handleMouseDown = useCallback((x: number, y: number) => {
    if (!game) return;
    
    const cellId = getCellId(x, y);
    const node = game.board[y][x];
    
    if (node.gameNode && node.gamePos === 1 && gameState.currentPath.length === 0) {
      setGameState({ currentPath: [cellId], isDrawing: true });
    } 
    else if (gameState.currentPath.length > 0) {
      if (cellId === gameState.currentPath[gameState.currentPath.length - 1]) {
        setGameState(prev => ({ ...prev, isDrawing: true }));
      } else if (gameState.currentPath.includes(cellId)) {
        const cellIndex = gameState.currentPath.indexOf(cellId);
        const newPath = gameState.currentPath.slice(0, cellIndex + 1);
        setGameState({ currentPath: newPath, isDrawing: true });
      }
    }
  }, [gameState.currentPath, game]);

  const handleMouseEnter = useCallback((x: number, y: number) => {
    if (!gameState.isDrawing) return;

    const cellId = getCellId(x, y);
    const currentPath = gameState.currentPath;
    
    if (currentPath.length === 0) return;
    
    const lastCellId = currentPath[currentPath.length - 1];
    
    if (isAdjacent(cellId, lastCellId) && !isMovementBlockedByWall(lastCellId, cellId)) {
      if (currentPath.includes(cellId)) {
        const cellIndex = currentPath.indexOf(cellId);
        if (cellIndex === currentPath.length - 2) {
          const newPath = currentPath.slice(0, cellIndex + 1);
          setGameState(prev => ({ ...prev, currentPath: newPath }));
        }
      }
      else {
        if (!game) return;
        const node = game.board[y][x];
        
        if (node.gameNode) {
          const currentValidation = validatePath(currentPath);
          const expectedNext = currentValidation.nextExpected;
          
          if (node.gamePos !== expectedNext) {
            return;
          }
        }
        
        const newPath = [...currentPath, cellId];
        setGameState(prev => ({ ...prev, currentPath: newPath }));
        
        const validation = validatePath(newPath);
        onPathChange?.(validation.isValid, newPath.length);
        
        if (validation.isValid) {
          onGameComplete?.();
        }
      }
    }
  }, [game, gameState.isDrawing, gameState.currentPath, validatePath, onPathChange, onGameComplete, isAdjacent, isMovementBlockedByWall]);

  const handleMouseUp = useCallback(() => {
    if (!gameState.isDrawing) return;
    
    setGameState(prev => ({ ...prev, isDrawing: false }));
  }, [gameState.isDrawing]);

  // Touch event handlers
  const handleTouchStart = useCallback((e: React.TouchEvent, x: number, y: number) => {
    e.preventDefault();
    handleMouseDown(x, y);
  }, [handleMouseDown]);


  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    handleMouseUp();
  }, [handleMouseUp]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    e.preventDefault();
    if (!gameState.isDrawing) return;

    const touch = e.touches[0];
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect || !game) return;

    const boardSize = game.board.length;
    const dimensions = calculateDimensions(boardSize);
    
    const relativeX = touch.clientX - boardRect.left;
    const relativeY = touch.clientY - boardRect.top;
    
    const cellSpacing = dimensions.cellSize + dimensions.boardGap;
    const x = Math.floor((relativeX - dimensions.boardPadding) / cellSpacing);
    const y = Math.floor((relativeY - dimensions.boardPadding) / cellSpacing);
    
    if (x >= 0 && x < boardSize && y >= 0 && y < boardSize) {
      handleMouseEnter(x, y);
    }
  }, [gameState.isDrawing, game, calculateDimensions, handleMouseEnter]);

  const clearPath = useCallback(() => {
    setGameState({ currentPath: [], isDrawing: false });
    onPathChange?.(false, 0);
  }, [onPathChange]);

  const handleKeyboardMove = useCallback((dx: number, dy: number) => {
    if (!game) return;
    
    if (!gameState.isDrawing || gameState.currentPath.length === 0) {
      for (let y = 0; y < game.board.length; y++) {
        for (let x = 0; x < game.board[y].length; x++) {
          if (game.board[y][x].gameNode && game.board[y][x].gamePos === 1) {
            const cellId = getCellId(x, y);
            setGameState({ currentPath: [cellId], isDrawing: true });
            
            const newX = x + dx;
            const newY = y + dy;
            
                    if (newX < 0 || newX >= game.board.length || newY < 0 || newY >= game.board.length) return;
            
            const newCellId = getCellId(newX, newY);
            
            if (isAdjacent(newCellId, cellId) && !isMovementBlockedByWall(cellId, newCellId)) {
              const targetNode = game.board[newY][newX];
              
                    if (targetNode.gameNode) {
                const currentValidation = validatePath([cellId]);
                const expectedNext = currentValidation.nextExpected;
                
                      if (targetNode.gamePos !== expectedNext) {
                  return;
                }
              }
              
              const newPath = [cellId, newCellId];
              setGameState(prev => ({ ...prev, currentPath: newPath }));
              
                    const validation = validatePath(newPath);
              onPathChange?.(validation.isValid, newPath.length);
              
              if (validation.isValid) {
                onGameComplete?.();
              }
            }
            return;
          }
        }
      }
      return;
    }
    
    const boardSize = game.board.length;
    const lastCellId = gameState.currentPath[gameState.currentPath.length - 1];
    const { x: currentX, y: currentY } = getCellFromId(lastCellId);
    
    const newX = currentX + dx;
    const newY = currentY + dy;
    
    if (newX < 0 || newX >= boardSize || newY < 0 || newY >= boardSize) return;
    
    const newCellId = getCellId(newX, newY);
    
    if (isAdjacent(newCellId, lastCellId) && !isMovementBlockedByWall(lastCellId, newCellId)) {
      if (gameState.currentPath.includes(newCellId)) {
        const cellIndex = gameState.currentPath.indexOf(newCellId);
        if (cellIndex === gameState.currentPath.length - 2) {
          const newPath = gameState.currentPath.slice(0, cellIndex + 1);
          setGameState(prev => ({ ...prev, currentPath: newPath }));
        }
      }
      else {
        const node = game.board[newY][newX];
        
        if (node.gameNode) {
          const currentValidation = validatePath(gameState.currentPath);
          const expectedNext = currentValidation.nextExpected;
          
          if (node.gamePos !== expectedNext) {
            return;
          }
        }
        
        const newPath = [...gameState.currentPath, newCellId];
        setGameState(prev => ({ ...prev, currentPath: newPath }));
        
        const validation = validatePath(newPath);
        onPathChange?.(validation.isValid, newPath.length);
        
        if (validation.isValid) {
          onGameComplete?.();
        }
      }
    }
  }, [game, gameState.isDrawing, gameState.currentPath, isAdjacent, validatePath, onPathChange, onGameComplete, isMovementBlockedByWall]);
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!game) return;
    
    switch (event.key.toLowerCase()) {
      case 'arrowup':
      case 'w':
        event.preventDefault();
        handleKeyboardMove(0, -1);
        break;
      case 'arrowdown':
      case 's':
        event.preventDefault();
        handleKeyboardMove(0, 1);
        break;
      case 'arrowleft':
      case 'a':
        event.preventDefault();
        handleKeyboardMove(-1, 0);
        break;
      case 'arrowright':
      case 'd':
        event.preventDefault();
        handleKeyboardMove(1, 0);
        break;
      case 'enter':
        event.preventDefault();
        if (gameStatus.isComplete && onNextLevel) {
          onNextLevel();
        }
        break;
      case 'backspace':
        event.preventDefault();
        clearPath();
        break;
      case 'escape':
        event.preventDefault();
        clearPath();
        break;
    }
  }, [game, gameStatus, handleKeyboardMove, clearPath, onNextLevel]);
  
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
  
  React.useEffect(() => {
    if (game) {
      setGameState({ currentPath: [], isDrawing: false });
      
      setBoardRevealAnimation({ showCompleteClasses: true });
      
      const timer = setTimeout(() => {
        setBoardRevealAnimation({ showCompleteClasses: false });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [game]);

  React.useEffect(() => {
    if (gameStatus.pathLength === 0 && !gameStatus.isValid && !gameStatus.isComplete) {
      setGameState({ currentPath: [], isDrawing: false });
      setSolutionAnimation({ animatingCells: [], currentIndex: -1, showGreenPhase: false, greenAnimationComplete: false });
    }
  }, [gameStatus]);

  React.useEffect(() => {
    if (gameStatus.isComplete && gameState.currentPath.length > 0) {
      setSolutionAnimation({
        animatingCells: [...gameState.currentPath],
        currentIndex: 0,
        showGreenPhase: false,
        greenAnimationComplete: false
      });
    }
  }, [gameStatus.isComplete, gameState.currentPath]);

  React.useEffect(() => {
    if (solutionAnimation.currentIndex >= 0 && 
        solutionAnimation.currentIndex < solutionAnimation.animatingCells.length) {
      const timer = setTimeout(() => {
        setSolutionAnimation(prev => ({
          ...prev,
          currentIndex: prev.currentIndex + 1
        }));
      }, 30);

      return () => clearTimeout(timer);
    } else if (solutionAnimation.currentIndex >= solutionAnimation.animatingCells.length && 
               solutionAnimation.animatingCells.length > 0 && 
               !solutionAnimation.showGreenPhase) {
      const timer = setTimeout(() => {
        setSolutionAnimation(prev => ({
          ...prev,
          showGreenPhase: true
        }));
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [solutionAnimation.currentIndex, solutionAnimation.animatingCells.length, solutionAnimation.showGreenPhase]);

  React.useEffect(() => {
    if (solutionAnimation.showGreenPhase && !solutionAnimation.greenAnimationComplete) {
      const timer = setTimeout(() => {
        setSolutionAnimation(prev => ({
          ...prev,
          greenAnimationComplete: true
        }));
      }, 500);

      return () => clearTimeout(timer);
    }
  }, [solutionAnimation.showGreenPhase, solutionAnimation.greenAnimationComplete]);

  React.useEffect(() => {
    if (onAnimationStatusChange) {
      onAnimationStatusChange(solutionAnimation.greenAnimationComplete);
    }
  }, [solutionAnimation.greenAnimationComplete, onAnimationStatusChange]);

  if (!game) {
    return (
      <div className="board-placeholder">
        <p>Click "Generate Game" to create a board</p>
      </div>
    );
  }

  const boardSize = game.board.length;
  const dimensions = calculateDimensions(boardSize);

  return (
    <div className="board-container">
      <div 
        ref={boardRef}
        className={classNames('board', {
          'board-complete': boardRevealAnimation.showCompleteClasses || isTransitioningOut,
          'game-transitioning': isTransitioningOut
        })} 
        style={{ 
          gridTemplateColumns: `repeat(${boardSize}, ${dimensions.cellSize}px)`,
          gridTemplateRows: `repeat(${boardSize}, ${dimensions.cellSize}px)`,
          gap: `${dimensions.boardGap}px`,
          padding: `${dimensions.boardPadding}px`,
          position: 'relative'
        }}
        onMouseLeave={handleMouseUp}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {game.board.map((row, y) =>
          row.map((node, x) => {
            const cellId = getCellId(x, y);
            const isTraversed = gameState.currentPath.includes(cellId);
            const fontSize = Math.max(16, Math.min(36, dimensions.cellSize * 0.5));
            
            const traversedIndex = solutionAnimation.animatingCells.indexOf(cellId);
            const shouldAnimateAsGameNode = traversedIndex >= 0 && traversedIndex < solutionAnimation.currentIndex;
            const isAnimating = traversedIndex === solutionAnimation.currentIndex - 1;
            
            const cellClasses = classNames('cell', {
              'cell-complete': boardRevealAnimation.showCompleteClasses || isTransitioningOut,
              'solution-complete': solutionAnimation.showGreenPhase && isTraversed,
              'game-node': (node.gameNode || shouldAnimateAsGameNode) && !(solutionAnimation.showGreenPhase && isTraversed),
              'complete': gameStatus.isComplete,
              'traversed': isTraversed && !shouldAnimateAsGameNode && !solutionAnimation.showGreenPhase,
              'animating': isAnimating
            });
            
            return (
              <div
                key={cellId}
                className={cellClasses}
                onMouseDown={() => handleMouseDown(x, y)}
                onMouseEnter={() => handleMouseEnter(x, y)}
                onTouchStart={(e) => handleTouchStart(e, x, y)}
                style={{ 
                  fontSize: `${fontSize}px`
                }}
              >
                {node.gameNode && <span className="game-node-number">{node.gamePos}</span>}
              </div>
            );
          })
        )}
        
        {game.walls && game.walls.map((wall, index) => {
          const wallThickness = Math.max(3, dimensions.cellSize * 0.08);
          
          if (wall.horizontal) {
            const wallLength = (wall.x2 - wall.x1 + 1) * (dimensions.cellSize + dimensions.boardGap) - dimensions.boardGap;
            const x = dimensions.boardPadding + wall.x1 * (dimensions.cellSize + dimensions.boardGap);
            const y = dimensions.boardPadding + (wall.y1 + 1) * (dimensions.cellSize + dimensions.boardGap) - (dimensions.boardGap / 2) - (wallThickness / 2);
            
            return (
              <div
                key={`wall-${index}`}
                className="wall horizontal"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${wallLength}px`,
                  height: `${wallThickness}px`,
                  borderRadius: `${wallThickness / 2}px`
                }}
              />
            );
          } else {
            const wallLength = (wall.y2 - wall.y1 + 1) * (dimensions.cellSize + dimensions.boardGap) - dimensions.boardGap;
            const x = dimensions.boardPadding + (wall.x1 + 1) * (dimensions.cellSize + dimensions.boardGap) - (dimensions.boardGap / 2) - (wallThickness / 2);
            const y = dimensions.boardPadding + wall.y1 * (dimensions.cellSize + dimensions.boardGap);
            
            return (
              <div
                key={`wall-${index}`}
                className="wall vertical"
                style={{
                  left: `${x}px`,
                  top: `${y}px`,
                  width: `${wallThickness}px`,
                  height: `${wallLength}px`,
                  borderRadius: `${wallThickness / 2}px`
                }}
              />
            );
          }
        })}
        
        <svg className="path-overlay">
          {gameState.currentPath.length > 1 && gameState.currentPath.map((cellId, index) => {
            if (index === 0) return null;
            
            const currentCell = getCellFromId(cellId);
            const prevCell = getCellFromId(gameState.currentPath[index - 1]);
            
            const actualCellSize = dimensions.cellSize;
            const cellSpacing = actualCellSize + dimensions.boardGap;
            const x1 = dimensions.boardPadding + prevCell.x * cellSpacing + actualCellSize / 2;
            const y1 = dimensions.boardPadding + prevCell.y * cellSpacing + actualCellSize / 2;
            const x2 = dimensions.boardPadding + currentCell.x * cellSpacing + actualCellSize / 2;
            const y2 = dimensions.boardPadding + currentCell.y * cellSpacing + actualCellSize / 2;
            
            const strokeWidth = Math.max(8, Math.min(24, dimensions.cellSize * 0.4));
            
            return (
              <line
                key={`${prevCell.x}-${prevCell.y}-${currentCell.x}-${currentCell.y}`}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={solutionAnimation.showGreenPhase ? "var(--color-complete)" : "var(--color-game-pieces)"}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
          
        </svg>
      </div>
    </div>
  );
};

export default GameBoard;