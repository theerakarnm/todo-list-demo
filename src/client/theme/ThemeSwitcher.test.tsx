import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../i18n";
import th from "../i18n/th.json";
import { stubSystemPrefersDark } from "./test-utils";
import { ThemeProvider } from "./ThemeProvider";
import { ThemeSwitcher } from "./ThemeSwitcher";

describe("ThemeSwitcher", () => {
  afterEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("offers light, dark and system, with system selected by default", () => {
    stubSystemPrefersDark(false);
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);

    expect(screen.getByRole("group", { name: th.theme.legend })).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(screen.getByRole<HTMLInputElement>("radio", { name: th.theme.system }).checked).toBe(true);
  });

  it("switches the page to dark when Dark is picked", () => {
    stubSystemPrefersDark(false);
    render(<ThemeProvider><ThemeSwitcher /></ThemeProvider>);

    act(() => screen.getByRole("radio", { name: th.theme.dark }).click());

    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByRole<HTMLInputElement>("radio", { name: th.theme.dark }).checked).toBe(true);
  });
});
