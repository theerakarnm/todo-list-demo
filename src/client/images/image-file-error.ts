import type { ErrorCode } from "../../shared/error-codes";

/**
 * A picked file the browser refuses before uploading it, with the same code
 * the server would answer, so the toast shows the same Thai message.
 */
export class ImageFileError extends Error {
  constructor(readonly code: Extract<ErrorCode, "UNSUPPORTED_FILE" | "FILE_TOO_LARGE">) {
    super(code);
  }
}
