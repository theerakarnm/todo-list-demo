import { queryOptions, useQuery } from "@tanstack/react-query";
import { api } from "../api/client";
import { readJson } from "../api/request-error";

async function fetchMe() {
  const response = await api.api.me.$get();
  if (response.status === 401) return null;
  return readJson(response);
}

/** The signed-in user and their settings, or `null` when nobody is signed in. */
export type Me = NonNullable<Awaited<ReturnType<typeof fetchMe>>>;

export const meQuery = queryOptions({ queryKey: ["me"], queryFn: fetchMe });

export function useMe() {
  return useQuery(meQuery);
}
