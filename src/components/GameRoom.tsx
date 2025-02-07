import { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import toast from 'react-hot-toast';
import type { Player, GameRoom, FLIP_COOLDOWN } from '@/types/game';
import { CoinFlip } from '@/components/CoinFlip';

interface GameRoomProps {
  gameRoom: GameRoom;
  player: Player;
  onGameEnd?: () => void;
}

export default function GameRoom({ gameRoom, player, onGameEnd }: GameRoomProps) {
  const [betAmount, setBetAmount] = useState(1);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [opponentCoins, setOpponentCoins] = useState<number>(5);
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | undefined>();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  
  const isMyTurn = gameRoom.currentTurn === player.id;
  const opponent = gameRoom.players.find(id => id !== player.id)!;

  useEffect(() => {
    // Subscribe to game events
    const channel = pusherClient.subscribe(`private-game-${gameRoom.id}`);
    
    channel.bind('bet-placed', (data: { amount: number }) => {
      console.log('Bet placed:', data.amount);
    });

    channel.bind('flip-result', (data: {
      result: 'heads' | 'tails';
      playerCoins: number;
      opponentCoins: number;
      gameStatus: string;
      nextTurn: string;
    }) => {
      setFlipResult(data.result);
      
      // Update coins and show result toast
      if (data.result === 'heads') {
        toast.success('Heads! Winner!');
      } else {
        toast.error('Tails! Better luck next time!');
      }
      
      setOpponentCoins(data.opponentCoins);
      
      if (data.gameStatus === 'complete') {
        toast.success('Game Over!');
        onGameEnd?.();
      }

      // Clear flip result after animation
      setTimeout(() => {
        setFlipResult(undefined);
      }, 1500);
    });

    channel.bind('game-timeout', (data: { winner: string }) => {
      toast.error('Game ended due to timeout');
      onGameEnd?.();
    });

    return () => {
      channel.unbind_all();
      pusherClient.unsubscribe(`private-game-${gameRoom.id}`);
    };
  }, [gameRoom.id, onGameEnd]);

  const handleBet = async () => {
    if (!isMyTurn || gameRoom.status !== 'betting' || isPlacingBet) return;

    setIsPlacingBet(true);
    try {
      await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameRoom.id,
          playerId: player.id,
          amount: betAmount
        })
      });
    } catch (error) {
      console.error('Failed to place bet:', error);
      toast.error('Failed to place bet');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleFlip = async () => {
    if (!isMyTurn || gameRoom.status !== 'flipping' || isFlipping) return;

    setIsFlipping(true);
    try {
      const response = await fetch('/api/game/flip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameRoom.id,
          playerId: player.id
        })
      });

      const data = await response.json();
      if (data.error === 'Cooldown active') {
        setIsOnCooldown(true);
        setCooldownRemaining(data.remainingTime);
        
        // Start cooldown timer
        const timer = setInterval(() => {
          setCooldownRemaining(prev => {
            if (prev <= 1000) {
              clearInterval(timer);
              setIsOnCooldown(false);
              return 0;
            }
            return prev - 1000;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Failed to flip coin:', error);
      toast.error('Failed to flip coin');
    } finally {
      setIsFlipping(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded-xl shadow-md">
      <h2 className="text-xl font-bold mb-4">Game Room</h2>
      
      <div className="mb-4">
        <div className="flex justify-between mb-4">
          <div>
            <p className="font-bold">You</p>
            <p>Coins: {player.coins}</p>
          </div>
          <div>
            <p className="font-bold">Opponent</p>
            <p>Coins: {opponentCoins}</p>
          </div>
        </div>
        <p>Current Turn: {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}</p>
        <p>Status: {gameRoom.status}</p>
      </div>

      {isMyTurn && gameRoom.status === 'betting' && (
        <div className="mb-4">
          <input
            type="number"
            min={1}
            max={player.coins}
            value={betAmount}
            onChange={(e) => setBetAmount(Number(e.target.value))}
            className="border p-2 mr-2"
          />
          <button
            onClick={handleBet}
            disabled={isPlacingBet}
            className={`bg-blue-500 text-white px-4 py-2 rounded ${
              isPlacingBet ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isPlacingBet ? 'Placing Bet...' : 'Place Bet'}
          </button>
        </div>
      )}

      {isMyTurn && gameRoom.status === 'flipping' && (
        <div className="text-center">
          {flipResult && <CoinFlip result={flipResult} />}
          <button
            onClick={handleFlip}
            disabled={isOnCooldown || flipResult !== undefined || isFlipping}
            className={`w-full ${
              isOnCooldown || flipResult !== undefined || isFlipping 
                ? 'bg-gray-400' 
                : 'bg-green-500'
            } text-white px-4 py-2 rounded mt-4`}
          >
            {isOnCooldown 
              ? `Cooldown: ${Math.ceil(cooldownRemaining / 1000)}s`
              : isFlipping
              ? 'Flipping...'
              : flipResult
              ? `Result: ${flipResult.toUpperCase()}`
              : 'Flip Coin'}
          </button>
        </div>
      )}
    </div>
  );
}
