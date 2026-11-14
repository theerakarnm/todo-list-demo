import { userFilesPrefix } from "./file-keys";

/** Deletes every R2 object under the user's prefix, one list page (up to 1,000 keys) at a time. */
export async function deleteUserFiles(files: R2Bucket, userId: string) {
  let cursor: string | undefined;
  do {
    const page = await files.list({ prefix: userFilesPrefix(userId), cursor });
    if (page.objects.length > 0) await files.delete(page.objects.map((object) => object.key));
    cursor = page.truncated ? page.cursor : undefined;
  } while (cursor);
}
