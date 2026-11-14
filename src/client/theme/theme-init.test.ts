import { afterEach, describe, expect, it, vi } from "vitest";
import themeInitScript from "../../../public/theme-init.js?raw";
import { THEMES } from "../../shared/constants";
import { resolveTheme, THEME_STORAGE_KEY } from "./resolve-theme";
import { stubSystemPrefersDark } from "./test-utils";

// public/theme-init.js runs before React to avoid a flash of the wrong theme.
// It cannot import TypeScript, so this test keeps it in step with resolveTheme.
describe("theme-init.js", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  describe.each(THEMES)("with the %s preference", (preference) => {
    it.each([true, false])("matches resolveTheme when the system prefers dark = %s", (systemPrefersDark) => {
      localStorage.setItem(THEME_STORAGE_KEY, preference);
      stubSystemPrefersDark(systemPrefersDark);

      new Function(themeInitScript)();

      expect(document.documentElement.dataset.theme).toBe(resolveTheme(preference, systemPrefersDark));
    });
  });
});
