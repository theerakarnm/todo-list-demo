/**
 * Where the browser reads a stored image: the owner-checked file route, same
 * origin, so the session cookie goes along. Keys have slashes
 * (`u/<user>/t/<task>/<id>`), which the route reads as one path.
 */
export function fileUrl(r2Key: string) {
  return `/api/files/${r2Key.split("/").map(encodeURIComponent).join("/")}`;
}
