import { useState, useEffect, useCallback } from 'react';
import GameBoard from './components/GameBoard';
import Restart from './components/Restart';
import Right from './components/Right';
import Left from './components/Left';
import type { Game } from './types/game';
import { generateGame, ApiError } from './services/api';
import './App.css';

function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number>(1);
  const [highestLevel, setHighestLevel] = useState<number>(1);
  const [gameStatus, setGameStatus] = useState<{
    isValid: boolean;
    pathLength: number;
    isComplete: boolean;
  }>({
    isValid: false,
    pathLength: 0,
    isComplete: false
  });
  const [greenAnimationComplete, setGreenAnimationComplete] = useState<boolean>(false);
  const [isTransitioningOut, setIsTransitioningOut] = useState<boolean>(false);
  const [nextLevelReady, setNextLevelReady] = useState<boolean>(false);
  const [pendingGame, setPendingGame] = useState<Game | null>(null);

  const getLevelConfig = (level: number) => {
    if (level <= 4) {
      return {
        size: 5,
        nodes: level + 1,
        walls: 0
      };
    }
    
    if (level === 5) {
      return {
        size: 5,
        nodes: 2,
        walls: 2
      };
    }
    
    if (level <= 15) {
      const baseNodes = 3 + Math.floor((level - 6) / 2);
      const walls = level >= 8 ? Math.floor(Math.random() * 6) : 0;
      return {
        size: 6,
        nodes: baseNodes,
        walls: walls
      };
    }
    
    if (level <= 30) {
      let nodes;
      if (level <= 20) {
        nodes = 6 + (level - 16);
      } else {
        const level19Nodes = 6 + (19 - 16);
        nodes = level19Nodes + Math.floor(Math.random() * 5);
      }
      const walls = Math.floor(Math.random() * 6);
      return {
        size: 7,
        nodes: nodes,
        walls: walls
      };
    }
    
    if (level <= 40) {
      const level15Nodes = 3 + Math.floor((15 - 6) / 2);
      const nodes = level15Nodes + Math.floor(Math.random() * 7);
      const walls = Math.floor(Math.random() * 9);
      return {
        size: 8,
        nodes: nodes,
        walls: walls
      };
    }
    
    if (level <= 50) {
      const level15Nodes = 3 + Math.floor((15 - 6) / 2);
      const nodes = level15Nodes + Math.floor(Math.random() * 9);
      const walls = 2 + Math.floor(Math.random() * 9);
      return {
        size: 9,
        nodes: nodes,
        walls: walls
      };
    }
    
    const sizeIncrement = Math.floor((level - 51) / 5);
    const size = 10 + sizeIncrement;
    
    const level15Nodes = 7;
    const nodeRangeIncrease = sizeIncrement * 2;
    const minNodes = level15Nodes + nodeRangeIncrease;
    const maxNodes = level15Nodes + 8 + nodeRangeIncrease;
    const nodes = minNodes + Math.floor(Math.random() * (maxNodes - minNodes + 1));
    
    const minWalls = 2 + sizeIncrement;
    const maxWalls = 10 + sizeIncrement;
    const walls = minWalls + Math.floor(Math.random() * (maxWalls - minWalls + 1));
    
    return {
      size: Math.min(size, 20),
      nodes: nodes,
      walls: walls
    };
  };

  const generateLevel = useCallback(async (level: number) => {
    setError(null);
    setGameStatus({ isValid: false, pathLength: 0, isComplete: false });
    setGreenAnimationComplete(false);
    
    const config = getLevelConfig(level);
    
    try {
      const newGame = await generateGame(config.size, config.nodes, config.walls);
      setGame(newGame);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      console.error('Error generating game:', err);
    }
  }, []);

  const handleGameComplete = () => {
    setGameStatus(prev => ({ ...prev, isComplete: true }));
    if (currentLevel === highestLevel) {
      setHighestLevel(currentLevel + 1);
    }
  };

  const handleNextLevel = () => {
    if (nextLevelReady && pendingGame) {
      setIsTransitioningOut(true);
      setCurrentLevel(currentLevel + 1);
    }
  };

  const handlePrevLevel = () => {
    if (currentLevel > 1) {
      const prevLevel = currentLevel - 1;
      setCurrentLevel(prevLevel);
      generateLevel(prevLevel);
    }
  };

  const handlePathChange = (isValid: boolean, pathLength: number) => {
    setGameStatus(prev => ({ ...prev, isValid, pathLength }));
  };

  const handleRestart = () => {
    setGameStatus(prev => ({ ...prev, isValid: false, pathLength: 0, isComplete: false }));
  };

  const handleAnimationStatusChange = (complete: boolean) => {
    setGreenAnimationComplete(complete);
  };

  useEffect(() => {
    if (isTransitioningOut && pendingGame) {
      const timer = setTimeout(() => {
        setGame(pendingGame);
        setPendingGame(null);
        setNextLevelReady(false);
        setIsTransitioningOut(false);
        setGreenAnimationComplete(false);
        setGameStatus({ isValid: false, pathLength: 0, isComplete: false });
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [isTransitioningOut, pendingGame]);

  // Generate next level when green animation completes
  useEffect(() => {
    if (greenAnimationComplete && gameStatus.isComplete && !nextLevelReady) {
      const nextLevel = currentLevel + 1;
      const config = getLevelConfig(nextLevel);
      
      generateGame(config.size, config.nodes, config.walls)
        .then(newGame => {
          setPendingGame(newGame);
          setNextLevelReady(true);
        })
        .catch(err => {
          if (err instanceof ApiError) {
            setError(err.message);
          } else {
            setError('An unexpected error occurred');
          }
          console.error('Error pre-generating next level:', err);
        });
    }
  }, [greenAnimationComplete, gameStatus.isComplete, nextLevelReady, currentLevel]);

  useEffect(() => {
    generateLevel(1);
  }, [generateLevel]);

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>WIZ</h1>
        </header>



        {error && (
          <div className="error">
            <strong>Error:</strong> {error}
          </div>
        )}

        <GameBoard 
          game={game} 
          onGameComplete={handleGameComplete}
          onPathChange={handlePathChange}
          onNextLevel={handleNextLevel}
          onAnimationStatusChange={handleAnimationStatusChange}
          isTransitioningOut={isTransitioningOut}
          gameStatus={gameStatus}
        />

        <div className="nav-controls">
          <button 
            onClick={handlePrevLevel} 
            className="button"
            disabled={currentLevel <= 1}
          >
            <Left className="icon" size={200} color="#FFFFFF" />
          </button>
          <button 
            onClick={handleRestart} 
            className="button"
            disabled={gameStatus.pathLength === 0}
          >
            <Restart className="icon" size={40} color="#FFFFFF" />
          </button>
          <button 
            onClick={handleNextLevel} 
            className="button"
            disabled={(!gameStatus.isComplete && currentLevel >= highestLevel) || (gameStatus.isComplete && !nextLevelReady)}
          >
            <Right className="icon" size={800} color="#FFFFFF" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
