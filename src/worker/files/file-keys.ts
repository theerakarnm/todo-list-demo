// Every R2 key of a user starts with their prefix (see ARCHITECTURE.md §16),
// so the file route can check the owner from the key alone and account deletion
// can remove everything with one prefix.

export function userFilesPrefix(userId: string) {
  return `u/${userId}/`;
}

export function attachmentFileKey(userId: string, taskId: string, attachmentId: string) {
  return `${userFilesPrefix(userId)}t/${taskId}/${attachmentId}`;
}

/** A new key for every photo, so a browser never shows a cached old one. */
export function newAvatarFileKey(userId: string) {
  return `${userFilesPrefix(userId)}avatar/${crypto.randomUUID()}`;
}
