import type { ClientResponse } from "hono/client";
import type { ApiErrorBody, ErrorCode } from "../../shared/error-codes";

/** A failed API call. `NETWORK` means the request never got an answer. */
export class ApiRequestError extends Error {
  constructor(readonly code: ErrorCode | "NETWORK") {
    super(code);
  }
}

/**
 * Sends a typed API call and returns its JSON body, or throws ApiRequestError
 * with the error code from the shared error shape (ARCHITECTURE §5).
 */
export async function request<T>(call: Promise<ClientResponse<T>>): Promise<T> {
  let response: ClientResponse<T>;
  try {
    response = await call;
  } catch {
    throw new ApiRequestError("NETWORK");
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiRequestError(body?.error?.code ?? "INTERNAL_ERROR");
  }
  return response.json() as Promise<T>;
}
