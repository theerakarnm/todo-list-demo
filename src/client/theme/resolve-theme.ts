import { THEMES, type Theme } from "../../shared/constants";

export type ResolvedTheme = "light" | "dark";

/** localStorage key, also read by public/theme-init.js before the first paint. */
export const THEME_STORAGE_KEY = "jotlist-theme";

/** Browser UI / status bar colour per theme: --paper and --stock-night in tokens.css. */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#f2ede1",
  dark: "#0b0b0e",
};

export function resolveTheme(preference: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function parseThemePreference(storedValue: string | null): Theme {
  return THEMES.find((theme) => theme === storedValue) ?? "system";
}
