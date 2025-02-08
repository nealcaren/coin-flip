import { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Player, GameRoom } from '@/types/game';
import { useHeartbeat } from '@/hooks/useHeartbeat';
import GameRoom from '@/components/GameRoom';
import toast from 'react-hot-toast';

export default function Home() {
  const [studentId, setStudentId] = useState('');
  const [gameState, setGameState] = useState<'login' | 'lobby' | 'playing'>('login');
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentGame, setCurrentGame] = useState<GameRoom | null>(null);

  useHeartbeat(player?.id ?? null);

  useEffect(() => {
    if (player) {
      console.log('Setting up lobby channel for player:', player.id);
      // Subscribe to lobby channel
      const channel = pusherClient.subscribe('presence-lobby');
      
      channel.bind('player-joined', (data: Player) => {
        console.log('New player joined:', data);
      });

      channel.bind('game-created', (game: GameRoom) => {
        console.log('Game created event received:', game);
        console.log('Current player:', player.id);
        console.log('Game players:', game.players);
        
        if (game.players.includes(player.id)) {
          console.log('Match found, transitioning to game state');
          setCurrentGame(game);
          setGameState('waitingForBet');
          setCurrentGame(game);
          toast.success('Game starting!');
        }
      });

      // Add error handling for channel subscription
      channel.bind('pusher:subscription_error', (error: any) => {
        console.error('Pusher subscription error:', error);
      });

      return () => {
        channel.unbind_all();
        pusherClient.unsubscribe('presence-lobby');
      };
    }
  }, [player]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (studentId) {
      try {
        const response = await fetch('/api/game/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ studentId })
        });
        
        const playerData = await response.json();
        setPlayer(playerData);
        setGameState('lobby');
      } catch (error) {
        console.error('Login failed:', error);
      }
    }
  };

  const findMatch = async () => {
    if (!player) return;
    
    try {
      const response = await fetch('/api/game/match', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: player.id })
      });
      
      const data = await response.json();
      console.log('Match response:', data);
      
      if (data.waiting) {
        setGameState('lobby');
        toast.loading('Searching for opponent...', {
          id: 'waiting-toast',
          duration: Infinity
        });
      } else {
        setCurrentGame(data);
        setGameState('playing');
      }
    } catch (error) {
      console.error('Matchmaking failed:', error);
    }
  };

  if (gameState === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-500 to-purple-600 p-4">
        <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-white rounded-2xl shadow-xl">
          <h1 className="text-3xl font-bold mb-6 text-center text-gray-800">
            Classroom Coin Flip
          </h1>
          <div className="space-y-4">
            <input
              type="text"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              placeholder="Enter Student ID"
              className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              className="w-full bg-blue-500 text-white py-3 rounded-lg font-semibold hover:bg-blue-600 transition-colors"
            >
              Join Game
            </button>
          </div>
        </form>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-500 to-purple-600 p-4">
        <div className="max-w-md mx-auto pt-8">
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
            <h1 className="text-2xl font-bold mb-6 text-center text-gray-800">Game Lobby</h1>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Student ID</p>
                  <p className="font-semibold text-gray-800">{player?.id}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Coins</p>
                  <p className="font-semibold text-gray-800">{player?.coins}</p>
                </div>
              </div>
              <button 
                onClick={findMatch}
                className="w-full bg-green-500 text-white py-3 rounded-lg font-semibold hover:bg-green-600 transition-colors"
              >
                Find Match
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentGame && player) {
    return (
      <GameRoom 
        gameRoom={currentGame}
        player={player}
        onGameEnd={() => {
          setGameState('lobby');
          setCurrentGame(null);
        }}
      />
    );
  }

  return null;
}
