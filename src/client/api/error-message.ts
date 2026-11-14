import type { TFunction } from "i18next";
import { LIMITS } from "../../shared/constants";
import type { ErrorCode } from "../../shared/error-codes";
import { ApiRequestError } from "./request";

const formatCount = (count: number) => count.toLocaleString("en-US");

/** The number shown in each limit message. */
const LIMIT_FOR: Partial<Record<ErrorCode, number>> = {
  TASK_LIMIT: LIMITS.activeTasksPerUser,
  PROJECT_LIMIT: LIMITS.projectsPerUser,
  SUBTASK_LIMIT: LIMITS.subtasksPerTask,
  ATTACHMENT_LIMIT: LIMITS.attachmentsPerTask,
};

/** The Thai toast text for a failed API call. */
export function apiErrorMessage(t: TFunction, error: unknown) {
  if (!(error instanceof ApiRequestError)) return t("errors.generic");
  if (error.code === "NETWORK") return t("errors.network");
  const limit = LIMIT_FOR[error.code];
  return t(`errors.api.${error.code}`, { limit: limit === undefined ? undefined : formatCount(limit) });
}
