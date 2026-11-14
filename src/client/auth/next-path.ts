import type { StartPage } from "../../shared/constants";

/** The page a signed-in user lands on (Settings → General → start page). */
export function startPath(startPage: StartPage) {
  return `/app/${startPage}`;
}

/** Login address that comes back to `path` after signing in. */
export function loginPathFor(path: string) {
  return `/login?next=${encodeURIComponent(path)}`;
}

/** Onboarding address that goes on to `path` when it is done. */
export function onboardingPathFor(path: string) {
  return `/onboarding/1?next=${encodeURIComponent(path)}`;
}

function hasControlCharacter(text: string) {
  return [...text].some((character) => {
    const code = character.charCodeAt(0);
    return code <= 0x1f || code === 0x7f;
  });
}

/**
 * `next` only when it is a path on this site. "//host" and "/\\host" are read
 * by browsers as another site, and browsers drop tabs and newlines from URLs
 * ("/\t/host" becomes "//host"), so none of these count.
 */
export function safeNextPath(next: string | null) {
  if (!next?.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || hasControlCharacter(next)) return null;
  return next;
}
