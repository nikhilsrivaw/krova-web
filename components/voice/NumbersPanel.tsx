"use client";

import React, { useState } from "react";
import { Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { voice, type VoiceNumberInfo } from "@/lib/api";

/**
 * The business's voice numbers, each with a name, what it is for, and whether outgoing calls
 * go out from it by default - plus what it costs and how busy it has been.
 */

const USE_LABEL: Record<VoiceNumberInfo["use"], string> = {
  both: "Incoming and outgoing",
  inbound: "Incoming calls only",
  outbound: "Outgoing calls only",
};

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

export function NumbersPanel({
  numbers,
  onChanged,
  onRelease,
  releasing,
}: {
  numbers: VoiceNumberInfo[];
  onChanged: () => void;
  onRelease: (number: string) => void;
  releasing: string | null;
}) {
  return (
    <div className="space-y-3">
      {numbers.map((n) => (
        <NumberCard
          key={n.connection_id}
          info={n}
          showDefault={numbers.length > 1}
          onChanged={onChanged}
          onRelease={onRelease}
          releasing={releasing === n.number}
        />
      ))}
    </div>
  );
}

function NumberCard({
  info, showDefault, onChanged, onRelease, releasing,
}: {
  info: VoiceNumberInfo; showDefault: boolean; onChanged: () => void; onRelease: (n: string) => void; releasing: boolean;
}) {
  const [name, setName] = useState(info.label === info.number ? "" : info.label);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (patch: { label?: string; use?: VoiceNumberInfo["use"]; default_outbound?: boolean }) => {
    setBusy(true);
    setError(null);
    try {
      await voice.updateAgentSettings(patch, info.connection_id);
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const nameChanged = name.trim() !== (info.label === info.number ? "" : info.label);

  return (
    <div className="space-y-3 rounded-xl border border-cyan-500/30 bg-cyan-950/20 p-4">
      <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="shrink-0 rounded-lg border border-cyan-500/30 bg-cyan-500/20 p-2 text-cyan-300">
            <Phone className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h5 className="break-all font-mono text-sm font-bold text-white">{info.number}</h5>
            <div className="mt-1 flex flex-wrap items-center gap-1.5">
              {info.series_label && <Badge variant="cyan" size="sm">{info.series_label}</Badge>}
              {info.default_outbound && showDefault && <Badge variant="emerald" size="sm">Outgoing calls go from here</Badge>}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onRelease(info.number)}
          disabled={releasing}
          className="shrink-0 rounded-lg border border-white/[0.08] px-3 py-1.5 text-xs text-os-text-dim transition-colors hover:text-thread-bright"
        >
          Release Number
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[10px] font-mono uppercase text-os-text-dim">Name</label>
          <div className="flex gap-2">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
              placeholder="e.g. Sales, Delhi branch"
              className="min-w-0 flex-1 rounded-lg border border-white/[0.12] bg-black/40 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="button"
              disabled={busy || !nameChanged}
              onClick={() => void save({ label: name.trim() })}
              className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-xs font-semibold text-cyan-200 disabled:opacity-40 cursor-pointer"
            >
              Save
            </button>
          </div>
        </div>
        <div>
          <label className="mb-1 block text-[10px] font-mono uppercase text-os-text-dim">This number is for</label>
          <select
            value={info.use}
            disabled={busy}
            onChange={(e) => void save({ use: e.target.value as VoiceNumberInfo["use"] })}
            className="w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none"
          >
            {(Object.keys(USE_LABEL) as VoiceNumberInfo["use"][]).map((u) => (
              <option key={u} value={u}>{USE_LABEL[u]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-os-text-dim">
        <span>
          {rupees(info.rent_paise)} a month rent · last 30 days: {info.calls_30d} call{info.calls_30d === 1 ? "" : "s"}
          {info.calls_30d > 0 ? `, ${rupees(info.cost_paise_30d)} of call cost` : ""}
        </span>
        {showDefault && !info.default_outbound && info.use !== "inbound" && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void save({ default_outbound: true })}
            className="font-semibold text-cyan-300 hover:underline cursor-pointer"
          >
            Make this the number outgoing calls go from
          </button>
        )}
      </div>
      {error && <p className="text-[11px] text-rose-300">{error}</p>}
    </div>
  );
}
