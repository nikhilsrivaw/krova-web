"use client";

import React, { useState } from "react";
import { Phone } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { voice, type ReleaseCheck, type VoiceNumberInfo } from "@/lib/api";

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
  onRelease: (number: string, moveCampaignsTo?: string | null) => Promise<void> | void;
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
  info: VoiceNumberInfo; showDefault: boolean; onChanged: () => void;
  onRelease: (n: string, moveCampaignsTo?: string | null) => Promise<void> | void; releasing: boolean;
}) {
  const [releaseOpen, setReleaseOpen] = useState(false);
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
          onClick={() => setReleaseOpen(true)}
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
      {releaseOpen && (
        <ReleaseDialog
          info={info}
          onClose={() => setReleaseOpen(false)}
          onConfirm={async (moveTo) => { await onRelease(info.number, moveTo); setReleaseOpen(false); onChanged(); }}
          releasing={releasing}
        />
      )}
    </div>
  );
}

/** Before a number is given back: what still uses it, and where its campaigns should go. */
function ReleaseDialog({
  info, onClose, onConfirm, releasing,
}: {
  info: VoiceNumberInfo; onClose: () => void; onConfirm: (moveTo: string | null) => Promise<void>; releasing: boolean;
}) {
  const [check, setCheck] = useState<ReleaseCheck | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moveTo, setMoveTo] = useState("");

  React.useEffect(() => {
    voice.releaseCheck(info.number).then((c) => {
      setCheck(c);
      setMoveTo(c.others[0]?.connection_id ?? "");
    }).catch((e) => setError(e instanceof Error ? e.message : "Could not check this number."));
  }, [info.number]);

  const name = info.label === info.number ? info.number : `${info.label} (${info.number})`;
  return (
    <Modal isOpen onClose={onClose} title={`Give back ${name}?`} subtitle="Calls to this number will stop reaching you." maxWidth="md">
      <div className="space-y-4 text-xs text-white/90">
        {!check && !error && <p className="text-os-text-dim">Checking what still uses this number...</p>}
        {error && <p className="text-red-400">{error}</p>}
        {check && (
          <>
            {check.campaigns.length > 0 ? (
              <div className="space-y-2">
                <p>{check.campaigns.length === 1 ? "1 call campaign calls" : `${check.campaigns.length} call campaigns call`} from this number:</p>
                <ul className="list-disc pl-5 text-os-text-dim">
                  {check.campaigns.map((c) => <li key={c.id}>{c.name} ({c.status})</li>)}
                </ul>
                <label className="block">
                  <span className="text-os-text-dim">Move them to</span>
                  <select value={moveTo} onChange={(e) => setMoveTo(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2 text-xs text-white">
                    {check.others.map((o) => (
                      <option key={o.connection_id} value={o.connection_id}>{o.label === o.number ? o.number : `${o.label} - ${o.number}`}</option>
                    ))}
                    <option value="">No number - a running campaign is paused</option>
                  </select>
                </label>
              </div>
            ) : <p className="text-os-text-dim">No call campaign uses this number.</p>}
            {check.rules.length > 0 && (
              <div>
                <p>These automations only run for this number, so they will be switched off:</p>
                <ul className="list-disc pl-5 text-os-text-dim">{check.rules.map((r) => <li key={r.id}>{r.name}</li>)}</ul>
              </div>
            )}
            {check.is_default && (
              <p className="text-amber-300">Outgoing calls go from this number now. Your oldest other number takes over.</p>
            )}
            <p className="text-os-text-dim">
              Call history stays on your customers&apos; records. This month&apos;s rent ({rupees(check.rent_paise)}) is not refunded.
            </p>
          </>
        )}
        <div className="flex justify-end gap-3 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white cursor-pointer">
            Keep it
          </button>
          <button type="button" disabled={!check || releasing} onClick={() => void onConfirm(moveTo || null)}
            className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40">
            {releasing ? "Releasing..." : "Release number"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
