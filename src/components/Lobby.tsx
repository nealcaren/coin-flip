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
  const [playerStatus, setPlayerStatus] = useState(player.status);

  // Update status when player prop changes
  useEffect(() => {
    setPlayerStatus(player.status);
  }, [player.status]);

  useEffect(() => {
    console.log('Setting up Pusher subscriptions for player:', player.id);
    
    // Subscribe to lobby channel and private player channel
    const lobbyChannel = pusherClient.subscribe('presence-lobby') as any;
    const playerChannel = pusherClient.subscribe(`private-player-${player.id}`) as any;

    const handleStatusUpdate = (data: { status: string, playerId?: string }) => {
      console.log('Status update received:', data);
      // Only update status if it's for this player or no playerId specified
      if (!data.playerId || data.playerId === player.id) {
        console.log('Updating player status to:', data.status);
        setPlayerStatus(data.status);
        if (data.status === 'waiting') {
          toast.loading('Waiting for opponent...', {
            id: 'waiting-toast',
            duration: Infinity
          });
        }
      }
    };

    const handleGameCreated = (gameRoom: GameRoom) => {
      console.log('Game created event received:', gameRoom);
      
      // Clear any existing waiting toast
      toast.dismiss('waiting-toast');
      
      // Validate game room data
      if (!gameRoom || !gameRoom.id || !Array.isArray(gameRoom.players)) {
        console.error('Invalid game room data received:', gameRoom);
        return;
      }
      
      // Check if this player is part of the game
      if (gameRoom.players.includes(player.id)) {
        console.log('Match found for player:', player.id, 'in game:', gameRoom.id);
        setIsSearching(false);
        setPlayerStatus('playing');
        
        // Show success toast
        toast.success('Match found! Starting game...');
        
        // Small delay to allow state updates before transitioning
        setTimeout(() => {
          onMatchFound(gameRoom);
          
          // Unsubscribe from channels when match is found
          lobbyChannel.unbind_all();
          playerChannel.unbind_all();
          pusherClient.unsubscribe('presence-lobby');
          pusherClient.unsubscribe(`private-player-${player.id}`);
        }, 100);
      }
    };

    lobbyChannel.bind('pusher:subscription_succeeded', (members: any) => {
      console.log('Successfully subscribed to presence-lobby', members);
      setIsLoading(false);
    });

    lobbyChannel.bind('pusher:subscription_error', (error: any) => {
      console.error('Failed to subscribe to presence-lobby:', error);
      toast.error('Failed to connect to lobby');
      setIsLoading(false);
    });

    lobbyChannel.bind('pusher:member_added', (member: any) => {
      console.log('Member added to lobby:', member);
    });

    lobbyChannel.bind('pusher:member_removed', (member: any) => {
      console.log('Member removed from lobby:', member);
    });

    // Bind all event handlers
    playerChannel.bind('status-update', handleStatusUpdate);
    lobbyChannel.bind('status-update', handleStatusUpdate);
    lobbyChannel.bind('game-created', handleGameCreated);
    playerChannel.bind('game-created', handleGameCreated);
    
    // Listen for waiting players
    lobbyChannel.bind('player-waiting', (data: { playerId: string, status: string }) => {
      console.log('Player waiting:', data.playerId);
      if (data.playerId !== player.id && !isSearching) {
        // If we're not already searching, try to match with the waiting player
        console.log('Attempting to match with waiting player:', data.playerId);
        findMatch();
      }
    });

    return () => {
      lobbyChannel.unbind_all();
      playerChannel.unbind_all();
      pusherClient.unsubscribe('presence-lobby');
      pusherClient.unsubscribe(`private-player-${player.id}`);
    };
  }, [player.id, onMatchFound]);

  const findMatch = async () => {
    console.log('findMatch called, current status:', playerStatus);
    // Immediately show searching state
    setIsSearching(true);
    setPlayerStatus('searching');
    toast.loading('Initiating match search...', { id: 'search-toast' });
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
        setPlayerStatus('lobby');
      } else if (data.waiting) {
        console.log('Server confirmed waiting state');
        setIsSearching(true);
        setPlayerStatus('waiting');
        toast.loading('Searching for opponent...', {
          id: 'waiting-toast',
          duration: Infinity
        });
        // Show persistent toast while waiting
        toast.loading('Searching for opponent...', {
          id: 'waiting-toast',
          duration: Infinity
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
        <p>Status: {playerStatus}</p>
      </div>

      {(isSearching || ['searching', 'waiting'].includes(playerStatus)) && (
        <div className="text-center p-4 bg-blue-50 rounded-lg mb-4 animate-pulse">
          <div className="animate-pulse">
            <p className="text-blue-600 font-medium">Searching for opponent...</p>
            <p className="text-sm text-blue-500 mt-1">Please stay on this page</p>
          </div>
          <div className="mt-3">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        
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
    </div>
  );
}
