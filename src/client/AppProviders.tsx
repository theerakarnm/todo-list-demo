import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import "./i18n";
import { queryClient } from "./api/query-client";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./toast/ToastProvider";

/** Everything the screens need around them: theme, server state, toasts and i18n. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
