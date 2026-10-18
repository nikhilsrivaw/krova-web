"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";

/** A bottom sheet for the phone app: slides over the screen, closes on the backdrop, the X or Escape. */
export function Sheet({
  open, title, onClose, children,
}: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    const before = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.documentElement.style.overflow = before;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={title}>
      <button type="button" aria-label="Close" onClick={onClose} className="absolute inset-0 bg-black/60" />
      <div className="relative w-full max-w-md max-h-[85vh] flex flex-col rounded-t-2xl bg-os-card border-t border-os-border pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-os-border">
          <p className="text-sm font-semibold text-os-ink">{title}</p>
          <button type="button" onClick={onClose} aria-label="Close" className="p-1 -mr-1 text-os-text-dim">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  );
}
