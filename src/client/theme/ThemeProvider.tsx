import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Theme } from "../../shared/constants";
import { parseThemePreference, type ResolvedTheme, resolveTheme, THEME_STORAGE_KEY } from "./resolve-theme";
import { useSystemPrefersDark } from "./use-system-prefers-dark";

type ThemeContextValue = {
  preference: Theme;
  resolvedTheme: ResolvedTheme;
  setPreference: (preference: Theme) => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference() {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return parseThemePreference(null);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(readStoredPreference);
  const systemPrefersDark = useSystemPrefersDark();
  const resolvedTheme = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  const setPreference = useCallback((nextPreference: Theme) => {
    localStorage.setItem(THEME_STORAGE_KEY, nextPreference);
    setPreferenceState(nextPreference);
  }, []);

  const value = useMemo(
    () => ({ preference, resolvedTheme, setPreference }),
    [preference, resolvedTheme, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside <ThemeProvider>");
  return context;
}
