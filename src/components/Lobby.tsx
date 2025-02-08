import { useEffect, useState } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Player, GameRoom } from '@/types/game';
import toast from 'react-hot-toast';

interface LobbyProps {
  player: Player;
  onMatchFound: (game: GameRoom) => void;
}

export default function Lobby({ player, onMatchFound }: LobbyProps) {
  const [isSearching, setIsSearching] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Subscribe to lobby channel
    const channel = pusherClient.subscribe('presence-lobby') as any;

    channel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('Successfully subscribed to presence-lobby', members);
      setIsLoading(false);
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Failed to subscribe to presence-lobby:', error);
      toast.error('Failed to connect to lobby');
      setIsLoading(false);
    });

    channel.bind('pusher:member_added', (member: any) => {
      console.log('Member added to lobby:', member);
    });

    channel.bind('pusher:member_removed', (member: any) => {
      console.log('Member removed from lobby:', member);
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
        // Keep searching state true and show toast
        toast.success('Waiting for opponent...', { 
          duration: 3000,
          id: 'waiting-toast' // Prevent duplicate toasts
        });
      } else if (data.id) {
        // If we get a game room back, use it
        console.log('Game room received:', data);
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
          isSearching ? 'bg-gray-400' : 'bg-blue-500 hover:bg-blue-600'
        } text-white px-4 py-2 rounded transition-colors`}
      >
        {isSearching ? (
          <span className="flex items-center justify-center">
            Finding Match...
            <span className="ml-2">⌛</span>
          </span>
        ) : (
          'Find Match'
        )}
      </button>
    </div>
  );
}
