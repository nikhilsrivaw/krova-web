"use client";

import React from "react";
import { Shield, Eye, FileText, Zap, ChevronDown } from "lucide-react";
import { type AutonomyLevel } from "@/lib/api";

interface AutonomyPillProps {
  level: AutonomyLevel;
  onClick?: () => void;
  size?: "sm" | "md";
  interactive?: boolean;
}

const CONFIG = {
  observe: {
    label: "Observe Mode",
    short: "Observe",
    desc: "AI reads & extracts, writes nothing",
    color: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    dot: "bg-amber-400",
    icon: Eye,
  },
  draft: {
    label: "Draft Mode",
    short: "Draft",
    desc: "Human-in-the-loop: AI proposes, human approves",
    color: "border-brass/30 bg-brass/10 text-brass-bright",
    dot: "bg-brass",
    icon: FileText,
  },
  act: {
    label: "Act Mode",
    short: "Act (Auto)",
    desc: "AI replies autonomously without approval",
    color: "border-seal/30 bg-seal/10 text-seal-bright",
    dot: "bg-seal-bright animate-pulse",
    icon: Zap,
  },
};

export function AutonomyPill({
  level,
  onClick,
  size = "md",
  interactive = false,
}: AutonomyPillProps) {
  const conf = CONFIG[level] || CONFIG.draft;
  const Icon = conf.icon;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      title={conf.desc}
      className={`inline-flex items-center gap-1.5 rounded-full border font-mono font-medium transition-all ${
        conf.color
      } ${
        size === "sm"
          ? "px-2 py-0.5 text-[11px]"
          : "px-2.5 py-1 text-xs"
      } ${
        interactive
          ? "cursor-pointer hover:brightness-125 active:scale-95"
          : "cursor-default"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${conf.dot}`} />
      <Icon className="h-3 w-3" />
      <span>{conf.short}</span>
      {interactive && <ChevronDown className="h-3 w-3 opacity-60 ml-0.5" />}
    </button>
  );
}
