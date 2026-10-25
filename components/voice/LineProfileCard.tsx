"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, PhoneCall, Plus, Trash2, Users } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/EmptyState";
import {
  team,
  voice,
  type LineProfile,
  type LineProfileInput,
  type PickupLevel,
  type PickupPerson,
  type TeamMember,
} from "@/lib/api";

const input = "w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none";
const label = "block text-xs font-mono uppercase text-os-text-dim mb-2";
const chip = (on: boolean) =>
  `px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
    on ? "border-cyan-500/50 bg-cyan-500/10 text-white" : "border-white/[0.08] bg-white/[0.02] text-os-text-dim hover:text-white"
  }`;

const MAX_LEVELS = 3;
const MAX_PEOPLE = 5;
const RING_CHOICES = [10, 15, 18, 20, 25, 30, 45];
const WAIT_CHOICES = [30, 45, 60, 90, 120];
const CALLBACK_CHOICES = [1, 2, 4, 8, 24, 48];
const NO_ANSWER = [
  { key: "callback", title: "Promise a callback", desc: "The caller hears when you will call back. A callback task goes on the Commitment Ledger and your team is notified." },
  { key: "voicemail", title: "Take a voicemail", desc: "The caller leaves a message. The recording link goes on their notes with a callback task." },
  { key: "apology", title: "Just apologise", desc: "\"Nobody is free right now, someone will call you back.\" Nothing is filed." },
] as const;

const toInput = (p: LineProfile): LineProfileInput => ({
  role: p.role, role_note: p.role_note, pickup: p.pickup, no_answer: p.no_answer, callback_hours: p.callback_hours,
});

/**
 * One number's own job: what the AI is told on calls to it, who calls are put through to (levels that ring one by
 * one or together), and what happens when nobody picks up. Plus a test call to check the list rings.
 */
