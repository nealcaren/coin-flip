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
    <div className="game-container p-4">
      <div className="max-w-md mx-auto pt-8">
        <div className="card p-6">
          <h2 className="text-2xl font-bold mb-6 text-gray-800 text-center">Game Room</h2>
          
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-xl">
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">You</p>
                <p className="text-xl font-bold text-indigo-600">{player.coins} coins</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg shadow-sm">
                <p className="text-sm text-gray-500">Opponent</p>
                <p className="text-xl font-bold text-indigo-600">{opponentCoins} coins</p>
              </div>
            </div>
            <div className="mt-4 text-center">
              <p className="text-sm text-gray-500">Current Turn</p>
              <p className="font-semibold text-gray-800">
                {isMyTurn ? 'Your Turn' : 'Opponent\'s Turn'}
              </p>
            </div>
          </div>

          {isMyTurn && gameRoom.status === 'betting' && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Bet Amount</span>
                  <span className="font-bold text-indigo-600">{betAmount} coins</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={player.coins}
                  value={betAmount}
                  onChange={(e) => setBetAmount(Number(e.target.value))}
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1</span>
                  <span>{player.coins}</span>
                </div>
              </div>
              <button
                onClick={handleBet}
                disabled={isPlacingBet}
                className={`button-primary ${isPlacingBet && 'opacity-50 cursor-not-allowed'}`}
              >
                {isPlacingBet ? 'Placing Bet...' : `Bet ${betAmount} Coins`}
              </button>
            </div>
          )}

          {isMyTurn && gameRoom.status === 'flipping' && (
            <div className="text-center space-y-4">
              {flipResult && <CoinFlip result={flipResult} />}
              <button
                onClick={handleFlip}
                disabled={isOnCooldown || flipResult !== undefined || isFlipping}
                className={`button-secondary ${
                  (isOnCooldown || flipResult !== undefined || isFlipping) && 
                  'opacity-50 cursor-not-allowed'
                }`}
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

          {!isMyTurn && (
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <p className="text-gray-500">Waiting for opponent...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
