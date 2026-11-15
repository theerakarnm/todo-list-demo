import { describe, expect, it, vi } from "vitest";
import { ERROR_CODES, type ErrorCode } from "../../shared/error-codes";
import i18n from "../i18n";
import th from "../i18n/th.json";
import { ImageFileError } from "../images/image-file-error";
import { apiErrorMessage } from "./error-message";
import { ApiRequestError } from "./request-error";

const t = i18n.t;
const LIMIT_CODES: ErrorCode[] = [
  "TASK_LIMIT",
  "PROJECT_LIMIT",
  "SUBTASK_LIMIT",
  "ATTACHMENT_LIMIT",
  "STORAGE_LIMIT",
  "FILE_TOO_LARGE",
];
const apiMessages: Record<string, string> = th.errors.api;

describe("th.json errors.api", () => {
  it.each(ERROR_CODES)("has Thai text for %s", (code) => {
    expect(apiMessages[code]?.trim()).toBeTruthy();
  });

  it.each(LIMIT_CODES)("puts the limit into the %s text", (code) => {
    expect(apiMessages[code]).toContain("{{limit}}");
  });
});

describe("apiErrorMessage", () => {
  it("shows the th.json text for a known code, not the server's message", () => {
    const error = new ApiRequestError(401, "INVALID_CREDENTIALS", "server text");
    expect(apiErrorMessage(t, error)).toBe(th.errors.api.INVALID_CREDENTIALS);
  });

  it("fills the limit into a limit code's text", () => {
    const error = new ApiRequestError(409, "TASK_LIMIT", "server text");
    expect(apiErrorMessage(t, error)).toBe("มีงานที่ยังไม่เสร็จครบ 1,000 งานแล้ว กรุณาปิดหรือลบงานเก่าก่อน");
  });

  it("formats the limit number with the th-TH locale", () => {
    const spy = vi.spyOn(Number.prototype, "toLocaleString");
    try {
      const error = new ApiRequestError(409, "TASK_LIMIT", "server text");
      const message = apiErrorMessage(t, error);
      expect(spy).toHaveBeenCalledWith("th-TH");
      expect(message).toContain("1,000");
    } finally {
      spy.mockRestore();
    }
  });

  it("shows the th.json text for an image refused before upload", () => {
    expect(apiErrorMessage(t, new ImageFileError("UNSUPPORTED_FILE"))).toBe(th.errors.api.UNSUPPORTED_FILE);
  });

  it("shows the server's message for a code th.json does not know", () => {
    const error = new ApiRequestError(400, "NEW_CODE" as ErrorCode, "ข้อความจากเซิร์ฟเวอร์");
    expect(apiErrorMessage(t, error)).toBe("ข้อความจากเซิร์ฟเวอร์");
  });

  it("shows the server's message when there is no code", () => {
    expect(apiErrorMessage(t, new ApiRequestError(502, null, "ข้อความจากเซิร์ฟเวอร์"))).toBe("ข้อความจากเซิร์ฟเวอร์");
  });

  it("shows the generic text when there is no code and no message", () => {
    expect(apiErrorMessage(t, new ApiRequestError(502, null, ""))).toBe(th.errors.generic);
  });

  it("shows the generic text for an error that is not from the API", () => {
    expect(apiErrorMessage(t, new Error("boom"))).toBe(th.errors.generic);
  });

  it("shows the network text when the request never got an answer", () => {
    expect(apiErrorMessage(t, new TypeError("Failed to fetch"))).toBe(th.errors.network);
  });
});
