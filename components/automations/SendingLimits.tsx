"use client";

import React, { useEffect, useState } from "react";
import { Moon } from "lucide-react";
import { postCallRules, type SendingLimits as Limits } from "@/lib/api";

const hourLabel = (h: number) => {
  const am = h < 12;
  const n = h % 12 === 0 ? 12 : h % 12;
  return `${n} ${am ? "AM" : "PM"}`;
};

/**
 * When automations may message customers, and how often - quiet hours (steps wait until they end) and a daily
 * cap per customer. Neither applies while the customer is chatting, or to steps that stay inside the team.
 */
export function SendingLimitsCard({ canEdit }: { canEdit: boolean }) {
  const [limits, setLimits] = useState<Limits | null>(null);
  const [draft, setDraft] = useState<Limits | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    postCallRules.limits().then(setLimits).catch(() => setLimits(null));
  }, []);
  if (!limits) return null;

  const summary = [
    limits.quiet_hours ? `Quiet ${hourLabel(limits.quiet_start)}–${hourLabel(limits.quiet_end)}` : "No quiet hours",
    limits.daily_limit ? `at most ${limits.daily_limit} message${limits.daily_limit === 1 ? "" : "s"} a customer a day` : "no daily cap",
  ].join(" · ");

  const save = async () => {
    if (!draft) return;
    setSaving(true); setError(null);
    try {
      setLimits(await postCallRules.setLimits(draft));
      setDraft(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const select = "px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none";
  const hours = Array.from({ length: 24 }, (_, h) => h);

  return (
    <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Moon className="w-3.5 h-3.5 text-cyan-300" />
        <p className="text-[11px] text-os-text-dim flex-1 min-w-0">
          <span className="text-white font-semibold">Sending limits:</span> {summary}. Never applies while a customer is chatting.
        </p>
        {canEdit && !draft && (
          <button type="button" onClick={() => setDraft(limits)} className="text-[11px] font-semibold text-cyan-300 hover:text-cyan-200 cursor-pointer">
            Change
          </button>
        )}
      </div>
      {draft && (
        <div className="space-y-2.5 pt-1">
          <label className="flex items-center gap-2 text-xs text-white cursor-pointer">
            <input type="checkbox" checked={draft.quiet_hours} onChange={(e) => setDraft({ ...draft, quiet_hours: e.target.checked })} />
            Don&apos;t message customers at night - hold it until morning
          </label>
          {draft.quiet_hours && (
            <div className="flex flex-wrap items-center gap-2 text-xs text-os-text-dim">
              From
              <select value={draft.quiet_start} onChange={(e) => setDraft({ ...draft, quiet_start: Number(e.target.value) })} className={select}>
                {hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
              until
              <select value={draft.quiet_end} onChange={(e) => setDraft({ ...draft, quiet_end: Number(e.target.value) })} className={select}>
                {hours.map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
              </select>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-os-text-dim">
            At most
            <select value={draft.daily_limit} onChange={(e) => setDraft({ ...draft, daily_limit: Number(e.target.value) })} className={select}>
              <option value={0}>no limit</option>
              {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            automated messages to one customer a day (extra ones are skipped and shown in Activity)
          </div>
          {error && <p className="text-[11px] text-red-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={save} disabled={saving}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-white text-xs font-semibold border border-cyan-500/30 cursor-pointer disabled:opacity-50">
              {saving ? "Saving..." : "Save"}
            </button>
            <button type="button" onClick={() => setDraft(null)}
              className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] cursor-pointer">
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
