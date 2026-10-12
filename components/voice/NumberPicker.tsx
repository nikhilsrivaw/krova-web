"use client";

import React from "react";
import type { VoiceNumberInfo } from "@/lib/api";

/**
 * Which of the business's numbers a screen is about. Shown only when there is more than one;
 * with a single number there is nothing to choose.
 */
export function NumberPicker({
  numbers,
  value,
  onChange,
  allLabel,
  label = "Number",
}: {
  numbers: VoiceNumberInfo[];
  value: string | null;
  onChange: (connectionId: string | null) => void;
  /** Adds an "all numbers" choice (for filters) with this text. */
  allLabel?: string;
  label?: string;
}) {
  if (numbers.length < 2) return null;
  return (
    <label className="flex items-center gap-2 text-xs text-os-text-dim">
      <span className="font-mono uppercase tracking-wide">{label}</span>
      <select
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value || null)}
        className="rounded-lg border border-white/[0.12] bg-black/40 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
      >
        {allLabel && <option value="">{allLabel}</option>}
        {numbers.map((n) => (
          <option key={n.connection_id} value={n.connection_id}>
            {n.label === n.number ? n.number : `${n.label} - ${n.number}`}
          </option>
        ))}
      </select>
    </label>
  );
}
