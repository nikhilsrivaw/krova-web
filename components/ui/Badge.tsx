"use client";

import React from "react";
import { clsx } from "clsx";

interface BadgeProps {
  children: React.ReactNode;
  variant?:
    | "default"
    | "emerald"
    | "amber"
    | "rose"
    | "indigo"
    | "cyan"
    | "purple"
    | "outline";
  size?: "sm" | "md";
  dot?: boolean;
  className?: string;
}

// Variant names kept as-is across the app (emerald/rose/indigo read as
// "success/danger/primary" to every caller) - only what they render as
// changes, so the whole app's badges reskin from this one file. emerald ->
// the ledger's wax-seal green, rose -> the ledger's red thread, indigo ->
// the brass signature accent.
const BADGE_STYLES = {
  default: "bg-white/[0.08] text-os-ink border-white/[0.14]",
  emerald: "bg-seal/15 text-seal-bright border-seal/40",
  amber: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  rose: "bg-thread/15 text-thread-bright border-thread/40",
  indigo: "bg-brass/15 text-brass-bright border-brass/40",
  cyan: "bg-cyan-500/10 text-cyan-300 border-cyan-500/30",
  purple: "bg-purple-500/10 text-purple-300 border-purple-500/30",
  outline: "bg-transparent text-os-text-dim border-white/[0.12]",
};

const DOT_COLORS = {
  default: "bg-white/80",
  emerald: "bg-seal-bright",
  amber: "bg-amber-400",
  rose: "bg-thread-bright",
  indigo: "bg-brass-bright",
  cyan: "bg-cyan-400",
  purple: "bg-purple-400",
  outline: "bg-os-text-dim",
};

export function Badge({
  children,
  variant = "default",
  size = "md",
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-mono font-medium rounded-full border tracking-wide whitespace-nowrap",
        BADGE_STYLES[variant],
        size === "sm"
          ? "px-2 py-0.5 text-[10px]"
          : "px-2.5 py-1 text-xs",
        className
      )}
    >
      {dot && (
        <span className={clsx("w-1.5 h-1.5 rounded-full", DOT_COLORS[variant])} />
      )}
      {children}
    </span>
  );
}
