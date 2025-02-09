import { useState, useEffect } from 'react';
import { pusherClient } from '@/lib/pusher';
import toast from 'react-hot-toast';
import type { Player, GameRoom, FLIP_COOLDOWN } from '@/types/game';
import { CoinFlip } from '@/components/CoinFlip';

interface GameRoomProps {
  initialGameRoom: GameRoom;
  player: Player;
  onGameEnd?: () => void;
}

export default function GameRoom({ initialGameRoom, player, onGameEnd }: GameRoomProps) {
  console.log("GameRoom initialGameRoom prop:", initialGameRoom);
  const [gameRoom, setGameRoom] = useState(initialGameRoom);
  const [betAmount, setBetAmount] = useState(1);
  const [isOnCooldown, setIsOnCooldown] = useState(false);
  const [cooldownRemaining, setCooldownRemaining] = useState(0);
  const [opponentCoins, setOpponentCoins] = useState<number>(5);
  const [flipResult, setFlipResult] = useState<'heads' | 'tails' | undefined>();
  const [isPlacingBet, setIsPlacingBet] = useState(false);
  const [isFlipping, setIsFlipping] = useState(false);
  const [minBet, setMinBet] = useState(1);
  const [submittedMinBet, setSubmittedMinBet] = useState(false);
  const [countdown, setCountdown] = useState(5);
  const [playerCoins, setPlayerCoins] = useState<number>(player.coins);
  
  const isMyTurn = gameRoom.currentTurn === player.id;
  console.log("isMyTurn:", isMyTurn);
  const opponent = gameRoom.players[0] === player.id ? gameRoom.players[1] : gameRoom.players[0];

  useEffect(() => {
    console.log('Subscribing to game channel:', `private-game-${gameRoom.id}`);
    const channel = pusherClient.subscribe(`private-game-${gameRoom.id}`);
    
    channel.bind('pusher:subscription_succeeded', () => {
      console.log('Successfully subscribed to game channel');
    });

    channel.bind('pusher:subscription_error', (error: any) => {
      console.error('Failed to subscribe to game channel:', error);
    });
    
    channel.bind('bet-placed', (data: { amount: number, playerId: string }) => {
      console.log('bet-placed event received:', data);
      if (data.playerId !== player.id) {
        toast.info(`Opponent bet ${data.amount} coins`);
      }
      setGameRoom((prevGameRoom) => ({
        ...prevGameRoom,
        status: 'flipping',
        betAmount: data.amount,
      }));
      console.log('Updated gameRoom state:', gameRoom);
    });

    channel.bind('flip-result', (data: {
      result: 'heads' | 'tails';
      playerCoins: number;
      opponentCoins: number;
      gameStatus: string;
      nextTurn: string;
    }) => {
      console.log('Flip result received:', data);
      setFlipResult(data.result);
      
      // Update player coins and game state
      setGameRoom((prevGameRoom) => ({
        ...prevGameRoom,
        status: data.gameStatus === 'betting' ? 'minbet' : data.gameStatus,
        currentTurn: data.nextTurn,
        betAmount: data.gameStatus === 'betting' ? 0 : prevGameRoom.betAmount,
      }));
      
      setPlayerCoins(data.playerCoins);
      setOpponentCoins(data.opponentCoins);
      
      // Show result toast
      if (data.result === 'heads') {
        toast.success(`Heads! ${data.nextTurn === player.id ? 'Your turn!' : 'Opponent\'s turn!'}`);
      } else {
        toast.error(`Tails! ${data.nextTurn === player.id ? 'Your turn!' : 'Opponent\'s turn!'}`);
      }
      
      if (data.gameStatus === 'complete') {
        toast.success('Game Over!');
        setTimeout(() => {
          onGameEnd?.();
        }, 2000);
      } else {
        // Clear flip result after animation
        setTimeout(() => {
          setFlipResult(undefined);
        }, 1500);
      }
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
    if (!isMyTurn || gameRoom.status !== 'betting' || isPlacingBet) {
      console.log('Bet blocked:', { isMyTurn, status: gameRoom.status, isPlacingBet });
      return;
    }

    console.log('Placing bet:', { amount: betAmount, gameId: gameRoom.id, playerId: player.id });
    setIsPlacingBet(true);
    
    try {
      const response = await fetch('/api/game/bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameId: gameRoom.id,
          playerId: player.id,
          amount: betAmount
        })
      });

      const data = await response.json();
      console.log('Bet response:', data);

      if (data.error) {
        toast.error(data.error);
      } else {
        toast.success(`Bet placed: ${betAmount} coins`);
      }
    } catch (error) {
      console.error('Failed to place bet:', error);
      toast.error('Failed to place bet');
    } finally {
      setIsPlacingBet(false);
    }
  };

  const handleFlip = async () => {
    if (!isMyTurn || gameRoom.status !== 'flipping' || isFlipping) {
      console.log('Flip blocked:', { isMyTurn, status: gameRoom.status, isFlipping });
      return;
    }

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

  useEffect(() => {
    if (gameRoom.status === 'minbet') {
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleMinBetSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [gameRoom.status]);

  const handleMinBetSubmit = () => {
    if (submittedMinBet) return;
    setSubmittedMinBet(true);
    toast.success(`Minimum bet submitted: ${minBet} coins`);
    setGameRoom((prev) => ({ ...prev, betAmount: minBet, status: 'flipping' }));
    setTimeout(() => {
      simulateCoinFlip(minBet);
    }, 1000);
  };

  const simulateCoinFlip = (finalBet: number) => {
    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    setFlipResult(result);
    toast[result === 'heads' ? 'success' : 'error'](`Coin flip result: ${result.toUpperCase()}`);
    // Adjust coin amounts based on the outcome
    if (result === 'heads') {
      setOpponentCoins(prev => Math.max(prev - finalBet, 0));
    } else {
      setOpponentCoins(prev => prev + finalBet);
    }
    setPlayerCoins(prevPlayerCoins => {
      const newCoins = result === 'heads' ? prevPlayerCoins + finalBet : Math.max(prevPlayerCoins - finalBet, 0);
      if (newCoins <= 0 || opponentCoins <= 0) {
        toast.success('Game Over!');
        onGameEnd?.();
      } else {
        setCountdown(5);
        setGameRoom((prev) => ({ ...prev, status: 'minbet', betAmount: 0 }));
      }
      return newCoins;
    });
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
                <p className="text-xl font-bold text-indigo-600">{playerCoins} coins</p>
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

          {isMyTurn && (gameRoom.status === 'minbet' || gameRoom.status === 'betting') && (
            <div className="space-y-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-600">Set Minimum Bet</span>
                  <span className="font-bold text-indigo-600">{minBet} coins</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={playerCoins}
                  value={minBet}
                  onChange={(e) => setMinBet(Number(e.target.value))}
                  className="w-full h-2 bg-indigo-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
                <div className="flex justify-between text-sm text-gray-500 mt-1">
                  <span>1</span>
                  <span>{player.coins}</span>
                </div>
                <p className="text-center mt-2 text-sm text-gray-500">Time remaining: {countdown}s</p>
                <div className="mt-4 text-center">
                  <button 
                    onClick={handleMinBetSubmit} 
                    className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
                  >
                    Submit Bet
                  </button>
                </div>
              </div>
            </div>
          )}

          {gameRoom.status === 'flipping' && (
            <div className="text-center space-y-4">
              <p className="mb-2">Bet Amount: {gameRoom.betAmount} coins</p>
              <CoinFlip result={flipResult} />
            </div>
          )}

          {!isMyTurn && (gameRoom.status === 'minbet' || gameRoom.status === 'betting') && (
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <p className="text-gray-500">Waiting for opponent's minimum bet...</p>
            </div>
          )}

          {!isMyTurn && gameRoom.status === 'flipping' && (
            <div className="text-center p-6 bg-gray-50 rounded-xl">
              <p className="text-gray-500">Opponent's bet: {gameRoom.betAmount} coins</p>
              <p className="text-gray-500 mt-2">Waiting for opponent to flip...</p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500 text-center">
            <p>Game Status: {gameRoom.status}</p>
            {gameRoom.betAmount > 0 && <p>Current Bet: {gameRoom.betAmount} coins</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
