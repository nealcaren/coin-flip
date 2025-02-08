import { NextApiRequest, NextApiResponse } from 'next';
import { pusherServer } from '@/lib/pusher';
import type { Player, GameRoom } from '@/types/game';
import { DISCONNECT_TIMEOUT, FLIP_COOLDOWN } from '@/types/game';

// In-memory storage
declare global {
  var players: Map<string, Player>;
  var games: Map<string, GameRoom>;
  var waitingPlayers: string[];
}

global.players = global.players || new Map();
global.games = global.games || new Map();
global.waitingPlayers = global.waitingPlayers || [];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { action } = req.query;

  switch (action) {
    case 'login':
      return handleLogin(req, res);
    case 'match':
      return handleMatch(req, res);
    case 'bet':
      return handleBet(req, res);
    case 'flip':
      return handleFlip(req, res);
    default:
      return res.status(400).json({ error: 'Invalid action' });
  }
}

function checkGameTimeout(game: GameRoom): boolean {
  const now = Date.now();
  if (now - game.lastAction > DISCONNECT_TIMEOUT) {
    // Handle timeout
    const currentPlayer = players.get(game.currentTurn)!;
    const opponentId = game.players.find(id => id !== game.currentTurn)!;
    const opponent = players.get(opponentId)!;
    
    // Current player forfeits
    currentPlayer.status = 'lobby';
    opponent.status = 'lobby';
    games.delete(game.id);
    
    // Notify players
    pusherServer.trigger(`game-${game.id}`, 'game-timeout', {
      winner: opponentId
    });
    
    return true;
  }
  return false;
}

async function handleLogin(req: NextApiRequest, res: NextApiResponse) {
  const { studentId } = req.body;

  // Create or get existing player
  let player = players.get(studentId) || {
    id: studentId,
    coins: 5,
    status: 'lobby' as const
  };

  players.set(studentId, player);

  // Notify lobby of new player
  await pusherServer.trigger('presence-lobby', 'player-joined', player);

  res.status(200).json(player);
}

async function handleMatch(req: NextApiRequest, res: NextApiResponse) {
  const { playerId } = req.body;
  console.log('Match request received for player:', playerId);
  
  if (waitingPlayers.includes(playerId)) {
    console.log('Player already waiting:', playerId);
    return res.status(400).json({ error: 'Already waiting for match' });
  }

  const player = players.get(playerId);
  if (!player) {
    console.log('Player not found:', playerId);
    return res.status(404).json({ error: 'Player not found' });
  }

  if (waitingPlayers.length > 0) {
    const opponent = waitingPlayers.shift()!;
    console.log('Found opponent:', opponent);
    const opponentPlayer = players.get(opponent);
    
    if (!opponentPlayer) {
      console.log('Opponent not found, adding player to waiting list');
      waitingPlayers.push(playerId);
      return res.status(200).json({ waiting: true });
    }
    
    const gameRoom: GameRoom = {
      id: `game-${Date.now()}`,
      players: [playerId, opponent],
      currentTurn: playerId,
      betAmount: 0,
      status: 'betting',
      lastAction: Date.now()
    };

    console.log('Creating game room:', gameRoom);
    games.set(gameRoom.id, gameRoom);

    player.status = 'playing';
    opponentPlayer.status = 'playing';

    // Notify both players through the lobby channel
    console.log('Triggering game-created event');
    await pusherServer.trigger('presence-lobby', 'game-created', gameRoom);

    res.status(200).json(gameRoom);
  } else {
    console.log('No opponents available, adding to waiting list:', playerId);
    waitingPlayers.push(playerId);
    res.status(200).json({ waiting: true });
  }
}

async function handleBet(req: NextApiRequest, res: NextApiResponse) {
  const { gameId, playerId, amount } = req.body;
  console.log('Handling bet:', { gameId, playerId, amount });
  
  const game = games.get(gameId);
  const player = players.get(playerId);

  if (!game || !player) {
    console.log('Game or player not found:', { gameFound: !!game, playerFound: !!player });
    return res.status(404).json({ error: 'Game or player not found' });
  }

  if (game.currentTurn !== playerId || game.status !== 'betting') {
    console.log('Invalid bet:', { currentTurn: game.currentTurn, status: game.status });
    return res.status(400).json({ error: 'Invalid bet' });
  }

  if (amount > player.coins) {
    return res.status(400).json({ error: 'Not enough coins' });
  }

  // Update game state
  game.betAmount = amount;
  game.status = 'flipping';
  game.lastAction = Date.now();

  console.log('Broadcasting bet-placed event');
  await pusherServer.trigger(`private-game-${gameId}`, 'bet-placed', { 
    amount,
    playerId,
    gameStatus: game.status
  });
  
  res.status(200).json({ success: true });
}

async function handleFlip(req: NextApiRequest, res: NextApiResponse) {
  const { gameId, playerId } = req.body;
  const now = Date.now();
  const game = games.get(gameId);
  const player = players.get(playerId)!;

  // Check cooldown
  if (now - player.lastFlip < FLIP_COOLDOWN) {
    return res.status(429).json({ 
      error: 'Cooldown active',
      remainingTime: FLIP_COOLDOWN - (now - player.lastFlip)
    });
  }

  if (!game || game.currentTurn !== playerId || game.status !== 'flipping') {
    return res.status(400).json({ error: 'Invalid flip' });
  }

  // Update last flip timestamp
  player.lastFlip = now;
  game.lastAction = now;

  const result = Math.random() < 0.5 ? 'heads' : 'tails';
  const opponentId = game.players.find(id => id !== playerId)!;
  const opponent = players.get(opponentId)!;

  // Update coins based on result
  if (result === 'heads') {
    player.coins += game.betAmount;
    opponent.coins -= game.betAmount;
  } else {
    player.coins -= game.betAmount;
    opponent.coins += game.betAmount;
  }

  // Check for game end
  if (player.coins <= 0 || opponent.coins <= 0) {
    game.status = 'complete';
    player.status = 'lobby';
    opponent.status = 'lobby';
    games.delete(gameId);
  } else {
    game.currentTurn = opponentId;
    game.status = 'betting';
    game.betAmount = 0;
  }

  await pusherServer.trigger(`game-${gameId}`, 'flip-result', {
    result,
    playerCoins: player.coins,
    opponentCoins: opponent.coins,
    gameStatus: game.status,
    nextTurn: game.currentTurn
  });

  res.status(200).json({ success: true });
}
