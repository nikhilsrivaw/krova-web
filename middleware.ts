import { NextRequest, NextResponse } from "next/server";

/**
 * Serves the KROVA app shell (app/app/*) at its own subdomain with clean
 * paths - app.krova.space/inbox, not app.krova.space/app/inbox - while the
 * actual routes stay at /app/* on disk. A request to the apex/www domain is
 * untouched (the full marketing site + desktop OS lives there, unchanged);
 * a request to the app subdomain gets its pathname rewritten to /app/* on
 * the way to Next's router, invisibly, so the browser's own address bar
 * keeps showing the clean path. See lib/app-nav.ts's appPath() for the
 * client-side half of this (building links that work on both).
 */
const APP_HOSTS = ["app.krova.space"];

function isAppHost(host: string): boolean {
  return APP_HOSTS.includes(host) || host.startsWith("app.localhost");
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!isAppHost(host)) return NextResponse.next();

  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/app")) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = pathname === "/" ? "/app/today" : `/app${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  // Skip Next internals, API routes and anything that looks like a static
  // file (has a dot - icons, manifest, the service worker itself) - those
  // must keep resolving from the real public/ root on the app subdomain too.
  matcher: ["/((?!_next|api|.*\\..*).*)"],
};
