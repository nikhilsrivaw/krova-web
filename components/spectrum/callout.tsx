"use client";

import { Info, AlertTriangle, Lightbulb, ShieldCheck } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type CalloutType = "info" | "warning" | "tip" | "security";

const STYLES: Record<
  CalloutType,
  { border: string; accent: string; icon: ReactNode; label: string }
> = {
  info: {
    border: "border-os-border",
    accent: "text-teal",
    icon: <Info size={14} />,
    label: "Note",
  },
  warning: {
    border: "border-thread/40",
    accent: "text-thread-bright",
    icon: <AlertTriangle size={14} />,
    label: "Heads up",
  },
  tip: {
    border: "border-os-border",
    accent: "text-teal",
    icon: <Lightbulb size={14} />,
    label: "Tip",
  },
  security: {
    border: "border-os-border",
    accent: "text-teal",
    icon: <ShieldCheck size={14} />,
    label: "Security",
  },
};

interface CalloutProps {
  type?: CalloutType;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Callout({ type = "info", title, children, className }: CalloutProps) {
  const s = STYLES[type];
  return (
    <div className={cn("rounded-xl border bg-os-card p-5", s.border, className)}>
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", s.accent)}>{s.icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold text-os-ink mb-1">{title || s.label}</div>
          <div className="text-sm leading-relaxed text-os-text-dim">{children}</div>
        </div>
      </div>
    </div>
  );
}
