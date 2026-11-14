import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UpdateSettingsInput } from "../../shared/schemas/settings";
import { api } from "../api/client";
import { readJson } from "../api/request-error";
import { meQuery } from "../auth/use-me";

/**
 * PATCH /api/settings, optimistic: the cached settings change first, so the
 * whole app shows the change at once; a refused change puts the old settings back.
 */
export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (changes: UpdateSettingsInput) => readJson(await api.api.settings.$patch({ json: changes })),
    onMutate: async (changes) => {
      await queryClient.cancelQueries({ queryKey: meQuery.queryKey });
      const before = queryClient.getQueryData(meQuery.queryKey);
      queryClient.setQueryData(meQuery.queryKey, (me) => me && { ...me, settings: { ...me.settings, ...changes } });
      return { before };
    },
    onError: (_error, _changes, context) => {
      if (context?.before) queryClient.setQueryData(meQuery.queryKey, context.before);
    },
    onSuccess: ({ settings }) => {
      queryClient.setQueryData(meQuery.queryKey, (me) => (me && settings ? { ...me, settings } : me));
    },
  });
}
