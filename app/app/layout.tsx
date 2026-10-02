"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { account, approvals, type UserProfile } from "@/lib/api";
import { isSignedIn, clearSession } from "@/lib/auth";
import { BottomNav } from "@/components/app-shell/BottomNav";
import { AppTopBar } from "@/components/app-shell/AppTopBar";

/**
 * Shell for the installable KROVA app (scope /app/) - the PWA the
 * marketing page at /mobile promises. Separate layout from the desktop
 * OS (components/shell/AppLayout.tsx): same auth/capabilities source
 * (GET /auth/me), but a mobile-first shell - bottom tab bar instead of a
 * sidebar, one screen at a time instead of a dense multi-column desktop
 * view. /app/login is the one route here that doesn't need a session.
 */
export default function AppShellLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isLoginRoute = pathname === "/app/login";

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const data = await account.profile();
      setProfile(data);
    } catch {
      clearSession();
      router.replace("/app/login");
      return;
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    // Register the app-scoped service worker once - manifest + SW together
    // are what make a browser offer "Install" at all.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw-app.js", { scope: "/app/" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (isLoginRoute) {
      setIsLoading(false);
      return;
    }
    if (!isSignedIn()) {
      router.replace("/app/login");
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

  if (isLoginRoute) {
    return (
      <div className="min-h-screen bg-os-bg">
        <link rel="manifest" href="/app-manifest.json" />
        {children}
      </div>
    );
  }

  if (isLoading || !profile) {
    return (
      <div className="min-h-screen bg-os-bg flex items-center justify-center">
        <link rel="manifest" href="/app-manifest.json" />
        <div className="h-7 w-7 rounded-full border-2 border-os-border border-t-teal animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-os-bg flex flex-col">
      <link rel="manifest" href="/app-manifest.json" />
      <AppTopBar businessName={profile.business_name || "KROVA"} />
      <main className="flex-1 overflow-y-auto pb-20">{children}</main>
      <BottomNav capabilities={profile.capabilities} pendingCount={pendingCount} />
    </div>
  );
}
