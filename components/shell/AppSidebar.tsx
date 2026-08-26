"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  PhoneCall,
  Users,
  BookOpen,
  CheckSquare,
  BarChart3,
  Settings,
  Send,
  Sparkles,
  ChevronRight,
  LogOut,
  Layers,
  Inbox,
  ShieldCheck,
  Zap,
  CalendarClock,
  Scale,
  Radar,
  Package,
  Building2,
} from "lucide-react";
import { approvals, type AutonomyLevel, type Capability } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { AutonomyPill } from "../ui/AutonomyPill";

interface SidebarProps {
  businessName?: string;
  vertical?: string;
  capabilities?: Capability[];
  autonomy?: AutonomyLevel;
  onAutonomyClick?: () => void;
}

export function AppSidebar({
  businessName = "KROVA Business",
  vertical = "General",
  capabilities = [],
  autonomy = "draft",
  onAutonomyClick,
}: SidebarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await approvals.count();
        if (mounted && res && typeof res.pending === "number") {
          setPendingCount(res.pending);
        }
      } catch {
        // quiet fallback
      }
    };
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  type NavItem = {
    label: string;
    href: string;
    icon: typeof LayoutDashboard;
    accent?: string;
    shortcut?: string;
    badge?: number;
    badgeColor?: string;
    requiresCapability?: Capability;
  };

  const ALL_NAV_ITEMS: NavItem[] = [
    {
      label: "Command Center",
      href: "/dashboard",
      icon: LayoutDashboard,
      shortcut: "G D",
    },
    {
      label: "Conversations",
      href: "/conversations",
      icon: Inbox,
      shortcut: "G C",
    },
    {
      label: "Approvals",
      href: "/approvals",
      icon: CheckSquare,
      badge: pendingCount > 0 ? pendingCount : undefined,
      badgeColor: "bg-brass text-[#14151F] font-mono font-bold",
      shortcut: "G A",
    },
    {
      label: "WhatsApp",
      href: "/whatsapp",
      icon: MessageSquare,
      accent: "text-seal-bright",
      shortcut: "G W",
    },
    {
      label: "Voice Agent",
      href: "/voice",
      icon: PhoneCall,
      accent: "text-cyan-400",
      shortcut: "G V",
    },
    // Vertical-specific tools, only shown when the business's own
    // capabilities include them - never hardcoded per vertical key, always
    // read from what /auth/me actually declared.
    {
      label: "Scheduling",
      href: "/scheduling",
      icon: CalendarClock,
      accent: "text-brass-bright",
      requiresCapability: "scheduling",
      shortcut: "G H",
    },
    {
      label: "Cases",
      href: "/cases",
      icon: Scale,
      accent: "text-brass-bright",
      requiresCapability: "case_tracking",
      shortcut: "G X",
    },
    {
      label: "Signals",
      href: "/signals",
      icon: Radar,
      accent: "text-brass-bright",
      requiresCapability: "product_feedback",
      shortcut: "G I",
    },
    {
      label: "Orders",
      href: "/orders",
      icon: Package,
      accent: "text-brass-bright",
      requiresCapability: "order_sync",
      shortcut: "G O",
    },
    {
      label: "Properties",
      href: "/properties",
      icon: Building2,
      accent: "text-brass-bright",
      requiresCapability: "property_listings",
      shortcut: "G P",
    },
    {
      label: "Commitment Ledger",
      href: "/ledger",
      icon: Layers,
      shortcut: "G L",
    },
    {
      label: "Customers",
      href: "/customers",
      icon: Users,
      shortcut: "G U",
    },
    {
      label: "Campaigns",
      href: "/campaigns",
      icon: Send,
      shortcut: "G M",
    },
    {
      label: "Knowledge & Gaps",
      href: "/knowledge",
      icon: BookOpen,
      shortcut: "G K",
    },
    {
      label: "Analytics",
      href: "/analytics",
      icon: BarChart3,
      shortcut: "G Y",
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      shortcut: "G S",
    },
  ];

  const NAV_ITEMS = ALL_NAV_ITEMS.filter(
    (item) => !item.requiresCapability || capabilities.includes(item.requiresCapability),
  );

  return (
    <aside className="w-64 shrink-0 h-screen bg-os-bg border-r border-os-border flex flex-col justify-between select-none z-30 sticky top-0">
      {/* Top Brand & Workspace Header */}
      <div>
        <div className="p-4 border-b border-os-border flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5 group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brass-bright via-brass to-brass-dim flex items-center justify-center shadow-lg shadow-brass/20 border border-white/10 transition-transform group-hover:scale-105">
              <Sparkles className="w-4 h-4 text-[#14151F]" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-serif font-semibold text-sm text-os-ink tracking-tight">
                  KROVA
                </span>
                <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-os-text-dim border border-os-border">
                  OS
                </span>
              </div>
              <p className="text-[11px] text-os-text-dim truncate max-w-[130px]">
                {businessName}
              </p>
            </div>
          </Link>
        </div>

        {/* Autonomy Status Bar */}
        <div className="px-4 py-2.5 bg-black/20 border-b border-os-border/60 flex items-center justify-between">
          <span className="text-[10px] uppercase font-mono text-os-text-dim tracking-wider">
            Agent Mode
          </span>
          <AutonomyPill
            level={autonomy}
            onClick={onAutonomyClick}
            interactive={true}
            size="sm"
          />
        </div>

        {/* Navigation List */}
        <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]">
          {NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all border-l-2 ${
                  isActive
                    ? "bg-white/[0.06] text-os-ink font-semibold border-l-brass"
                    : "text-os-text-dim hover:text-os-ink hover:bg-white/[0.03] border-l-transparent"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive
                        ? "text-white"
                        : item.accent || "text-os-text-dim group-hover:text-white"
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                <div className="flex items-center gap-1.5">
                  {item.badge !== undefined && (
                    <span
                      className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold min-w-[18px] text-center ${
                        item.badgeColor || "bg-white/20 text-white"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && (
                    <ChevronRight className="w-3 h-3 text-white/60" />
                  )}
                </div>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom Footer User/SignOut */}
      <div className="p-3 border-t border-white/[0.06] bg-[#0A0E17]/60">
        <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]">
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white/80 shrink-0">
              {businessName.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-medium text-white truncate">
                {businessName}
              </p>
              <p className="text-[10px] font-mono text-os-text-dim capitalize truncate">
                {vertical} Vertical
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              signOut();
              window.location.href = "/login";
            }}
            title="Sign Out"
            className="p-1.5 rounded-md text-os-text-dim hover:text-thread-bright hover:bg-thread/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
