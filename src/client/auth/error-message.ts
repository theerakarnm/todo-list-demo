import type { TFunction } from "i18next";
import { ApiRequestError } from "../api/request-error";

/** The Thai text for a failed request: the server's own message, or a network / generic one. */
export function errorMessage(error: unknown, t: TFunction) {
  if (error instanceof ApiRequestError && error.message) return error.message;
  if (error instanceof TypeError) return t("errors.network");
  return t("errors.generic");
}
