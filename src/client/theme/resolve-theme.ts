import { THEMES, type Theme } from "../../shared/constants";

export type ResolvedTheme = "light" | "dark";

/** localStorage key, also read by public/theme-init.js before the first paint. */
export const THEME_STORAGE_KEY = "jotlist-theme";

export function resolveTheme(preference: Theme, systemPrefersDark: boolean): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light";
  return preference;
}

export function parseThemePreference(storedValue: string | null): Theme {
  return THEMES.find((theme) => theme === storedValue) ?? "system";
}
