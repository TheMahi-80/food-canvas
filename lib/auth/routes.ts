/** Pure routing rules for /admin, shared by proxy.ts and the login flow. */
export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/login";

/**
 * Only same-site paths under /admin are accepted as a post-login destination
 * (prevents open redirects such as //evil.com or /admin/../ tricks).
 */
export function safeAdminNext(next: string | null | undefined): string {
  if (!next || next.length > 200) return ADMIN_HOME;
  if (!/^\/admin(\/[A-Za-z0-9\-_/]*)?(\?[A-Za-z0-9\-_=&%]*)?$/.test(next)) return ADMIN_HOME;
  if (next.includes("//") || next.includes("..") || next.startsWith(ADMIN_LOGIN)) return ADMIN_HOME;
  return next;
}

export type AdminRouteDecision = { type: "allow" } | { type: "redirect"; to: string };

/**
 * Proxy-level gate (first layer). Without a valid session every /admin page except the login page
 * redirects to login. Admin *status* is checked again by every page and every mutation on the
 * server, and enforced by RLS in the database.
 */
export function adminRouteDecision(pathname: string, search: string, hasSession: boolean): AdminRouteDecision {
  const isLogin = pathname === ADMIN_LOGIN || pathname.startsWith(`${ADMIN_LOGIN}/`);
  if (isLogin || hasSession) return { type: "allow" };
  const next = safeAdminNext(`${pathname}${search}`);
  return { type: "redirect", to: next === ADMIN_HOME ? ADMIN_LOGIN : `${ADMIN_LOGIN}?next=${encodeURIComponent(next)}` };
}
