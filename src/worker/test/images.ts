import { env } from "cloudflare:test";
import { apiAs } from "./api";
import { newId } from "./ids";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const EXE_SIGNATURE = [0x4d, 0x5a, 0x90, 0x00];

function fileOf(signature: number[], size: number, name: string, type: string) {
  const bytes = new Uint8Array(Math.max(size, signature.length));
  bytes.set(signature);
  return new File([bytes], name, { type });
}

/** A file that starts like a PNG. Only the first bytes are checked, so the rest can be zeros. */
export function pngFile(size = 64) {
  return fileOf(PNG_SIGNATURE, size, "photo.png", "image/png");
}

/** A Windows program renamed to look like a photo. */
export function renamedExeFile() {
  return fileOf(EXE_SIGNATURE, 64, "photo.jpg", "image/jpeg");
}

/** The multipart body of an attachment upload. */
export function attachmentForm(file: File, fields: Record<string, string> = {}) {
  const form = new FormData();
  form.set("file", file);
  for (const [name, value] of Object.entries({ id: newId(), ...fields })) form.set(name, value);
  return form;
}

export async function createTask(userId: string) {
  const id = newId();
  const response = await apiAs(userId).put(`/api/tasks/${id}`, { title: "ใบเสร็จค่าไฟ", position: "a0" });
  if (!response.ok) throw new Error(`Test task was not created: HTTP ${response.status}`);
  return id;
}

type SeedAttachmentOptions = { bytes?: number; deletedAt?: number | null; position?: string };

/** Inserts `count` attachment rows (no R2 objects) under one task in one statement, for limit tests. */
export async function seedAttachments(userId: string, taskId: string, count: number, options: SeedAttachmentOptions = {}) {
  const prefix = crypto.randomUUID();
  const now = Date.now();
  await env.DB.prepare(
    `WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ?1)
     INSERT INTO attachments (id, task_id, user_id, r2_key, mime, bytes, position, created_at, updated_at, deleted_at)
     SELECT ?2 || '-' || i, ?3, ?4, 'u/' || ?4 || '/t/' || ?3 || '/' || ?2 || '-' || i, 'image/webp', ?5, ?6, ?7, ?7, ?8 FROM n`,
  )
    .bind(count, prefix, taskId, userId, options.bytes ?? 1000, options.position ?? "a0", now, options.deletedAt ?? null)
    .run();
}
