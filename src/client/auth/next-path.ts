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

/**
 * `next` only when it is a path on this site. "//host" and "/\\host" are read
 * by browsers as another site, so they never count.
 */
export function safeNextPath(next: string | null) {
  if (!next?.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return null;
  return next;
}
