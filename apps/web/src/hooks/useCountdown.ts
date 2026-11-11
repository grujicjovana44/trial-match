import { useEffect, useState } from "react";

export function useCountdown(startSeconds: number): number {
  const [remaining, setRemaining] = useState(startSeconds);

  useEffect(() => {
    setRemaining(startSeconds);
    if (startSeconds <= 0) return;

    let seconds = startSeconds;
    const interval = setInterval(() => {
      seconds -= 1;
      setRemaining(Math.max(0, seconds));
      if (seconds <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [startSeconds]);

  return remaining;
}
