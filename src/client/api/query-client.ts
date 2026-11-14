import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Coming back to the tab refetches, so other devices' changes show up (ARCHITECTURE §6).
      refetchOnWindowFocus: true,
    },
  },
});
