import { useSyncExternalStore } from "react";

const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(onChange: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
}

/** True while the operating system is in dark mode; updates live. */
export function useSystemPrefersDark() {
  return useSyncExternalStore(subscribe, () => window.matchMedia(DARK_QUERY).matches);
}
