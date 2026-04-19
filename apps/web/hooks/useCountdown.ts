import { useState, useEffect } from 'react';

export function useCountdown(expiresAt: string) {
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const targetDate = new Date(expiresAt).getTime();

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const difference = targetDate - now;

      if (difference <= 0) {
        clearInterval(interval);
        setTimeLeft(0);
        setIsExpired(true);
      } else {
        setTimeLeft(difference);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
  const isWarning = !isExpired && minutes < 3; // Warn if strictly under 3 minutes locally

  return {
    minutes,
    seconds,
    formatted: `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`,
    isWarning,
    isExpired
  };
}
