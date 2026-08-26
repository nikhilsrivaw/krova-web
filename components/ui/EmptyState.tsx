"use client";

import React from "react";
import { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center border border-dashed border-white/[0.08] rounded-2xl bg-white/[0.01]">
      <div className="p-4 rounded-2xl bg-white/[0.04] border border-white/[0.06] text-os-text-dim mb-4">
        <Icon className="w-8 h-8 opacity-80 text-white/70" />
      </div>
      <h4 className="text-base font-semibold text-white mb-1.5">{title}</h4>
      <p className="text-xs text-os-text-dim max-w-sm leading-relaxed mb-6">
        {description}
      </p>
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="px-4 py-2 text-xs font-semibold rounded-lg bg-white text-black hover:bg-white/90 active:scale-95 transition-all shadow-md"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-white/[0.05] ${className}`}
    />
  );
}
