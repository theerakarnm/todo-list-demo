import type { ErrorCode } from "../../shared/error-codes";

/** Better Auth error codes that get their own Thai message. */
const BETTER_AUTH_CODES: Record<string, ErrorCode> = {
  INVALID_EMAIL_OR_PASSWORD: "INVALID_CREDENTIALS",
  // Change password with a wrong current password: a 400, so the client does not treat it as signed out.
  INVALID_PASSWORD: "WRONG_PASSWORD",
  EMAIL_NOT_VERIFIED: "EMAIL_NOT_VERIFIED",
  INVALID_TOKEN: "INVALID_TOKEN",
};

function codeForStatus(status: number): ErrorCode {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 429) return "RATE_LIMITED";
  if (status >= 500) return "INTERNAL_ERROR";
  return "VALIDATION_ERROR";
}

/**
 * The app's error code for a failed Better Auth response, so auth errors use
 * the same `{ error: { code, message } }` shape and Thai text as the rest of the API.
 */
export async function errorCodeForAuthResponse(response: Response): Promise<ErrorCode> {
  const body = await response
    .clone()
    .json<{ code?: string }>()
    .catch(() => ({ code: undefined }));
  return (body.code && BETTER_AUTH_CODES[body.code]) || codeForStatus(response.status);
}
