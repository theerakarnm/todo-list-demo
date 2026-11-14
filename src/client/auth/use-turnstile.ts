import { useQuery } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../api/client";
import { readJson } from "../api/request-error";

type TurnstileApi = {
  render(container: HTMLElement, options: TurnstileOptions): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
};

type TurnstileOptions = {
  sitekey: string;
  size: "flexible";
  callback: (token: string) => void;
  "expired-callback": () => void;
  "error-callback": () => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let scriptLoaded: Promise<TurnstileApi> | null = null;

/** Loads Cloudflare's Turnstile script once per page. */
function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoaded ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error("Turnstile did not load")));
    script.onerror = () => {
      scriptLoaded = null;
      reject(new Error("Turnstile did not load"));
    };
    document.head.append(script);
  });
  return scriptLoaded;
}

const configQuery = {
  queryKey: ["config"],
  queryFn: async () => readJson(await api.api.config.$get()),
  staleTime: Number.POSITIVE_INFINITY,
};

/**
 * The Turnstile bot check for sign-up and forgot password. Put `containerRef`
 * on an empty element; `token` is set once the visitor passes. A token works
 * only once, so call `reset()` after every failed attempt.
 */
export function useTurnstile() {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const siteKey = useQuery(configQuery).data?.turnstileSiteKey;

  useEffect(() => {
    if (!siteKey) return;
    let removed = false;
    loadTurnstile()
      .then((turnstile) => {
        if (removed || !containerRef.current) return;
        widgetId.current = turnstile.render(containerRef.current, {
          sitekey: siteKey,
          size: "flexible",
          callback: setToken,
          "expired-callback": () => setToken(null),
          "error-callback": () => setToken(null),
        });
      })
      .catch(() => setToken(null));

    return () => {
      removed = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
      widgetId.current = null;
    };
  }, [siteKey]);

  const reset = useCallback(() => {
    setToken(null);
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
  }, []);

  return { containerRef, token, reset };
}
