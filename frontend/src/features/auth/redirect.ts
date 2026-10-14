export const LOGIN_PATH = "/login";

/** Only allow same-origin, path-relative redirects (prevents open redirects via `?next=`). */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return "/";
  }
  return next;
}

/**
 * Full page load of the login page (optionally remembering where to return to).
 *
 * Deliberately not a client-side transition: it works outside React (from the query cache)
 * and guarantees no data from the ended session stays in memory.
 */
export function goToLogin(next?: string): void {
  const url = next ? `${LOGIN_PATH}?next=${encodeURIComponent(next)}` : LOGIN_PATH;
  window.location.assign(url);
}

/** Send a user whose session is missing or expired to sign in, then back to this page. */
export function redirectToLogin(): void {
  const { pathname, search } = window.location;
  if (pathname === LOGIN_PATH) return;
  goToLogin(`${pathname}${search}`);
}
