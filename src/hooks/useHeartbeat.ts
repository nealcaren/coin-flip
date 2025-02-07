import { useEffect, useRef } from 'react';
import { HEARTBEAT_INTERVAL } from '@/types/game';

export function useHeartbeat(playerId: string | null) {
  const intervalRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    if (!playerId) return;

    const sendHeartbeat = async () => {
      try {
        const response = await fetch('/api/game/heartbeat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId })
        });

        if (!response.ok) {
          console.error('Heartbeat failed:', await response.json());
        }
      } catch (error) {
        console.error('Heartbeat error:', error);
      }
    };

    // Send initial heartbeat
    sendHeartbeat();

    // Set up interval
    intervalRef.current = setInterval(sendHeartbeat, HEARTBEAT_INTERVAL);

    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [playerId]);
}
