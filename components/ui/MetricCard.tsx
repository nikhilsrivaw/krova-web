"use client";

import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon?: LucideIcon;
  accentColor?: "emerald" | "amber" | "rose" | "indigo" | "cyan" | "white";
  badgeText?: string;
  onClick?: () => void;
}

const ACCENT_STYLES = {
  emerald: {
    iconBg: "bg-seal/15 text-seal-bright border-seal/30",
    glow: "hover:border-seal/40",
    valueColor: "text-seal-bright",
  },
  amber: {
    iconBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    glow: "hover:border-amber-500/30",
    valueColor: "text-amber-300",
  },
  rose: {
    iconBg: "bg-thread/15 text-thread-bright border-thread/30",
    glow: "hover:border-thread/40",
    valueColor: "text-thread-bright",
  },
  indigo: {
    iconBg: "bg-brass/15 text-brass-bright border-brass/30",
    glow: "hover:border-brass/40",
    valueColor: "text-brass-bright",
  },
  cyan: {
    iconBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    glow: "hover:border-cyan-500/30",
    valueColor: "text-cyan-300",
  },
  white: {
    iconBg: "bg-white/10 text-os-ink border-white/20",
    glow: "hover:border-white/30",
    valueColor: "text-os-ink",
  },
};

export function MetricCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  accentColor = "white",
  badgeText,
  onClick,
}: MetricCardProps) {
  const styles = ACCENT_STYLES[accentColor];

  return (
    <GlassCard
      onClick={onClick}
      className={`p-5 group cursor-default transition-all duration-200 ${
        onClick ? "cursor-pointer active:scale-[0.99]" : ""
      } ${styles.glow}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <span className="text-xs font-semibold text-os-text-dim uppercase tracking-wider">
          {title}
        </span>
        <div className="flex items-center gap-2">
          {badgeText && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white/[0.06] border border-white/[0.08] text-white/80">
              {badgeText}
            </span>
          )}
          {Icon && (
            <div
              className={`p-2 rounded-lg border flex items-center justify-center transition-transform group-hover:scale-105 ${styles.iconBg}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          )}
        </div>
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl lg:text-3xl font-serif font-semibold tracking-tight ${styles.valueColor}`}
        >
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="mt-2 flex items-center justify-between text-xs text-os-text-dim">
          {subtitle && <span>{subtitle}</span>}
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-mono font-medium ${
                trend.isPositive ? "text-seal-bright" : "text-thread-bright"
              }`}
            >
              {trend.isPositive ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              {trend.value}
            </span>
          )}
        </div>
      )}
    </GlassCard>
  );
}
