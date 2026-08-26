"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Inbox,
  CheckSquare,
  MessageSquare,
  PhoneCall,
  Layers,
  Users,
  Send,
  BookOpen,
  BarChart3,
  Settings,
  Sparkles,
  ArrowRight,
  Shield,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { type AutonomyLevel } from "@/lib/api";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  onSetAutonomy?: (level: AutonomyLevel) => void;
}

const COMMANDS = [
  {
    category: "Navigation",
    items: [
      {
        title: "Go to Command Center",
        subtitle: "Executive overview & urgent alerts",
        href: "/dashboard",
        icon: LayoutDashboard,
        shortcut: "G D",
      },
      {
        title: "Go to Conversations",
        subtitle: "Unified WhatsApp, voice & email inbox",
        href: "/conversations",
        icon: Inbox,
        shortcut: "G C",
      },
      {
        title: "Go to Approvals Queue",
        subtitle: "Pending AI drafted replies",
        href: "/approvals",
        icon: CheckSquare,
        shortcut: "G A",
      },
      {
        title: "Go to WhatsApp Manager",
        subtitle: "Templates & 24h window monitor",
        href: "/whatsapp",
        icon: MessageSquare,
        shortcut: "G W",
      },
      {
        title: "Go to Voice Agent",
        subtitle: "KYC compliance, numbers & call logs",
        href: "/voice",
        icon: PhoneCall,
        shortcut: "G V",
      },
      {
        title: "Go to Commitment Ledger",
        subtitle: "Overdue & extracted business promises",
        href: "/ledger",
        icon: Layers,
        shortcut: "G L",
      },
      {
        title: "Go to Customers",
        subtitle: "Customer 360 & health scores",
        href: "/customers",
        icon: Users,
        shortcut: "G U",
      },
      {
        title: "Go to Campaigns",
        subtitle: "Broadcast WhatsApp outreach",
        href: "/campaigns",
        icon: Send,
        shortcut: "G M",
      },
      {
        title: "Go to Knowledge Base & Gaps",
        subtitle: "Teach AI & resolve unanswered questions",
        href: "/knowledge",
        icon: BookOpen,
        shortcut: "G K",
      },
      {
        title: "Go to Analytics",
        subtitle: "Receivables aging & agent approval rates",
        href: "/analytics",
        icon: BarChart3,
        shortcut: "G Y",
      },
      {
        title: "Go to Settings",
        subtitle: "Connectors, autonomy & vertical",
        href: "/settings",
        icon: Settings,
        shortcut: "G S",
      },
    ],
  },
  {
    category: "Autonomy Actions",
    items: [
      {
        title: "Switch to Draft Mode (Recommended)",
        subtitle: "Human-in-the-loop: AI proposes, you approve",
        action: "set_draft",
        icon: Shield,
        accent: "text-brass",
      },
      {
        title: "Switch to Observe Mode",
        subtitle: "AI only reads & extracts commitments",
        action: "set_observe",
        icon: Shield,
        accent: "text-amber-400",
      },
      {
        title: "Switch to Act Mode",
        subtitle: "AI sends approved replies autonomously",
        action: "set_act",
        icon: Sparkles,
        accent: "text-seal-bright",
      },
    ],
  },
];

export function CommandPalette({
  isOpen,
  onClose,
  onSetAutonomy,
}: CommandPaletteProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Flatten searchable items
  const allItems = COMMANDS.flatMap((c) =>
    c.items.map((i) => ({ ...i, category: c.category }))
  ).filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.subtitle?.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) onClose();
        else {
          /* open */
        }
      }
      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, allItems.length));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev <= 0 ? allItems.length - 1 : prev - 1
        );
      } else if (e.key === "Enter" && allItems[selectedIndex]) {
        e.preventDefault();
        executeItem(allItems[selectedIndex]);
      } else if (e.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, allItems, selectedIndex, onClose]);

  const executeItem = (item: (typeof allItems)[0]) => {
    onClose();
    if (item.href) {
      router.push(item.href);
    } else if (item.action && onSetAutonomy) {
      if (item.action === "set_observe") onSetAutonomy("observe");
      if (item.action === "set_draft") onSetAutonomy("draft");
      if (item.action === "set_act") onSetAutonomy("act");
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-start justify-center pt-24 p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className="relative w-full max-w-xl rounded-2xl bg-[#0D121F] border border-white/[0.12] shadow-2xl overflow-hidden z-10"
          >
            {/* Search Input Box */}
            <div className="flex items-center px-4 py-3.5 border-b border-white/[0.08] bg-[#111728]/70">
              <Search className="w-4 h-4 text-os-text-dim mr-3 shrink-0" />
              <input
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search views, actions, shortcuts or change autonomy..."
                className="w-full bg-transparent text-sm text-white placeholder:text-os-text-dim outline-none"
              />
              <kbd className="hidden sm:inline-block px-2 py-0.5 rounded bg-white/[0.08] border border-white/[0.1] text-[10px] font-mono text-os-text-dim">
                ESC
              </kbd>
            </div>

            {/* Results List */}
            <div className="max-h-80 overflow-y-auto p-2 space-y-1">
              {allItems.length === 0 ? (
                <div className="p-8 text-center text-xs text-os-text-dim">
                  No matching views or commands found.
                </div>
              ) : (
                allItems.map((item, idx) => {
                  const isSelected = idx === selectedIndex;
                  const Icon = item.icon;

                  return (
                    <div
                      key={item.title}
                      onClick={() => executeItem(item)}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`flex items-center justify-between px-3 py-2.5 rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? "bg-white/[0.08] text-white border border-white/[0.08]"
                          : "text-white/80 hover:bg-white/[0.04]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`p-1.5 rounded-md border ${
                            isSelected
                              ? "bg-white/10 border-white/20 text-white"
                              : "bg-white/[0.04] border-white/[0.06] text-os-text-dim"
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-white">
                            {item.title}
                          </p>
                          <p className="text-[11px] text-os-text-dim">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {item.shortcut && (
                          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] border border-white/[0.08] text-[10px] font-mono text-os-text-dim">
                            {item.shortcut}
                          </kbd>
                        )}
                        {isSelected && (
                          <ArrowRight className="w-3.5 h-3.5 text-white/70" />
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer Cheatsheet */}
            <div className="px-4 py-2.5 bg-[#090D15] border-t border-white/[0.06] flex items-center justify-between text-[11px] text-os-text-dim">
              <span className="font-mono">
                ↑↓ navigate &nbsp;•&nbsp; ↵ select &nbsp;•&nbsp; esc dismiss
              </span>
              <span className="text-[10px] font-mono text-brass">
                KROVA OS
              </span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
