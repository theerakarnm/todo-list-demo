import type { Context } from "hono";
import { HTTPException } from "hono/http-exception";
import { routePath } from "hono/route";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import { LIMITS } from "../shared/constants";
import type { ApiErrorBody, ErrorCode } from "../shared/error-codes";
import { logError } from "./log";
import type { AppEnv } from "./types";

const formatCount = (count: number) => count.toLocaleString("en-US");
const formatMegabytes = (bytes: number) => `${bytes / 1024 / 1024} MB`;

const ERRORS: Record<ErrorCode, { status: ContentfulStatusCode; message: string }> = {
  VALIDATION_ERROR: { status: 400, message: "ข้อมูลไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" },
  UNAUTHORIZED: { status: 401, message: "กรุณาเข้าสู่ระบบก่อน" },
  FORBIDDEN: { status: 403, message: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" },
  NOT_FOUND: { status: 404, message: "ไม่พบข้อมูลที่ต้องการ" },
  RATE_LIMITED: { status: 429, message: "ส่งคำขอถี่เกินไป กรุณารอสักครู่แล้วลองใหม่" },
  TURNSTILE_FAILED: { status: 400, message: "ยืนยันว่าไม่ใช่บอทไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
  INVALID_CREDENTIALS: { status: 401, message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง ลองอีกครั้งหรือรีเซ็ตรหัสผ่าน" },
  WRONG_PASSWORD: { status: 400, message: "รหัสผ่านปัจจุบันไม่ถูกต้อง" },
  EMAIL_NOT_VERIFIED: { status: 403, message: "กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ เราส่งลิงก์ยืนยันไปที่อีเมลของคุณแล้ว" },
  EMAIL_TAKEN: { status: 409, message: "อีเมลนี้ถูกใช้งานแล้ว · เข้าสู่ระบบแทน" },
  EMAIL_TAKEN_LINE: {
    status: 409,
    message: "อีเมลนี้มีบัญชีที่ใช้ LINE อยู่แล้ว · เข้าสู่ระบบด้วย LINE หรือใช้ \"ลืมรหัสผ่าน\" เพื่อตั้งรหัสผ่าน",
  },
  INVALID_TOKEN: { status: 400, message: "ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว กรุณาขอลิงก์ใหม่" },
  TASK_LIMIT: {
    status: 409,
    message: `มีงานที่ยังไม่เสร็จครบ ${formatCount(LIMITS.activeTasksPerUser)} งานแล้ว กรุณาปิดหรือลบงานเก่าก่อน`,
  },
  PROJECT_LIMIT: {
    status: 409,
    message: `มีโปรเจกต์ครบ ${formatCount(LIMITS.projectsPerUser)} โปรเจกต์แล้ว`,
  },
  SUBTASK_LIMIT: {
    status: 409,
    message: `งานนี้มีงานย่อยครบ ${formatCount(LIMITS.subtasksPerTask)} รายการแล้ว`,
  },
  ATTACHMENT_LIMIT: {
    status: 409,
    message: `แนบรูปได้สูงสุด ${formatCount(LIMITS.attachmentsPerTask)} รูปต่องาน`,
  },
  STORAGE_LIMIT: {
    status: 409,
    message: `พื้นที่เก็บรูปเต็มแล้ว (${formatMegabytes(LIMITS.storageBytesPerUser)})`,
  },
  FILE_TOO_LARGE: {
    status: 413,
    message: `ไฟล์ใหญ่เกิน ${formatMegabytes(LIMITS.attachmentBytes)}`,
  },
  UNSUPPORTED_FILE: { status: 415, message: "รองรับเฉพาะไฟล์รูป JPEG, PNG, WebP หรือ HEIC" },
  INTERNAL_ERROR: { status: 500, message: "เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง" },
};

/** Throw this from any route to answer with the shared error shape. */
export class ApiError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

/** Logged instead of the raw path when no route matched: the path itself may hold a token. */
const UNMATCHED_ROUTE = "<unmatched>";

function errorResponse(c: Context<AppEnv>, code: ErrorCode, route: string) {
  const { status, message } = ERRORS[code];
  logError({
    level: status >= 500 ? "error" : "warn",
    requestId: c.get("requestId"),
    code,
    route,
    method: c.req.method,
    status,
  });
  return c.json<ApiErrorBody>({ error: { code, message } }, status);
}

function errorCodeFor(error: Error): ErrorCode {
  if (error instanceof ApiError) return error.code;
  // Hono's own 400s, e.g. a malformed JSON body in the validator.
  if (error instanceof HTTPException && error.status === 400) return "VALIDATION_ERROR";
  return "INTERNAL_ERROR";
}

export function handleError(error: Error, c: Context<AppEnv>) {
  // The pattern of the route that threw, e.g. "/api/tasks/:id", never the ids in the real path.
  return errorResponse(c, errorCodeFor(error), routePath(c));
}

export function handleNotFound(c: Context<AppEnv>) {
  return errorResponse(c, "NOT_FOUND", UNMATCHED_ROUTE);
}
