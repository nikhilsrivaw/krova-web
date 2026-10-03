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
  return `/app${path}`;
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

/**
 * The link a person should open on their phone to install the app -
 * app.krova.space once that subdomain is added in Vercel/DNS, falling back
 * to this origin's /app path otherwise (local dev, or before the subdomain
 * is live). Same logic app/mobile/page.tsx uses for its own install link -
 * kept here so the sidebar's "Get the App" panel doesn't duplicate it.
 */
export function installUrl(): string {
  if (typeof window === "undefined") return "";
  const { hostname, origin } = window.location;
  return hostname === "krova.space" || hostname === "www.krova.space"
    ? "https://app.krova.space"
    : `${origin}/app`;
}
