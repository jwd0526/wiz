import type { Game } from '../types/game';

const API_BASE_URL = process.env.NODE_ENV === 'development' 
  ? 'http://localhost:8000' 
  : '';

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export const generateGame = async (size: number, nodes: number, walls: number): Promise<Game> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/main.go`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ size, nodes, walls }),
    });

    if (!response.ok) {
      throw new ApiError(
        `HTTP error! status: ${response.status}`,
        response.status
      );
    }

    const game: Game = await response.json();
    return game;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new ApiError('Unable to connect to the game server. Make sure the backend is running on port 8000.');
    }
    
    throw new ApiError(`Failed to generate game: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};