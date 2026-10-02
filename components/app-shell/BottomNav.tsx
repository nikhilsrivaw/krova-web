"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Inbox, CheckSquare, Menu } from "lucide-react";
import type { Capability } from "@/lib/api";

/**
 * Four tabs, always the same four - Today, Inbox, Approvals, More. Unlike
 * the desktop sidebar (components/shell/AppSidebar.tsx), which adds a
 * nav item per capability, a phone's bottom bar has no room for that:
 * vertical-specific screens (Scheduling, Orders, Queue, ...) live inside
 * "More" instead, gated there the same way the sidebar gates them, so
 * there is still exactly one place (capabilities, from /auth/me) that
 * decides what a business sees - never a second, phone-specific list.
 */
const TABS = [
  { href: "/app/today", label: "Today", icon: Home },
  { href: "/app/inbox", label: "Inbox", icon: Inbox },
  { href: "/app/approvals", label: "Approvals", icon: CheckSquare },
  { href: "/app/more", label: "More", icon: Menu },
] as const;

export function BottomNav({
  pendingCount,
}: {
  capabilities: Capability[];
  pendingCount: number;
}) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-30 bg-os-card border-t border-os-border px-2 pb-[env(safe-area-inset-bottom)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {TABS.map((tab) => {
          const isActive = pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="relative flex flex-col items-center gap-1 py-2.5 transition-colors"
            >
              <div className="relative">
                <Icon
                  className={`w-5 h-5 transition-colors ${
                    isActive ? "text-teal" : "text-os-text-dim"
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.8}
                />
                {tab.href === "/app/approvals" && pendingCount > 0 && (
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
