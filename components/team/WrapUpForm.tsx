"use client";

import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import { calls, type WrapUpPromise } from "@/lib/api";

/**
 * After a call: one line for the team, and any promises made on it. A promise typed here
 * goes straight into the Commitment Ledger, so it is chased like one the AI heard.
 */

const KINDS: { value: string; label: string }[] = [
  { value: "callback", label: "Call back" },
  { value: "document", label: "Send a document" },
  { value: "payment", label: "Payment" },
  { value: "delivery", label: "Delivery" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other" },
];

export function WrapUpForm({
  callId,
  customerName,
  tone = "dark",
  onDone,
}: {
  callId: string;
  customerName?: string | null;
  tone?: "dark" | "light";
  onDone: (filed: number) => void;
}) {
  const [note, setNote] = useState("");
  const [promises, setPromises] = useState<WrapUpPromise[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const field =
    tone === "light"
      ? "bg-os-card border-os-border text-os-ink placeholder:text-os-text-dim"
      : "bg-black/40 border-white/[0.12] text-white placeholder:text-os-text-dim focus:border-cyan-500";

  const update = (i: number, patch: Partial<WrapUpPromise>) =>
    setPromises((list) => list.map((p, idx) => (idx === i ? { ...p, ...patch } : p)));

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const filled = promises
        .filter((p) => p.description.trim())
        .map((p) => ({ ...p, due_on: p.due_on || null }));
      const res = await calls.wrapUp(callId, { note: note.trim(), promises: filled });
      onDone(res.promises_filed);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
      setBusy(false);
    }
  };

  return (
    <div className="space-y-3 text-xs">
      <div>
        <label className="mb-1.5 block text-[10px] font-mono uppercase tracking-wide text-os-text-dim">
          What was said{customerName ? ` with ${customerName}` : ""}
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Asked for a Sunday slot, wants the price list on WhatsApp"
          className={`w-full resize-none rounded-lg border px-3 py-2 text-xs focus:outline-none ${field}`}
        />
        <p className="mt-1 text-[11px] text-os-text-dim">Saved as a team note and on the customer&apos;s timeline.</p>
      </div>

      <div className="space-y-2">
        <label className="block text-[10px] font-mono uppercase tracking-wide text-os-text-dim">
          Did you promise anything?
        </label>
        {promises.map((p, i) => (
          <div key={i} className="space-y-1.5 rounded-xl border border-white/[0.08] p-2.5">
            <div className="flex gap-2">
              <input
                value={p.description}
                onChange={(e) => update(i, { description: e.target.value })}
                placeholder="Send the quote"
                maxLength={500}
                className={`min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-xs focus:outline-none ${field}`}
              />
              <button
                type="button"
                aria-label="Remove this promise"
                onClick={() => setPromises((list) => list.filter((_, idx) => idx !== i))}
                className="rounded-lg border border-white/[0.1] p-1.5 text-os-text-dim cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="flex gap-2">
              <select
                value={p.kind ?? "other"}
                onChange={(e) => update(i, { kind: e.target.value })}
                className={`rounded-lg border px-2 py-1.5 text-xs focus:outline-none ${field}`}
              >
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
              <input
                type="date"
                value={p.due_on ?? ""}
                onChange={(e) => update(i, { due_on: e.target.value })}
                className={`flex-1 rounded-lg border px-2 py-1.5 text-xs focus:outline-none ${field}`}
                aria-label="By when"
              />
            </div>
          </div>
        ))}
        {promises.length < 5 && (
          <button
            type="button"
            onClick={() => setPromises((list) => [...list, { description: "", due_on: null, kind: "other" }])}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-cyan-300 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Add a promise
          </button>
        )}
        {promises.length > 0 && (
          <p className="text-[11px] text-os-text-dim">
            These go into the Commitment Ledger and are chased if the date passes.
          </p>
        )}
      </div>

      {error && <p className="text-[11px] text-rose-300">{error}</p>}
      <button
        type="button"
        disabled={busy}
        onClick={() => void save()}
        className="w-full rounded-lg bg-cyan-500 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
      >
        {busy ? "Saving…" : "Save call notes"}
      </button>
    </div>
  );
}
