import type { TFunction } from "i18next";
import { LIMITS } from "../../shared/constants";
import type { ErrorCode } from "../../shared/error-codes";
import { ImageFileError } from "../images/image-file-error";
import { ApiRequestError } from "./request-error";

const formatCount = (count: number) => count.toLocaleString("en-US");
const MEGABYTE = 1024 * 1024;

/** The number shown in each limit message (sizes in MB). */
const LIMIT_FOR: Partial<Record<ErrorCode, number>> = {
  TASK_LIMIT: LIMITS.activeTasksPerUser,
  PROJECT_LIMIT: LIMITS.projectsPerUser,
  SUBTASK_LIMIT: LIMITS.subtasksPerTask,
  ATTACHMENT_LIMIT: LIMITS.attachmentsPerTask,
  STORAGE_LIMIT: LIMITS.storageBytesPerUser / MEGABYTE,
  FILE_TOO_LARGE: LIMITS.attachmentBytes / MEGABYTE,
};

/** The Thai text for an error code, with the limit filled in. */
export function errorCodeMessage(t: TFunction, code: ErrorCode) {
  const limit = LIMIT_FOR[code];
  return t(`errors.api.${code}`, { limit: limit === undefined ? undefined : formatCount(limit) });
}

/** The Thai toast text for a failed API call, or for an image refused before upload. */
export function apiErrorMessage(t: TFunction, error: unknown) {
  if (error instanceof TypeError) return t("errors.network");
  if (error instanceof ImageFileError) return errorCodeMessage(t, error.code);
  if (!(error instanceof ApiRequestError) || !error.code) return t("errors.generic");
  return errorCodeMessage(t, error.code);
}
