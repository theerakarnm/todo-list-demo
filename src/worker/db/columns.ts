import { getTableColumns } from "drizzle-orm";
import { attachments, projects, subtasks, tasks } from "./schema";

// The columns the API returns: everything except user_id, which the client never needs.

function withoutUserId<Columns extends { userId: unknown }>(columns: Columns): Omit<Columns, "userId"> {
  const { userId: _userId, ...publicColumns } = columns;
  return publicColumns;
}

export const taskColumns = withoutUserId(getTableColumns(tasks));
export const projectColumns = withoutUserId(getTableColumns(projects));
export const subtaskColumns = withoutUserId(getTableColumns(subtasks));
export const attachmentColumns = withoutUserId(getTableColumns(attachments));
