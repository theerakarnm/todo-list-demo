import { useEffect, useState } from "react";

const MINUTE_MS = 60_000;

/** The current time, updated every minute, so "today" moves on at midnight while the app is open. */
export function useNow() {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), MINUTE_MS);
    return () => clearInterval(timer);
  }, []);
  return now;
}
