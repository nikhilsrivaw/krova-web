import { NextRequest, NextResponse } from "next/server";

/**
 * On the app subdomain, the root goes straight to the app's home. Every other
 * path already lives under /app (appPath() builds them that way everywhere),
 * so nothing is rewritten: a rewrite here used to lose to desktop routes that
 * share a path (/approvals, /login, /ledger), and the desktop page showed up.
 */
const APP_HOSTS = ["app.krova.space"];

function isAppHost(host: string): boolean {
  return APP_HOSTS.includes(host) || host.startsWith("app.localhost");
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host") || "";
  if (!isAppHost(host)) return NextResponse.next();
  if (req.nextUrl.pathname === "/") {
    const url = req.nextUrl.clone();
    url.pathname = "/app/today";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  // Skip Next internals, API routes and static files (anything with a dot).
  matcher: ["/((?!_next|api|.*\..*).*)"],
};
