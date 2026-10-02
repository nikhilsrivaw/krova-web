/**
 * Path helper for the KROVA app shell (app/app/*), which now runs at two
 * different places: the dedicated app.krova.space subdomain (clean paths,
 * "/today", "/inbox/<id>") via middleware.ts's rewrite, and the fallback
 * /app/* prefix on the main site for local dev or whenever the subdomain
 * isn't configured yet. Every Link/redirect inside the app shell should go
 * through appPath() rather than hardcoding one or the other, so the same
 * code works on both without a build-time branch.
 */

const APP_SUBDOMAIN_HOSTS = ["app.krova.space"];

export function isAppSubdomain(hostname?: string): boolean {
  const host = hostname ?? (typeof window !== "undefined" ? window.location.hostname : "");
  return APP_SUBDOMAIN_HOSTS.includes(host) || host.startsWith("app.localhost");
}

/** path must start with "/" and be relative to the app shell's own root, e.g. "/today", "/inbox/abc123". */
export function appPath(path: string): string {
  return isAppSubdomain() ? path : `/app${path}`;
}

/**
 * A link to a desktop-only page (e.g. /ledger, /customers) from inside the
 * app shell. On the main site a relative href is enough - same origin, no
 * rewrite in the way. On the app subdomain, "/ledger" would hit
 * middleware.ts's rewrite (-> /app/ledger, which doesn't exist) rather than
 * reach the real page, so it needs to be a full URL back to the main site.
 */
export function desktopUrl(path: string): string {
  return isAppSubdomain() ? `https://www.krova.space${path}` : path;
}
