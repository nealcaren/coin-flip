import { useState, useEffect } from 'react';
import styles from '@/styles/CoinFlip.module.css';

interface CoinFlipProps {
  result?: 'heads' | 'tails';
  onComplete?: () => void;
}

export function CoinFlip({ result, onComplete }: CoinFlipProps) {
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    if (result) {
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
        onComplete?.();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [result, onComplete]);

  return (
    <div className={`${styles.coin} ${isFlipping ? styles.flipping : ''}`}>
      <div className={`${styles.side} ${styles.heads}`}>
        <span>H</span>
      </div>
      <div className={`${styles.side} ${styles.tails}`}>
        <span>T</span>
      </div>
    </div>
  );
}
