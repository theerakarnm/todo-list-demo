import type { ApiErrorBody, ErrorCode } from "../../shared/error-codes";

/** A failed API call: the HTTP status plus the app's error code and Thai message, when the server sent them. */
export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode | null,
    message: string,
  ) {
    super(message);
  }
}

type JsonResponse = { ok: boolean; status: number; json(): Promise<unknown> };

/** The JSON body of a successful response; throws an `ApiRequestError` for an error response. */
export async function readJson<R extends JsonResponse>(response: R): Promise<Awaited<ReturnType<R["json"]>>> {
  if (response.ok) return (await response.json()) as Awaited<ReturnType<R["json"]>>;

  const body = (await response.json().catch(() => null)) as Partial<ApiErrorBody> | null;
  throw new ApiRequestError(response.status, body?.error?.code ?? null, body?.error?.message ?? "");
}
