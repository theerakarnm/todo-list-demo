import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import "./i18n";
import { queryClient } from "./api/query-client";
import { ThemeProvider } from "./theme/ThemeProvider";

/** Everything the screens need around them: theme, server state and i18n. */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </ThemeProvider>
  );
}
