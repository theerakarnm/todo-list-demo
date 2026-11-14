import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { request } from "../api/request";

/** How long typing must pause before Search asks the server. */
const DEBOUNCE_MS = 200;

function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

/** GET /api/search for what the user typed, once they pause. Old results stay up while new ones load. */
export function useSearchResults(text: string) {
  const query = useDebouncedValue(text.trim(), DEBOUNCE_MS);
  const results = useQuery({
    queryKey: ["search", query],
    queryFn: () => request(api.api.search.$get({ query: { q: query } })),
    enabled: query !== "",
    placeholderData: keepPreviousData,
  });
  return { query, results: query ? results.data : undefined };
}
