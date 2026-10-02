"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { account, approvals, type UserProfile } from "@/lib/api";
import { isSignedIn, clearSession } from "@/lib/auth";
import { appPath, isAppSubdomain } from "@/lib/app-nav";
import { BottomNav } from "@/components/app-shell/BottomNav";
import { AppTopBar } from "@/components/app-shell/AppTopBar";

/**
 * Shell for the installable KROVA app - its own self-contained product
 * (separate from the desktop OS, components/shell/AppLayout.tsx) that
 * serves at the app.krova.space subdomain with a /app/* fallback on the
 * main site. Same auth/capabilities source (GET /auth/me), but a
 * mobile-first shell - bottom tab bar instead of a sidebar, one screen at
 * a time, and screens that render their own data in place (the inbox's
 * thread view, approvals) rather than ever bouncing out to a desktop page.
 * appPath()'s login route is the one route here that doesn't need a session.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === appPath("/login") || pathname === "/app/login" || pathname === "/login";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [onSubdomain, setOnSubdomain] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await account.profile();
      setProfile(data);
    } catch {
      clearSession();
      router.replace(appPath("/login"));
      return;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    setOnSubdomain(isAppSubdomain());
    // Register the app-scoped service worker once - manifest + SW together
    // are what make a browser offer "Install" at all. Scope matches
    // whichever manifest is linked below (public/app-manifest.json vs
    // -root.json), so "installed from here" always controls exactly the
    // paths this shell actually serves.
    if ("serviceWorker" in navigator) {
      const scope = isAppSubdomain() ? "/" : "/app/";
      navigator.serviceWorker.register("/sw-app.js", { scope }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoginRoute) {
      setIsLoading(false);
      return;
    }
    if (!isSignedIn()) {
      router.replace(appPath("/login"));
      return;
    }
    load();
  }, [isLoginRoute, load, router]);

  useEffect(() => {
    if (isLoginRoute || !profile) return;
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await approvals.count();
        if (mounted && res) setPendingCount(res.pending);
      } catch {
        /* quiet */
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 20000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isLoginRoute, profile]);

  const manifestHref = onSubdomain ? "/app-manifest-root.json" : "/app-manifest.json";

  if (isLoginRoute) {
    return (
      <div className="app-shell-pure-black min-h-screen bg-os-bg">
        <link rel="manifest" href={manifestHref} />
        {children}
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="app-shell-pure-black min-h-screen bg-os-bg flex items-center justify-center">
        <link rel="manifest" href={manifestHref} />
        <div className="h-7 w-7 rounded-full border-2 border-os-border border-t-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="app-shell-pure-black min-h-screen bg-os-bg flex flex-col">
      <link rel="manifest" href={manifestHref} />
      <AppTopBar businessName={profile.business_name || "KROVA"} />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav capabilities={profile.capabilities} pendingCount={pendingCount} />
    </div>
  );
}
