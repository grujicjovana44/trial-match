import { useEffect, useState } from "react";
import { SLOW_NOTICE_MS } from "../copy.js";

export function useSlowNotice(busy: boolean): boolean {
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!busy) {
      setSlow(false);
      return;
    }

    const timer = setTimeout(() => setSlow(true), SLOW_NOTICE_MS);
    return () => clearTimeout(timer);
  }, [busy]);

  return slow;
}
