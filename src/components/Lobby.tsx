import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Player } from '@/types/game';

interface LobbyProps {
  player: Player;
  onMatchFound: (game: GameRoom) => void;
}

export default function Lobby({ player, onMatchFound }: LobbyProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to lobby channel
    const channel = pusherClient.subscribe('presence-lobby');

    channel.bind('pusher:subscription_succeeded', () => {
      setIsLoading(false);
    });

    channel.bind('game-created', (gameRoom: GameRoom) => {
      console.log('Game created event received:', gameRoom);
      if (gameRoom.players.includes(player.id)) {
        console.log('Match found for player:', player.id);
        setIsSearching(false);
        onMatchFound(gameRoom);
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
      console.log('Attempting to find match for player:', player.id);
      const response = await fetch('/api/game/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id })
      });
      
      const data = await response.json();
      console.log('Match response:', data);
    
      if (data.error) {
        toast.error(data.error);
        setIsSearching(false);
      } else if (data.waiting) {
        toast.success('Waiting for opponent...', { duration: 3000 });
      } else {
        // If we get a game room back, use it
        onMatchFound(data);
      }
    } catch (error) {
      console.error('Failed to find match:', error);
      toast.error('Failed to find match');
      setIsSearching(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
        <h2 className="text-xl font-bold mb-4">Game Lobby</h2>
        <div className="flex justify-center items-center h-32">
          <p className="text-gray-500">Connecting to lobby...</p>
        </div>
      </div>
    );
  }

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
