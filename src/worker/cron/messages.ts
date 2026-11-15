// Thai text in push notifications. The server builds these, so they cannot
// come from the client's i18n file; keep every such string here.

/** Same name the app shows for tasks without a project (th.json nav.inbox). */
export const INBOX_NAME = "กล่องรับงาน";

export const DIGEST_TITLE = "สรุปงานประจำวัน";

export function digestBody(dueToday: number, overdue: number) {
  return `วันนี้มี ${dueToday} งาน · เลยกำหนด ${overdue} งาน`;
}
