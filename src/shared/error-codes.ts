export const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHORIZED",
  "FORBIDDEN",
  "NOT_FOUND",
  "RATE_LIMITED",
  "TURNSTILE_FAILED",
  "TASK_LIMIT",
  "PROJECT_LIMIT",
  "SUBTASK_LIMIT",
  "ATTACHMENT_LIMIT",
  "STORAGE_LIMIT",
  "FILE_TOO_LARGE",
  "UNSUPPORTED_FILE",
  "INTERNAL_ERROR",
] as const;

export type ErrorCode = (typeof ERROR_CODES)[number];

/** The one JSON shape every API error uses. */
export type ApiErrorBody = {
  error: { code: ErrorCode; message: string };
};
