import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { THEME_STORAGE_KEY } from "./resolve-theme";
import { stubSystemPrefersDark } from "./test-utils";
import { ThemeProvider, useTheme } from "./ThemeProvider";

function ThemeProbe() {
  const { preference, setPreference } = useTheme();
  return (
    <button type="button" onClick={() => setPreference("dark")}>
      {preference}
    </button>
  );
}

describe("ThemeProvider", () => {
  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
    vi.unstubAllGlobals();
  });

  it("starts from the stored preference and applies it to <html>", () => {
    stubSystemPrefersDark(true);
    localStorage.setItem(THEME_STORAGE_KEY, "light");

    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    expect(screen.getByRole("button").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("saves a new preference on this device", () => {
    stubSystemPrefersDark(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);

    act(() => screen.getByRole("button").click());

    expect(localStorage.getItem(THEME_STORAGE_KEY)).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("follows the system setting live when the preference is system", () => {
    const system = stubSystemPrefersDark(false);
    render(<ThemeProvider><ThemeProbe /></ThemeProvider>);
    expect(document.documentElement.dataset.theme).toBe("light");

    act(() => system.setSystemPrefersDark(true));

    expect(document.documentElement.dataset.theme).toBe("dark");
  });
});
