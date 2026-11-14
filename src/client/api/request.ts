import type { ClientResponse } from "hono/client";
import { readJson } from "./request-error";

/**
 * Sends a typed API call and returns its JSON body. An error response throws
 * ApiRequestError with the code from the shared error shape (ARCHITECTURE §5);
 * no answer at all throws fetch's TypeError.
 */
export async function request<T>(call: Promise<ClientResponse<T>>): Promise<T> {
  return (await readJson(await call)) as T;
}
