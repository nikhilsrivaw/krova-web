"use client";

import { useEffect, useState } from "react";
import {
  Users, BarChart3, Settings, Siren, LogOut, CheckSquare, Terminal, ChevronRight,
  CalendarClock, Package, Clock, FileText, LifeBuoy, Zap, UserPlus2, Headphones,
} from "lucide-react";
import { account, type UserProfile, type Capability } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { appPath } from "@/lib/app-nav";

type Item = {
  label: string;
  hint: string;
  href: string;
  icon: typeof Users;
  requiresCapability?: Capability;
  /** Owner and admins only. */
  supervisorOnly?: boolean;
  /** Agents only - owner and admins have it elsewhere (Approvals is in their bottom bar's place of Ask KROVA). */
  agentOnly?: boolean;
};

type Section = { title: string; items: Item[] };

// Same capability-gating source as the desktop sidebar (components/shell/AppSidebar.tsx) - a screen for a feature
// the business has switched off never appears. Every item opens a screen of this app.
const SECTIONS: Section[] = [
  {
    title: "Your day",
    items: [
      { label: "Approvals", hint: "AI replies waiting for you", href: "/approvals", icon: CheckSquare, supervisorOnly: true },
      { label: "Talk to team", hint: "Customers who asked for a person", href: "/talk-to-team", icon: Headphones },
      { label: "Escalations", hint: "Questions the AI could not answer", href: "/escalations", icon: Siren },
      { label: "Customers", hint: "Find anyone by name or number", href: "/customers", icon: Users },
      { label: "Bookings", hint: "Today's appointments", href: "/bookings", icon: CalendarClock, requiresCapability: "scheduling" },
      { label: "Queue", hint: "Walk-in tokens", href: "/queue", icon: Clock, requiresCapability: "opd_queue" },
      { label: "Leads", hint: "New enquiries", href: "/leads", icon: UserPlus2, requiresCapability: "lead_capture" },
      { label: "Orders", hint: "Orders, COD and delivery", href: "/orders", icon: Package, requiresCapability: "order_sync" },
      { label: "Quotations", hint: "Quotes sent and gone quiet", href: "/quotations", icon: FileText, requiresCapability: "quotations" },
    ],
  },
  {
    title: "Your business",
    items: [
      { label: "Business at a glance", hint: "Wallet, money owed, reply speed, team", href: "/business", icon: BarChart3, supervisorOnly: true },
      { label: "Automations", hint: "Switch rules on or off, see what they did", href: "/automations", icon: Zap, supervisorOnly: true },
      { label: "KROVA commands", hint: "Change a setting by typing it", href: "/command", icon: Terminal, supervisorOnly: true },
    ],
  },
  {
    title: "You",
    items: [
      { label: "Settings", hint: "Notifications, your phone, password", href: "/settings", icon: Settings },
      { label: "Help", hint: "KROVA Buddy and support tickets", href: "/help", icon: LifeBuoy, supervisorOnly: true },
    ],
  },
];

const ROLE_LABEL: Record<string, string> = { owner: "Owner", admin: "Admin", agent: "Team member" };

export default function MorePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    account.profile().then(setProfile).catch(() => {});
  }, []);

  const supervisor = profile?.role === "owner" || profile?.role === "admin";
  const allowed = (item: Item) =>
    (!item.requiresCapability || profile?.capabilities.includes(item.requiresCapability)) &&
    (!item.supervisorOnly || supervisor) &&
    (!item.agentOnly || !supervisor);
  const name = profile?.full_name || profile?.email || "";

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-4">More</h1>

      {profile && (
        <div className="flex items-center gap-3 p-3.5 rounded-2xl bg-os-card border border-os-border mb-5">
          <div className="w-11 h-11 rounded-full bg-teal/15 text-teal flex items-center justify-center text-base font-semibold shrink-0">
            {(name.trim()[0] || "?").toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-os-ink truncate">{name}</p>
            <p className="text-xs text-os-text-dim truncate">
              {ROLE_LABEL[profile.role ?? ""] ?? profile.role} · {profile.business_name}
            </p>
          </div>
        </div>
      )}

      {SECTIONS.map((section) => {
        const items = section.items.filter(allowed);
        if (!profile || items.length === 0) return null;
        return (
          <div key={section.title} className="mb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-os-text-dim px-1 mb-2">{section.title}</p>
            <div className="rounded-2xl bg-os-card border border-os-border overflow-hidden divide-y divide-os-border">
              {items.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.href}
                    href={appPath(item.href)}
                    className="flex items-center gap-3 px-4 py-3 active:bg-white/[0.03] transition-colors"
                  >
                    <span className="w-8 h-8 rounded-lg bg-teal/10 flex items-center justify-center shrink-0">
                      <Icon className="w-4 h-4 text-teal" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-os-ink">{item.label}</span>
                      <span className="block text-[11px] text-os-text-dim truncate">{item.hint}</span>
                    </span>
                    <ChevronRight className="w-4 h-4 text-os-text-dim shrink-0" />
                  </a>
                );
              })}
            </div>
          </div>
        );
      })}

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

      <p className="text-center text-[10px] text-os-text-dim mt-6">
        Connecting channels, building automations and campaigns, and billing are on KROVA on a computer.
      </p>
    </div>
  );
}
