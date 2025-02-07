import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Player } from '@/types/game';

interface LobbyProps {
  player: Player;
  onMatchFound: (gameId: string) => void;
}

export default function Lobby({ player, onMatchFound }: LobbyProps) {
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    // Subscribe to lobby channel
    const channel = pusherClient.subscribe('presence-lobby');

    channel.bind('game-created', (gameRoom: any) => {
      if (gameRoom.players.includes(player.id)) {
        setIsSearching(false);
        onMatchFound(gameRoom.id);
      }
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe('presence-lobby');
    };
  }, [player.id, onMatchFound]);

  const findMatch = async () => {
    setIsSearching(true);
    try {
      await fetch('/api/game/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id })
      });
    } catch (error) {
      console.error('Failed to find match:', error);
      setIsSearching(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Game Lobby</h2>
      
      <div className="mb-4">
        <p>Student ID: {player.id}</p>
        <p>Coins: {player.coins}</p>
        <p>Status: {player.status}</p>
      </div>

      <button
        onClick={findMatch}
        disabled={isSearching}
        className={`w-full ${
          isSearching ? 'bg-gray-400' : 'bg-blue-500'
        } text-white px-4 py-2 rounded`}
      >
        {isSearching ? 'Finding Match...' : 'Find Match'}
      </button>
    </div>
  );
}
