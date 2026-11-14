import { type Mock, vi } from "vitest";

type RenderOptions = { sitekey: string; callback: (token: string) => void };

type FakeTurnstile = {
  turnstile: { render: Mock; reset: Mock; remove: Mock };
  siteKey: string | undefined;
  solve(token: string): void;
};

/** Stands in for Cloudflare's `window.turnstile`, so the widget renders without loading the real script. */
export function stubTurnstile(): FakeTurnstile {
  let options: RenderOptions | null = null;
  const turnstile = {
    render: vi.fn((_container: HTMLElement, renderOptions: RenderOptions) => {
      options = renderOptions;
      return "widget-1";
    }),
    reset: vi.fn(),
    remove: vi.fn(),
  };
  vi.stubGlobal("turnstile", turnstile);

  return {
    turnstile,
    get siteKey() {
      return options?.sitekey;
    },
    /** The visitor passes the challenge. */
    solve(token: string) {
      options?.callback(token);
    },
  };
}
