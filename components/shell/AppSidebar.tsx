"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  MessageSquare,
  Instagram,
  PhoneCall,
  Users,
  UserPlus,
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
  FileText,
  Boxes,
  Building2,
  Clock,
  FileCheck2,
  Siren,
  Smartphone,
  ClipboardList,
  Wallet,
  X,
} from "lucide-react";
import { approvals, escalations, type AutonomyLevel, type Capability } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { AutonomyPill } from "../ui/AutonomyPill";
import { GetAppModal } from "./GetAppModal";
import { WorkspaceNav } from "./WorkspaceNav";

interface SidebarProps {
  appearance?: "default" | "refined";
  navigationOpen?: boolean;
  onCloseNavigation?: () => void;
  businessName?: string;
  vertical?: string;
  capabilities?: Capability[];
  /** The signed-in person's role; owner-only areas are hidden from anyone else. */
  role?: "owner" | "admin" | "agent" | null;
  autonomy?: AutonomyLevel;
  onAutonomyClick?: () => void;
}

export function AppSidebar({
  appearance = "default",
  navigationOpen = false,
  onCloseNavigation,
  businessName = "KROVA Business",
  vertical = "General",
  capabilities = [],
  role = null,
  autonomy = "draft",
  onAutonomyClick,
}: SidebarProps) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [openEscalationCount, setOpenEscalationCount] = useState<number>(0);
  const [isGetAppOpen, setIsGetAppOpen] = useState(false);

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

  useEffect(() => {
    let mounted = true;
    const fetchCount = async () => {
      try {
        const res = await escalations.count();
        if (mounted && res && typeof res.open === "number") {
          setOpenEscalationCount(res.open);
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
    // A single capability, or any-of a list - the Signals item needs the
    // latter (product_feedback OR care_recall, two different verticals'
    // reasons to see the same page).
    requiresCapability?: Capability | Capability[];
    // Hidden from everyone but these roles - the matching API routes refuse anyone else.
    requiresRole?: Array<"owner" | "admin">;
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
      label: "Instagram",
      href: "/instagram",
      icon: Instagram,
      accent: "text-pink-400",
      shortcut: "G N",
    },
    {
      label: "Voice Agent",
      href: "/voice",
      icon: PhoneCall,
      accent: "text-cyan-400",
      shortcut: "G V",
    },
    {
      label: "Automations",
      href: "/automations",
      requiresRole: ["owner", "admin"],
      icon: Zap,
      accent: "text-cyan-400",
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
      // No capability gate since 2026-09-25: every business now gets the
      // conversation signals (complaint, churn risk, praise, competitor
      // mentions - see shared/ai/signals.py), so there is always something
      // this page can show.
      shortcut: "G I",
    },
    {
      label: "Escalations",
      href: "/escalations",
      icon: Siren,
      accent: "text-brass-bright",
      badge: openEscalationCount > 0 ? openEscalationCount : undefined,
      badgeColor: "bg-rose-500 text-white font-mono font-bold",
      shortcut: "G E",
    },
    {
      label: "Queue",
      href: "/queue",
      icon: Clock,
      accent: "text-brass-bright",
      requiresCapability: "opd_queue",
      shortcut: "G Q",
    },
    {
      label: "Claims",
      href: "/claims",
      icon: FileCheck2,
      accent: "text-brass-bright",
      requiresCapability: "tpa_claim_tracking",
      shortcut: "G T",
    },
    {
      label: "Quotations",
      href: "/quotations",
      icon: FileText,
      accent: "text-brass-bright",
      requiresCapability: "quotations",
      shortcut: "G U",
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
      label: "Catalogue",
      href: "/products",
      icon: Boxes,
      accent: "text-brass-bright",
      requiresCapability: "order_sync",
      shortcut: "G C",
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
      label: "Leads",
      href: "/leads",
      icon: UserPlus,
      accent: "text-brass-bright",
    },
    {
      label: "Forms",
      href: "/forms",
      icon: ClipboardList,
      accent: "text-brass-bright",
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
      requiresRole: ["owner", "admin"],
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
      requiresRole: ["owner", "admin"],
      icon: BarChart3,
      shortcut: "G Y",
    },
    {
      label: "Billing",
      href: "/billing",
      icon: Wallet,
      requiresRole: ["owner", "admin"],
    },
    {
      label: "Team",
      href: "/team",
      icon: Users,
      requiresRole: ["owner", "admin"],
    },
    {
      label: "Settings",
      href: "/settings",
      icon: Settings,
      shortcut: "G S",
    },
  ];

  const NAV_ITEMS = ALL_NAV_ITEMS.filter((item) => {
    if (item.requiresRole && !(role && item.requiresRole.includes(role as "owner" | "admin"))) return false;
    if (!item.requiresCapability) return true;
    const required = Array.isArray(item.requiresCapability) ? item.requiresCapability : [item.requiresCapability];
    return required.some((cap) => capabilities.includes(cap));
  });

  return (
    <>
    <aside id={appearance === "refined" ? "workspace-navigation" : undefined} role={appearance === "refined" && navigationOpen ? "dialog" : undefined} aria-modal={appearance === "refined" && navigationOpen ? true : undefined} aria-label={appearance === "refined" ? "Workspace navigation" : undefined} className={appearance === "refined" ? `fixed inset-y-0 left-0 z-[60] flex h-dvh w-[280px] max-w-[calc(100vw-32px)] shrink-0 select-none flex-col justify-between border-r border-white/[0.08] bg-[#0E0E0E] transition-[transform,visibility] duration-200 motion-reduce:transition-none lg:sticky lg:top-0 lg:z-30 lg:w-60 lg:translate-x-0 lg:visible ${navigationOpen ? "visible translate-x-0" : "invisible -translate-x-full"}` : "w-64 shrink-0 h-screen bg-os-bg border-r border-os-border flex flex-col justify-between select-none z-30 sticky top-0"}>
      {/* Top Brand & Workspace Header */}
      <div className={appearance === "refined" ? "flex min-h-0 flex-1 flex-col" : ""}>
        <div className={appearance === "refined" ? "flex min-h-[72px] shrink-0 items-center justify-between border-b border-white/[0.07] px-5" : "p-4 border-b border-os-border flex items-center justify-between"}>
          <Link href="/dashboard" onClick={appearance === "refined" ? onCloseNavigation : undefined} className="flex items-center gap-2.5 group">
            {appearance === "refined" ? <Image src="/logo-mark.svg" alt="KROVA" width={34} height={34} /> : <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brass-bright via-brass to-brass-dim flex items-center justify-center shadow-lg shadow-brass/20 border border-white/10 transition-transform group-hover:scale-105"><Sparkles className="w-4 h-4 text-[#14151F]" /></div>}
            <div>
              <div className="flex items-center gap-1.5">
                <span className={appearance === "refined" ? "font-serif text-lg font-semibold tracking-tight text-os-ink" : "font-serif font-semibold text-sm text-os-ink tracking-tight"}>
                  KROVA
                </span>
                <span className={appearance === "refined" ? "text-[9px] tracking-widest text-os-text-dim" : "text-[9px] font-mono px-1.5 py-0.2 rounded bg-white/[0.08] text-os-text-dim border border-os-border"}>
                  OS
                </span>
              </div>
              <p className="text-[11px] text-os-text-dim truncate max-w-[130px]">{appearance === "refined" ? "Business workspace" : businessName}</p>
            </div>
          </Link>
          {appearance === "refined" && <button type="button" data-navigation-close aria-label="Close navigation" onClick={onCloseNavigation} className="flex h-11 w-11 items-center justify-center rounded-xl text-os-text-dim hover:bg-white/5 hover:text-white lg:hidden"><X className="h-5 w-5" /></button>}
        </div>

        {/* Autonomy Status Bar */}
        <div className={appearance === "refined" ? "flex shrink-0 items-center justify-between px-5 py-4" : "px-4 py-2.5 bg-black/20 border-b border-os-border/60 flex items-center justify-between"}>
          <span className="text-[10px] uppercase font-mono text-os-text-dim tracking-wider">
            Agent Mode
          </span>
          <AutonomyPill
            appearance={appearance}
            level={autonomy}
            onClick={onAutonomyClick}
            interactive={true}
            size="sm"
          />
        </div>

        {/* Navigation List */}
        <nav aria-label="Main navigation" className={appearance === "refined" ? "workspace-navigation min-h-0 flex-1 overflow-y-auto px-3 pb-5 pt-1" : "p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-210px)]"}>
          {appearance === "refined" ? <WorkspaceNav items={NAV_ITEMS} pathname={pathname} onNavigate={onCloseNavigation} /> : NAV_ITEMS.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={item.label}
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
      <div className={appearance === "refined" ? "shrink-0 space-y-2 border-t border-white/[0.07] p-3" : "p-3 border-t border-white/[0.06] bg-[#0A0E17]/60 space-y-2"}>
        <button
          type="button"
          onClick={() => { if (appearance === "refined") onCloseNavigation?.(); setIsGetAppOpen(true); }}
          aria-label="Get the App"
          title="Get the App"
          className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-os-text-dim hover:text-os-ink hover:bg-white/[0.03] transition-colors ${appearance === "refined" ? "min-h-11" : ""}`}
        >
          <Smartphone className="w-4 h-4" />
          <span>Get the App</span>
        </button>

        <div className={appearance === "refined" ? "flex items-center justify-between rounded-lg px-2 py-2" : "flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04]"}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className={appearance === "refined" ? "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xs font-medium text-white" : "w-7 h-7 rounded-full bg-gradient-to-tr from-slate-700 to-slate-900 border border-white/10 flex items-center justify-center text-xs font-mono font-bold text-white/80 shrink-0"}>
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
            aria-label="Sign Out"
            className={appearance === "refined" ? "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-os-text-dim transition-colors hover:bg-rose-400/10 hover:text-rose-300" : "p-1.5 rounded-md text-os-text-dim hover:text-thread-bright hover:bg-thread/10 transition-colors"}
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

    </aside>
    <GetAppModal appearance={appearance} isOpen={isGetAppOpen} onClose={() => setIsGetAppOpen(false)} />
    </>
  );
}
