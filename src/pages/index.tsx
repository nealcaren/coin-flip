import { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import type { Player, GameRoom } from '@/types/game';
import { useHeartbeat } from '@/hooks/useHeartbeat';

export default function Home() {
  const [studentId, setStudentId] = useState('');
  const [gameState, setGameState] = useState<'login' | 'lobby' | 'playing'>('login');
  const [player, setPlayer] = useState<Player | null>(null);
  const [currentGame, setCurrentGame] = useState<GameRoom | null>(null);

  useHeartbeat(player?.id ?? null);

  useEffect(() => {
    if (player) {
      // Subscribe to lobby channel
      const channel = pusherClient.subscribe('presence-lobby');
      
      channel.bind('player-joined', (data: Player) => {
        console.log('New player joined:', data);
      });

      channel.bind('game-created', (game: GameRoom) => {
        if (game.players.includes(player.id)) {
          setCurrentGame(game);
          setGameState('playing');
        }
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
      if (data.gameId) {
        setCurrentGame(data);
        setGameState('playing');
      }
    } catch (error) {
      console.error('Matchmaking failed:', error);
    }
  };

  if (gameState === 'login') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <form onSubmit={handleLogin} className="p-6 bg-white rounded shadow-md">
          <h1 className="text-2xl mb-4">Classroom Coin Flip</h1>
          <input
            type="text"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter Student ID"
            className="border p-2 mb-4 w-full"
          />
          <button 
            type="submit"
            className="w-full bg-blue-500 text-white p-2 rounded"
          >
            Join Game
          </button>
        </form>
      </div>
    );
  }

  if (gameState === 'lobby') {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl mb-4">Game Lobby</h1>
          <div className="bg-white rounded shadow-md p-4 mb-4">
            <p>Student ID: {player?.id}</p>
            <p>Coins: {player?.coins}</p>
          </div>
          <button 
            onClick={findMatch}
            className="w-full bg-green-500 text-white p-2 rounded"
          >
            Find Match
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'playing' && currentGame) {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-2xl mb-4">Game Room</h1>
          <div className="bg-white rounded shadow-md p-4">
            <p>Game ID: {currentGame.id}</p>
            <p>Current Turn: {currentGame.currentTurn}</p>
            <p>Bet Amount: {currentGame.betAmount}</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
