"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ClipboardPen } from "lucide-react";
import { calls, type CallState } from "@/lib/api";
import { WrapUpForm } from "@/components/team/WrapUpForm";

/**
 * Calls you spoke on and have not written up. A call put through to you by the AI lands here
 * too - the promise you made on it is not in the ledger until you say so.
 */
export function PendingWrapups({ tone = "dark", onChange }: { tone?: "dark" | "light"; onChange?: () => void }) {
  const [items, setItems] = useState<CallState[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    calls.pendingWrapups().then(setItems).catch(() => setItems([]));
  }, []);
  useEffect(load, [load]);

  if (!items || items.length === 0) return null;

  const box = tone === "light" ? "bg-os-card border-os-border text-os-ink" : "bg-white/[0.03] border-white/[0.1] text-white";

  return (
    <div className={`space-y-2 rounded-2xl border p-3.5 ${box}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-os-text-dim">
        <ClipboardPen className="h-3 w-3" /> {items.length} {items.length === 1 ? "call" : "calls"} to write up
      </p>
      {items.map((call) => (
        <div key={call.id} className="space-y-2 rounded-xl border border-white/[0.08] p-2.5 text-xs">
          <button
            type="button"
            onClick={() => setOpen(open === call.id ? null : call.id)}
            className="flex w-full items-center justify-between text-left cursor-pointer"
          >
            <span className="font-semibold">{call.customer_name || "A customer"}</span>
            <span className="text-[11px] text-os-text-dim">
              {call.ended_at ? new Date(call.ended_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : ""}
            </span>
          </button>
          {open === call.id && (
            <WrapUpForm
              callId={call.id}
              customerName={call.customer_name}
              tone={tone}
              onDone={() => { setOpen(null); load(); onChange?.(); }}
            />
          )}
        </div>
      ))}
    </div>
  );
}
