"use client";

import { Sparkles } from "lucide-react";

export function AppTopBar({ businessName }: { businessName: string }) {
  return (
    <header className="sticky top-0 z-20 flex items-center gap-2.5 px-4 pt-[max(env(safe-area-inset-top),14px)] pb-3 bg-os-bg/90 backdrop-blur-xl border-b border-os-border">
      <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-bright via-teal to-teal-dim flex items-center justify-center shrink-0">
        <Sparkles className="w-3.5 h-3.5 text-os-bg" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-os-ink truncate leading-tight">{businessName}</p>
        <p className="text-[10px] font-mono text-os-text-dim tracking-wide">KROVA</p>
      </div>
    </header>
  );
}
