export interface Player {
  id: string;
  coins: number;
  status: 'lobby' | 'playing';
  lastActive: number;
  lastFlip: number;
  disconnectedAt?: number;
}

export interface GameRoom {
  id: string;
  players: [string, string];
  currentTurn: string;
  betAmount: number;
  status: 'betting' | 'flipping' | 'complete';
  graceEndTime?: number;
  lastAction: number;
}

export const HEARTBEAT_INTERVAL = 10000;  // 10 seconds
export const DISCONNECT_TIMEOUT = 30000;  // 30 seconds
export const FLIP_COOLDOWN = 2000;       // 2 seconds
