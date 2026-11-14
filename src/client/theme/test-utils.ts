import { vi } from "vitest";

/** jsdom has no matchMedia; this fake answers the dark-mode query and can change it later. */
export function stubSystemPrefersDark(initiallyDark: boolean) {
  let prefersDark = initiallyDark;
  const listeners = new Set<() => void>();

  vi.stubGlobal("matchMedia", (query: string) => ({
    get matches() {
      return query === "(prefers-color-scheme: dark)" && prefersDark;
    },
    media: query,
    addEventListener: (_type: string, listener: () => void) => listeners.add(listener),
    removeEventListener: (_type: string, listener: () => void) => listeners.delete(listener),
  }));

  return {
    setSystemPrefersDark(dark: boolean) {
      prefersDark = dark;
      for (const listener of listeners) listener();
    },
  };
}
