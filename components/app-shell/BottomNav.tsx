"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, Wallet, CheckSquare, Menu, Sparkles } from "lucide-react";
import type { Capability } from "@/lib/api";
import { appPath } from "@/lib/app-nav";
import { useRole } from "@/lib/useRole";

/**
 * Five tabs, always the same five - Today, Inbox, Ledger, Approvals, More.
 * Ledger gets a permanent tab (not buried in More) because the Commitment
 * Ledger is KROVA's actual core feature, not a vertical add-on - unlike
 * the desktop sidebar (components/shell/AppSidebar.tsx), which adds a nav
 * item per capability, a phone's bottom bar has no room for that:
 * vertical-specific screens (Scheduling, Orders, Queue, ...) live inside
 * "More" instead, gated there the same way the sidebar gates them, so
 * there is still exactly one place (capabilities, from /auth/me) that
 * decides what a business sees - never a second, phone-specific list.
 */
const TABS = [
  { path: "/today", label: "Today", icon: Home },
  { path: "/inbox", label: "Inbox", icon: Inbox },
  { path: "/ledger", label: "Ledger", icon: Wallet },
  { path: "/approvals", label: "Approvals", icon: CheckSquare },
  { path: "/more", label: "More", icon: Menu },
] as const;

// Owner and admins: Ask KROVA takes the middle, as a raised button. Approvals moves into More (and Today's
// "AI replies waiting" card); its count rides on the Today tab instead.
const SUPERVISOR_TABS = [
  { path: "/today", label: "Today", icon: Home },
  { path: "/inbox", label: "Inbox", icon: Inbox },
  { path: "/ask", label: "Ask", icon: Sparkles },
  { path: "/ledger", label: "Ledger", icon: Wallet },
  { path: "/more", label: "More", icon: Menu },
] as const;

export function BottomNav({
  pendingCount,
}: {
  capabilities: Capability[];
  pendingCount: number;
}) {
  const pathname = usePathname();
  const { supervisor } = useRole();
  const tabs = supervisor ? SUPERVISOR_TABS : TABS;
  const badgeOn = supervisor ? "/today" : "/approvals";
  // pathname is whatever the browser actually shows - "/inbox" on the app
  // subdomain (middleware.ts rewrites it server-side, invisibly), "/app/inbox"
  // under the /app/* fallback. Stripping any "/app" prefix before comparing
  // means tab-highlighting works the same under either.
  const strippedPathname = pathname.startsWith("/app") ? pathname.slice(4) || "/" : pathname;
  const normalizedPathname = strippedPathname === "/" ? "/today" : strippedPathname;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-os-card border-t border-os-border px-2 pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="grid grid-cols-5 max-w-md mx-auto">
        {tabs.map((tab) => {
          const isActive = normalizedPathname.startsWith(tab.path);
          const Icon = tab.icon;
          const href = appPath(tab.path);
          if (tab.path === "/ask") {
            return (
              <Link key={tab.path} href={href} aria-label="Ask KROVA" className="relative flex flex-col items-center gap-1 pb-2.5">
                <span className={`-mt-5 w-12 h-12 rounded-full bg-teal flex items-center justify-center shadow-lg shadow-teal/30 ring-4 ring-os-bg ${isActive ? "scale-105" : ""}`}>
                  <Icon className="w-5 h-5 text-os-bg" strokeWidth={2.4} />
                </span>
                <span className={`text-[10px] font-semibold ${isActive ? "text-teal" : "text-os-ink"}`}>Ask KROVA</span>
              </Link>
            );
          }
          return (
            <Link
              key={tab.path}
              href={href}
              className="relative flex flex-col items-center gap-1 py-2.5 transition-colors"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-teal" : "text-os-text-dim"
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                {tab.path === badgeOn && pendingCount > 0 && (
                  <span className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full bg-teal text-os-bg text-[9px] font-bold font-mono flex items-center justify-center">
                    {pendingCount > 9 ? "9+" : pendingCount}
                  </span>
                )}
              </div>
              <span
                className={`text-[10px] font-medium transition-colors ${
                  isActive ? "text-teal" : "text-os-text-dim"
                }`}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-teal" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
