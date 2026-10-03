"use client";

import { useEffect, useState } from "react";
import {
  Users, BookOpen, BarChart3, Settings, Siren, LogOut, Sparkles,
  CalendarClock, Scale, Package, FileCheck2, Clock, Building2, FileText,
} from "lucide-react";
import { account, type UserProfile, type Capability } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { appPath, desktopUrl } from "@/lib/app-nav";

type Item = {
  label: string;
  href: string;
  icon: typeof Users;
  requiresCapability?: Capability;
  /** Opens a real screen in this app (appPath) instead of bouncing to the
   * desktop site (desktopUrl) - Ledger moved out of here entirely, it's
   * now a permanent bottom-nav tab since it's the core feature, not a
   * vertical add-on. */
  native?: boolean;
};

// Same capability-gating source as the desktop sidebar
// (components/shell/AppSidebar.tsx) - never a second, phone-specific
// list of what a business can see. The non-native ones open the existing
// desktop pages for now (they already work on a phone's viewport, just
// not redesigned mobile-first yet) rather than duplicating each one here.
const ITEMS: Item[] = [
  { label: "Ask KROVA", href: "/ask", icon: Sparkles, native: true },
  { label: "Escalations", href: "/escalations", icon: Siren, native: true },
  { label: "Customers", href: "/customers", icon: Users, native: true },
  { label: "Scheduling", href: "/scheduling", icon: CalendarClock, requiresCapability: "scheduling" },
  { label: "Orders", href: "/orders", icon: Package, requiresCapability: "order_sync" },
  { label: "Queue", href: "/queue", icon: Clock, requiresCapability: "opd_queue" },
  { label: "Cases", href: "/cases", icon: Scale, requiresCapability: "case_tracking" },
  { label: "Claims", href: "/claims", icon: FileCheck2, requiresCapability: "tpa_claim_tracking" },
  { label: "Quotations", href: "/quotations", icon: FileText, requiresCapability: "quotations" },
  { label: "Properties", href: "/properties", icon: Building2, requiresCapability: "property_listings" },
  { label: "Knowledge & Gaps", href: "/knowledge", icon: BookOpen },
  { label: "Analytics", href: "/analytics", icon: BarChart3 },
  { label: "Settings", href: "/settings", icon: Settings, native: true },
];

export default function MorePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    account.profile().then(setProfile).catch(() => {});
  }, []);

  const visible = ITEMS.filter(
    (item) => !item.requiresCapability || profile?.capabilities.includes(item.requiresCapability)
  );

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-1">More</h1>
      {profile && (
        <p className="text-xs text-os-text-dim mb-5">
          {profile.full_name || profile.email} · {profile.business_name}
        </p>
      )}

      <div className="rounded-2xl bg-os-card border border-os-border overflow-hidden mb-5">
        {visible.map((item, i) => {
          const Icon = item.icon;
          return (
            <a
              key={item.href}
              href={item.native ? appPath(item.href) : desktopUrl(item.href)}
              className={`flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03] transition-colors ${
                i !== visible.length - 1 ? "border-b border-os-border" : ""
              }`}
            >
              <Icon className="w-4 h-4 text-teal shrink-0" />
              <span className="text-sm text-os-ink flex-1">{item.label}</span>
            </a>
          );
        })}
      </div>

      <button
        type="button"
        onClick={() => {
          signOut();
          window.location.href = appPath("/login");
        }}
        className="w-full flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-os-card border border-os-border text-sm font-semibold text-thread-bright active:bg-white/[0.03] transition-colors"
      >
        <LogOut className="w-4 h-4" />
        Sign out
      </button>

      <p className="text-center text-[10px] text-os-text-dim mt-6 mb-4">
        For everything else, open KROVA on a bigger screen.
      </p>
    </div>
  );
}
