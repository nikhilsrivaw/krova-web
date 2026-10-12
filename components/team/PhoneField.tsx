"use client";

import React, { useEffect, useState } from "react";
import { Phone } from "lucide-react";

/**
 * Where calls for one person ring. Blank means they take no calls. Saved on blur-free
 * demand (a Save button) so a half-typed number is never sent.
 */
export function PhoneField({
  value,
  onSave,
  tone = "dark",
  label = "Calls ring on",
}: {
  value: string | null | undefined;
  onSave: (phone: string) => Promise<string | null>;
  tone?: "dark" | "light";
  label?: string;
}) {
  const [draft, setDraft] = useState(value ? `+${value}` : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(value ? `+${value}` : "");
  }, [value]);

  const dirty = draft.replace(/\D/g, "") !== (value ?? "");

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const stored = await onSave(draft);
      setDraft(stored ? `+${stored}` : "");
      setSaved(true);
      window.setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save the number.");
    } finally {
      setBusy(false);
    }
  };

  const field =
    tone === "light"
      ? "bg-os-card border-os-border text-os-ink"
      : "bg-black/40 border-white/[0.12] text-white focus:border-teal";

  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-os-text-dim">
        <Phone className="h-3 w-3" /> {label}
      </label>
      <div className="flex gap-2">
        <input
          type="tel"
          value={draft}
          onChange={(e) => { setDraft(e.target.value); setSaved(false); }}
          placeholder="+91 98765 43210"
          className={`min-w-0 flex-1 rounded-lg border px-3 py-1.5 text-xs font-mono focus:outline-none ${field}`}
        />
        <button
          type="button"
          disabled={busy || !dirty}
          onClick={() => void save()}
          className="rounded-lg bg-teal/20 px-3 py-1.5 text-xs font-semibold text-teal-100 disabled:opacity-40 cursor-pointer"
        >
          {busy ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}
