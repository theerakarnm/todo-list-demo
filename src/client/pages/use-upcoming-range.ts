import { useState } from "react";

export const UPCOMING_RANGES = [7, 14, 30] as const;
export type UpcomingRange = (typeof UPCOMING_RANGES)[number];

const STORAGE_KEY = "jotlist-upcoming-range";

function readRange(): UpcomingRange {
  try {
    const stored = Number(localStorage.getItem(STORAGE_KEY));
    return UPCOMING_RANGES.find((range) => range === stored) ?? 7;
  } catch {
    return 7;
  }
}

/** How many days Upcoming shows (7, 14 or 30); the last choice is remembered on this device. */
export function useUpcomingRange() {
  const [range, setRange] = useState(readRange);

  function chooseRange(next: UpcomingRange) {
    localStorage.setItem(STORAGE_KEY, String(next));
    setRange(next);
  }

  return { range, chooseRange };
}
