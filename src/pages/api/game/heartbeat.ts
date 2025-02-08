import { NextApiRequest, NextApiResponse } from 'next';
import { pusherServer } from '@/lib/pusher';
import type { Player, GameRoom } from '@/types/game';

// Share the same in-memory storage from [action].ts
declare global {
  var players: Map<string, Player>;
  var games: Map<string, GameRoom>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { playerId } = req.body;
  const now = Date.now();

  const player = global.players?.get(playerId);
  if (!player) {
    return res.status(404).json({ error: 'Player not found' });
  }

  // Update last active timestamp
  player.lastActive = now;
  
  // If player was disconnected, handle reconnection
  if (player.disconnectedAt) {
    player.disconnectedAt = undefined;
    
    // Notify others of reconnection
    await pusherServer.trigger('presence-lobby', 'player-reconnected', {
      playerId: player.id
    });
  }

  res.status(200).json({ success: true });
}
