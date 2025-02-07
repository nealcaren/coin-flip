export interface Player {
  id: string;
  coins: number;
  status: 'lobby' | 'playing';
}

export interface GameRoom {
  id: string;
  players: [string, string];
  currentTurn: string;
  betAmount: number;
  status: 'betting' | 'flipping' | 'complete';
}
