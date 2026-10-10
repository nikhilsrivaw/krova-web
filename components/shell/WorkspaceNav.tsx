"use client";

import React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

interface WorkspaceNavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: number;
}

const GROUPS = [
  { label: "Workspace", routes: ["/dashboard", "/conversations", "/approvals", "/escalations"] },
  { label: "Channels", routes: ["/whatsapp", "/instagram", "/voice"] },
  { label: "Business", routes: [] as string[] },
  { label: "Intelligence & growth", routes: ["/signals", "/automations", "/campaigns", "/knowledge", "/analytics"] },
  { label: "Manage", routes: ["/team", "/settings"] },
];

/** Groups the shell's already capability-filtered items; it does not decide access. */
export function WorkspaceNav({ items, pathname, onNavigate }: {
  items: WorkspaceNavItem[]; pathname: string; onNavigate?: () => void;
}) {
  return (
    <div className="space-y-5">
      {GROUPS.map((group) => {
        const groupItems = items.filter((item) => group.label === "Business"
          ? !GROUPS.some((other) => other.routes.includes(item.href))
          : group.routes.includes(item.href));
        if (groupItems.length === 0) return null;
        return (
          <div key={group.label}>
            <p className="mb-2 px-3 text-[10px] font-medium uppercase tracking-[0.13em] text-os-text-dim">{group.label}</p>
            <div className="space-y-1">
              {groupItems.map((item) => {
                const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
                const Icon = item.icon;
                return (
                  <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={isActive ? "page" : undefined} className={`group flex min-h-11 items-center justify-between gap-2 rounded-xl border px-3 py-2 text-[13px] font-medium transition-colors ${isActive ? "border-teal/20 bg-teal/[0.09] text-white" : "border-transparent text-os-text-dim hover:bg-white/[0.035] hover:text-white"}`}>
                    <span className="flex min-w-0 items-center gap-3"><Icon className={`h-4 w-4 shrink-0 ${isActive ? "text-teal-bright" : "text-os-text-dim group-hover:text-white"}`} aria-hidden="true" /><span>{item.label}</span></span>
                    <span className="flex shrink-0 items-center gap-1.5">
                      {item.badge !== undefined && <span className={`min-w-5 rounded-md px-1.5 py-0.5 text-center text-[10px] tabular-nums ${item.href === "/escalations" ? "bg-rose-400/10 text-rose-300" : "bg-teal/10 text-teal-bright"}`}>{item.badge}</span>}
                      {isActive && <ChevronRight className="h-3 w-3 text-teal-bright" aria-hidden="true" />}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