export function LineProfileCard({ connectionId, onSaved }: { connectionId: string; onSaved?: () => void }) {
  const [profile, setProfile] = useState<LineProfile | null>(null);
  const [draft, setDraft] = useState<LineProfileInput | null>(null);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [fromLegacy, setFromLegacy] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setProfile(null); setDraft(null); setError(null); setSaved(false); setFromLegacy(false);
    voice.lineProfile(connectionId).then((p) => {
      setProfile(p);
      const next = toInput(p);
      if (p.legacy_staff_phone && next.pickup.levels.length === 0) {
        // The old single staff phone becomes level 1, so nothing stops ringing when the list is saved.
        next.pickup = { ...next.pickup, levels: [{ mode: "one_by_one", ring_seconds: 18, people: [{ phone: p.legacy_staff_phone, name: "Staff phone" }] }] };
        setFromLegacy(true);
      }
      setDraft(next);
    }).catch((e) => setError(e instanceof Error ? e.message : "Could not load this number's settings."));
    team.list().then(setMembers).catch(() => undefined);
  }, [connectionId]);

  const byId = useMemo(() => new Map(members.map((m) => [m.user_id, m])), [members]);

  if (!draft || !profile) {
    return error ? <GlassCard className="p-6"><p className="text-xs text-red-400">{error}</p></GlassCard> : <Skeleton className="h-64 w-full" />;
  }

  const change = (patch: Partial<LineProfileInput>) => { setDraft({ ...draft, ...patch }); setSaved(false); };
  const levels = draft.pickup.levels;
  const setLevels = (next: PickupLevel[]) => change({ pickup: { ...draft.pickup, levels: next } });
  const setLevel = (i: number, patch: Partial<PickupLevel>) => setLevels(levels.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const used = new Set(levels.flatMap((l) => l.people.map((p) => p.user_id || p.phone || "")));
  const who = (p: PickupPerson) => {
    if (p.user_id) {
      const m = byId.get(p.user_id);
      const name = m?.full_name || m?.email || "Team member";
      if (!m) return { name, line: "No longer on the team", warn: true };
      if (!m.phone) return { name, line: "No phone on the Team page - skipped", warn: true };
      return { name, line: `+${m.phone}${m.available === false ? " · Away now" : ""}`, warn: m.available === false };
    }
    return { name: p.name || "Outside number", line: `+${p.phone}`, warn: false };
  };
  const preset = profile.roles.find((r) => r.key === draft.role);

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const out = await voice.saveLineProfile(connectionId, draft);
      setProfile(out); setDraft(toInput(out)); setSaved(true); setFromLegacy(false);
      onSaved?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="p-6 space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400"><Users className="w-6 h-6" /></div>
        <div>
          <h3 className="text-sm font-bold text-white">This number&apos;s job and who answers</h3>
          <p className="text-xs text-os-text-dim mt-0.5">Each number can do its own work - a sales line, a support line, a branch.</p>
        </div>
      </div>

      {/* What this number is for */}
      <div>
        <span className={label}>What this number is for</span>
        <div className="flex flex-wrap gap-2">
          <button type="button" className={chip(draft.role === null)} onClick={() => change({ role: null })}>Not set</button>
          {profile.roles.map((r) => (
            <button key={r.key} type="button" className={chip(draft.role === r.key)}
              onClick={() => change({ role: r.key as LineProfileInput["role"] })}>{r.label}</button>
          ))}
        </div>
        {preset?.note && <p className="mt-2 text-[11px] text-os-text-dim">The AI is told: &ldquo;{preset.note}&rdquo;</p>}
        <textarea rows={2} maxLength={400} value={draft.role_note} onChange={(e) => change({ role_note: e.target.value })}
          placeholder="In your own words, e.g. Jaipur branch, Malviya Nagar. Open 10 am to 7 pm. Test drives on weekends only."
          className={`${input} mt-2 resize-none`} />
        <p className="mt-1 text-[10px] font-mono text-os-text-dim">{draft.role_note.length}/400 · used only on calls that come in on this number</p>
      </div>

      {/* Who answers */}
      <div className="pt-2 border-t border-white/[0.06] space-y-3">
        <div>
          <span className={label}>Who answers</span>
          <p className="text-[11px] text-os-text-dim">
            Who a call is put through to when the AI hands over or the caller presses 0. Level 1 rings first, then level 2,
            then level 3. The customer&apos;s own team member always rings first, and anyone marked Away is skipped.
            Leave it empty and every team member with a phone rings one by one.
          </p>
          {fromLegacy && <p className="mt-2 text-[11px] text-amber-300">Your old staff phone is now level 1. Save to keep it.</p>}
        </div>

        {levels.map((level, i) => (
          <div key={i} className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-bold text-white">Level {i + 1}{i === 0 ? " - rings first" : ""}</span>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" className={chip(level.mode === "one_by_one")} onClick={() => setLevel(i, { mode: "one_by_one" })}>One by one</button>
                <button type="button" className={chip(level.mode === "together")} onClick={() => setLevel(i, { mode: "together" })}>All together</button>
                <select value={level.ring_seconds} onChange={(e) => setLevel(i, { ring_seconds: Number(e.target.value) })}
                  className="rounded-lg border border-white/[0.12] bg-black/40 px-2 py-1.5 text-xs text-white" aria-label="Ring time">
                  {RING_CHOICES.map((s) => <option key={s} value={s}>{s}s {level.mode === "together" ? "for the level" : "each"}</option>)}
                </select>
                <button type="button" onClick={() => setLevels(levels.filter((_, j) => j !== i))}
                  className="p-1.5 text-os-text-dim hover:text-red-400 cursor-pointer" aria-label={`Remove level ${i + 1}`}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {level.people.map((p, k) => {
                const w = who(p);
                return (
                  <div key={`${p.user_id || p.phone}-${k}`} className="flex items-center justify-between gap-2 rounded-lg bg-black/30 px-3 py-2">
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{w.name}</p>
                      <p className={`text-[10px] font-mono ${w.warn ? "text-amber-300" : "text-os-text-dim"}`}>{w.line}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" disabled={k === 0} aria-label="Move up" className="p-1 text-os-text-dim hover:text-white disabled:opacity-30 cursor-pointer"
                        onClick={() => { const next = [...level.people]; [next[k - 1], next[k]] = [next[k], next[k - 1]]; setLevel(i, { people: next }); }}>
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" disabled={k === level.people.length - 1} aria-label="Move down" className="p-1 text-os-text-dim hover:text-white disabled:opacity-30 cursor-pointer"
                        onClick={() => { const next = [...level.people]; [next[k + 1], next[k]] = [next[k], next[k + 1]]; setLevel(i, { people: next }); }}>
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>
                      <button type="button" aria-label="Remove" className="p-1 text-os-text-dim hover:text-red-400 cursor-pointer"
                        onClick={() => setLevel(i, { people: level.people.filter((_, j) => j !== k) })}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
              {level.people.length === 0 && <p className="text-[11px] text-os-text-dim">Nobody on this level yet.</p>}
            </div>
            {level.people.length < MAX_PEOPLE && (
              <AddPerson members={members} used={used} onAdd={(p) => setLevel(i, { people: [...level.people, p] })} />
            )}
          </div>
        ))}

        <div className="flex flex-wrap items-center justify-between gap-3">
          {levels.length < MAX_LEVELS ? (
            <button type="button" onClick={() => setLevels([...levels, { mode: "one_by_one", ring_seconds: 18, people: [] }])}
              className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs flex items-center gap-1 cursor-pointer">
              <Plus className="w-3.5 h-3.5" /> Add level {levels.length + 1}
            </button>
          ) : <span />}
          <label className="flex items-center gap-2 text-[11px] text-os-text-dim">
            Longest a caller waits
            <select value={draft.pickup.max_wait} onChange={(e) => change({ pickup: { ...draft.pickup, max_wait: Number(e.target.value) } })}
              className="rounded-lg border border-white/[0.12] bg-black/40 px-2 py-1.5 text-xs text-white">
              {WAIT_CHOICES.map((s) => <option key={s} value={s}>{s} seconds</option>)}
            </select>
          </label>
        </div>
      </div>

      {/* Nobody answers */}
      <div className="pt-2 border-t border-white/[0.06] space-y-3">
        <span className={label}>When nobody answers</span>
        <div className="grid gap-3 sm:grid-cols-3">
          {NO_ANSWER.map((o) => (
            <button key={o.key} type="button" onClick={() => change({ no_answer: o.key })}
              className={`text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                draft.no_answer === o.key ? "border-cyan-500/50 bg-cyan-500/10" : "border-white/[0.06] bg-white/[0.02] hover:border-white/[0.12]"
              }`}>
              <p className="text-xs font-semibold text-white mb-0.5">{o.title}</p>
              <p className="text-[10px] text-os-text-dim leading-relaxed">{o.desc}</p>
            </button>
          ))}
        </div>
        {draft.no_answer !== "apology" && (
          <label className="flex items-center gap-2 text-[11px] text-os-text-dim">
            Call back within
            <select value={draft.callback_hours} onChange={(e) => change({ callback_hours: Number(e.target.value) })}
              className="rounded-lg border border-white/[0.12] bg-black/40 px-2 py-1.5 text-xs text-white">
              {CALLBACK_CHOICES.map((h) => <option key={h} value={h}>{h} hour{h === 1 ? "" : "s"}</option>)}
            </select>
          </label>
        )}
      </div>

      <TestCall connectionId={connectionId} />

      <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
        {error && <span className="text-xs text-red-400">{error}</span>}
        {saved && <span className="text-xs text-seal-bright font-mono">Saved.</span>}
        <button type="button" onClick={save} disabled={busy}
          className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 cursor-pointer disabled:opacity-50">
          {busy ? "Saving..." : "Save this number's job"}
        </button>
      </div>
    </GlassCard>
  );
}

function AddPerson({ members, used, onAdd }: { members: TeamMember[]; used: Set<string>; onAdd: (p: PickupPerson) => void }) {
  const [outside, setOutside] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const free = members.filter((m) => !used.has(m.user_id));

  if (outside) {
    return (
      <div className="grid gap-2 sm:grid-cols-[1fr_1fr_auto_auto]">
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Name, e.g. Reception" className={input} />
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+91 98765 43210" className={input} />
        <button type="button" disabled={!phone.trim()} onClick={() => { onAdd({ phone: phone.trim(), name: name.trim() || "Outside number" }); setName(""); setPhone(""); setOutside(false); }}
          className="px-3 py-2 rounded-lg bg-cyan-500/20 text-cyan-200 text-xs font-semibold disabled:opacity-40 cursor-pointer">Add</button>
        <button type="button" onClick={() => setOutside(false)} className="px-3 py-2 text-xs text-os-text-dim hover:text-white cursor-pointer">Cancel</button>
      </div>
    );
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <select value="" onChange={(e) => { if (e.target.value) onAdd({ user_id: e.target.value }); }}
        className="rounded-lg border border-white/[0.12] bg-black/40 px-3 py-1.5 text-xs text-white">
        <option value="">+ Add a team member</option>
        {free.map((m) => (
          <option key={m.user_id} value={m.user_id} disabled={!m.phone}>
            {(m.full_name || m.email || "Team member") + (m.phone ? "" : " (no phone on the Team page)")}
          </option>
        ))}
      </select>
      <button type="button" onClick={() => setOutside(true)} className="text-xs text-cyan-300 hover:underline cursor-pointer">or an outside number</button>
    </div>
  );
}

function TestCall({ connectionId }: { connectionId: string }) {
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ring = async () => {
    setBusy(true); setError(null); setNote(null);
    try {
      const out = await voice.testCall(connectionId, phone);
      setNote(`Calling +${out.calling} now. ${out.left_today} test call${out.left_today === 1 ? "" : "s"} left today.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not place the test call.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pt-2 border-t border-white/[0.06] space-y-2">
      <span className={label}>Test call</span>
      <p className="text-[11px] text-os-text-dim">Ring any phone from this number with a short recorded line, to check it really rings. 5 a day.</p>
      <div className="flex flex-wrap gap-2">
        <input value={phone} onChange={(e) => setPhone(e.target.value)} type="tel" placeholder="+91 98765 43210" className={`${input} max-w-xs`} />
        <button type="button" disabled={busy || !phone.trim()} onClick={ring}
          className="px-3.5 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
          <PhoneCall className="w-3.5 h-3.5" /> {busy ? "Calling..." : "Ring it"}
        </button>
      </div>
      {note && <p className="text-[11px] text-emerald-300">{note}</p>}
      {error && <p className="text-[11px] text-red-400">{error}</p>}
    </div>
  );
}
