import { useEffect } from "react";
import type { Theme } from "../../shared/constants";
import { useTheme } from "../theme/ThemeProvider";

/**
 * The account's theme wins over this device's: it follows the user to every
 * device, and an optimistic change (or its rollback) shows at once.
 */
export function useThemeFromSettings(theme: Theme | undefined) {
  const { setPreference } = useTheme();

  useEffect(() => {
    if (theme) setPreference(theme);
  }, [theme, setPreference]);
}
