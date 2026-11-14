// Every R2 key of a user starts with their prefix (see ARCHITECTURE.md §16),
// so the file route can check the owner from the key alone and account deletion
// can remove everything with one prefix.

export function userFilesPrefix(userId: string) {
  return `u/${userId}/`;
}

export function attachmentFileKey(userId: string, taskId: string, attachmentId: string) {
  return `${userFilesPrefix(userId)}t/${taskId}/${attachmentId}`;
}
