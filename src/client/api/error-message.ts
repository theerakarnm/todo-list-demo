import type { TFunction } from "i18next";
import { LIMITS } from "../../shared/constants";
import th from "../i18n/th.json";
import { ImageFileError } from "../images/image-file-error";
import { ApiRequestError } from "./request-error";

/** An error code that has its own Thai text at `errors.api.<code>` in th.json. */
type ApiMessageCode = keyof typeof th.errors.api;

const formatCount = (count: number) => count.toLocaleString("en-US");
const MEGABYTE = 1024 * 1024;

/** The number shown in each limit message (sizes in MB). */
const LIMIT_FOR: Partial<Record<ApiMessageCode, number>> = {
  TASK_LIMIT: LIMITS.activeTasksPerUser,
  PROJECT_LIMIT: LIMITS.projectsPerUser,
  SUBTASK_LIMIT: LIMITS.subtasksPerTask,
  ATTACHMENT_LIMIT: LIMITS.attachmentsPerTask,
  STORAGE_LIMIT: LIMITS.storageBytesPerUser / MEGABYTE,
  FILE_TOO_LARGE: LIMITS.attachmentBytes / MEGABYTE,
};

function hasApiMessage(code: string): code is ApiMessageCode {
  return Object.hasOwn(th.errors.api, code);
}

/** The Thai text for an error code, with the limit filled in. */
export function errorCodeMessage(t: TFunction, code: ApiMessageCode) {
  const limit = LIMIT_FOR[code];
  return t(`errors.api.${code}`, { limit: limit === undefined ? undefined : formatCount(limit) });
}

/**
 * The Thai text for any failed request: th.json's text for the error code,
 * else the server's own message, else a generic one. No answer at all is a network error.
 */
export function apiErrorMessage(t: TFunction, error: unknown) {
  if (error instanceof TypeError) return t("errors.network");
  if (error instanceof ImageFileError) return errorCodeMessage(t, error.code);
  if (!(error instanceof ApiRequestError)) return t("errors.generic");
  if (error.code && hasApiMessage(error.code)) return errorCodeMessage(t, error.code);
  return error.message || t("errors.generic");
}
