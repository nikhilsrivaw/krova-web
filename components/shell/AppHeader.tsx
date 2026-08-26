"use client";

import React, { useState } from "react";
import {
  Search,
  Command,
  Bell,
  Sparkles,
  Shield,
  HelpCircle,
  Eye,
  FileText,
  Zap,
} from "lucide-react";
import { type AutonomyLevel } from "@/lib/api";
import { AutonomyPill } from "../ui/AutonomyPill";
import { Modal } from "../ui/Modal";

interface AppHeaderProps {
  title?: string;
  subtitle?: string;
  autonomy: AutonomyLevel;
  onSetAutonomy: (level: AutonomyLevel) => void;
  onOpenCommand: () => void;
  actions?: React.ReactNode;
}

export function AppHeader({
  title,
  subtitle,
  autonomy,
  onSetAutonomy,
  onOpenCommand,
  actions,
}: AppHeaderProps) {
  const [showAutonomyModal, setShowAutonomyModal] = useState(false);

  const AUTONOMY_LEVELS: {
    level: AutonomyLevel;
    title: string;
    description: string;
    icon: typeof Eye;
    badge: string;
    isComingSoon?: boolean;
  }[] = [
    {
      level: "observe",
      title: "Observe Mode",
      description:
        "The AI agent monitors every channel and extracts commitments into the ledger, but generates zero outgoing drafts or replies.",
      icon: Eye,
      badge: "Passive Monitoring",
    },
    {
      level: "draft",
      title: "Draft Mode (Recommended)",
      description:
        "Human-in-the-loop: AI proposes intelligent contextual replies with reasoning and gap analysis. You approve or edit before sending.",
      icon: FileText,
      badge: "Default Production",
    },
    {
      level: "act",
      title: "Act Mode (Autonomous)",
      description:
        "The AI agent replies directly to customers without human intervention when confidence is high. (Auto-send wiring active in draft mode preview).",
      icon: Zap,
      badge: "Full Automation",
    },
  ];

  return (
    <header className="h-16 px-6 bg-[#080B12]/80 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between sticky top-0 z-20">
      {/* Left: Page Title / Breadcrumbs */}
      <div>
        {title ? (
          <div className="flex items-baseline gap-2">
            <h1 className="text-base font-bold text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <span className="text-xs text-os-text-dim font-normal hidden sm:inline">
                • {subtitle}
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono text-os-text-dim">KROVA OS</span>
          </div>
        )}
      </div>

      {/* Right: Quick Search + Autonomy Switcher + Custom Actions */}
      <div className="flex items-center gap-3">
        {/* Search / Command trigger button */}
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-xs text-os-text-dim hover:text-white hover:bg-white/[0.07] transition-all cursor-pointer"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="pr-4">Search or command...</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/[0.08] border border-white/[0.08] text-[10px] font-mono text-os-text-dim">
            ⌘K
          </kbd>
        </button>

        {/* Top-level Autonomy Indicator & Switcher */}
        <div className="flex items-center">
          <AutonomyPill
            level={autonomy}
            onClick={() => setShowAutonomyModal(true)}
            interactive={true}
            size="md"
          />
        </div>

        {/* Page specific action buttons */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>

      {/* Autonomy Setting Modal */}
      <Modal
        isOpen={showAutonomyModal}
        onClose={() => setShowAutonomyModal(false)}
        title="Agent Autonomy Level"
        subtitle="Control how much autonomy the KROVA AI agent has across WhatsApp and Voice."
        maxWidth="lg"
      >
        <div className="space-y-3">
          {AUTONOMY_LEVELS.map((item) => {
            const isSelected = autonomy === item.level;
            const Icon = item.icon;

            return (
              <div
                key={item.level}
                onClick={() => {
                  onSetAutonomy(item.level);
                  setShowAutonomyModal(false);
                }}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? "border-brass/50 bg-brass/10 shadow-lg shadow-brass/10"
                    : "border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`p-2 rounded-lg border ${
                        isSelected
                          ? "bg-brass/20 border-brass/40 text-brass-bright"
                          : "bg-white/[0.04] border-white/[0.08] text-os-text-dim"
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="text-sm font-semibold text-white">
                          {item.title}
                        </h4>
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                            isSelected
                              ? "bg-brass/30 text-brass-bright border-brass/40 font-bold"
                              : "bg-white/[0.04] text-os-text-dim border-white/[0.06]"
                          }`}
                        >
                          {item.badge}
                        </span>
                      </div>
                      <p className="text-xs text-os-text-dim leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 pt-1">
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected
                          ? "border-brass bg-brass"
                          : "border-white/20"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 p-3 rounded-lg bg-white/[0.03] border border-white/[0.06] text-xs text-os-text-dim flex items-center gap-2">
          <Shield className="w-4 h-4 text-brass shrink-0" />
          <span>
            Changes apply instantly to the AI agent. You can adjust this setting
            at any time.
          </span>
        </div>
      </Modal>
    </header>
  );
}
