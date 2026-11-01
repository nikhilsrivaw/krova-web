"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Frown, Meh, MessageSquare, PhoneCall, Send, Smile, Star } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { OwnerAdminOnly } from "@/components/shell/OwnerAdminOnly";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  feedback, type FeedbackChannel, type FeedbackResponse, type FeedbackSettings, type FeedbackSettingsOut, type FeedbackStats,
} from "@/lib/api";

const pick = "px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const SHOW = [
  { key: "answered", label: "All answers" }, { key: "unhappy", label: "Unhappy" }, { key: "happy", label: "Happy" },
  { key: "comments", label: "With a comment" },
] as const;
const DELAYS = [[30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"], [1440, "Next day"]] as const;
const COOLDOWNS = [[0, "No limit"], [3, "3 days"], [7, "7 days"], [14, "14 days"], [30, "30 days"]] as const;
const CALL_AFTER = [[2, "2 hours"], [6, "6 hours"], [24, "1 day"], [48, "2 days"]] as const;

function face(rating: number | null) {
  if (rating === null) return <span className="text-[11px] text-os-text-dim">-</span>;
  const Icon = rating >= 4 ? Smile : rating === 3 ? Meh : Frown;
  const color = rating >= 4 ? "text-emerald-400" : rating === 3 ? "text-amber-300" : "text-rose-400";
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}><Icon className="w-4 h-4" />{rating}/5</span>;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/**
 * Feedback: ask customers how a visit, token, order or chat went - on WhatsApp, by call, or both - and see what they
 * said. Unhappy answers go to Talk to team; happy ones get the Google review link. Rules: shared/care/feedback.py.
 */
function FeedbackPage() {
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [rows, setRows] = useState<FeedbackResponse[] | null>(null);
  const [show, setShow] = useState<(typeof SHOW)[number]["key"]>("answered");

  const load = useCallback(() => {
    feedback.stats().then(setStats).catch(() => setStats(null));
    feedback.responses(show).then(setRows).catch(() => setRows([]));
  }, [show]);
  useEffect(load, [load]);

  const spreadMax = stats ? Math.max(1, ...Object.values(stats.spread)) : 1;

  return (
    <AppLayout title="Feedback" subtitle="How customers felt about a visit, an order or a chat">
      <div className="space-y-5">
        <SettingsCard />

        {stats && (
          <div className="grid gap-3 sm:grid-cols-4">
            <GlassCard className="p-4">
              <p className="text-[11px] text-os-text-dim">Average rating</p>
              <p className="text-2xl font-bold text-white mt-1 flex items-center gap-1.5">
                {stats.average ?? "-"} <Star className="w-5 h-5 text-amber-300 fill-amber-300" />
              </p>
              <p className="text-[10px] text-os-text-dim">last {stats.days} days</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-[11px] text-os-text-dim">Answered</p>
              <p className="text-2xl font-bold text-white mt-1">{stats.answered}<span className="text-sm text-os-text-dim"> / {stats.asked}</span></p>
              <p className="text-[10px] text-os-text-dim">of those asked</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-[11px] text-os-text-dim">Happy (4-5)</p>
              <p className="text-2xl font-bold text-emerald-400 mt-1">{stats.happy}</p>
              <p className="text-[10px] text-os-text-dim">sent the review link if set</p>
            </GlassCard>
            <GlassCard className="p-4">
              <p className="text-[11px] text-os-text-dim">Unhappy (1-2)</p>
              <p className="text-2xl font-bold text-rose-400 mt-1">{stats.unhappy}</p>
              <p className="text-[10px] text-os-text-dim">went to Talk to team</p>
            </GlassCard>
          </div>
        )}
        {stats && stats.answered > 0 && (
          <GlassCard className="p-4 space-y-1.5">
            {[5, 4, 3, 2, 1].map((r) => (
              <div key={r} className="flex items-center gap-2 text-[11px] text-os-text-dim">
                <span className="w-6">{r}★</span>
                <span className="flex-1 h-2 rounded-full bg-white/[0.05] overflow-hidden">
                  <span className={`block h-full ${r >= 4 ? "bg-emerald-500" : r === 3 ? "bg-amber-400" : "bg-rose-500"}`}
                    style={{ width: `${(100 * (stats.spread[String(r)] || 0)) / spreadMax}%` }} />
                </span>
                <span className="w-8 text-right">{stats.spread[String(r)] || 0}</span>
              </div>
            ))}
          </GlassCard>
        )}

        <div className="flex gap-1.5 flex-wrap">
          {SHOW.map((t) => (
            <button key={t.key} type="button" onClick={() => setShow(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer ${show === t.key ? "bg-teal/20 text-teal font-semibold" : "bg-white/[0.04] text-os-text-dim hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {!rows ? <Skeleton className="h-32 w-full" /> : rows.length === 0 ? (
          <GlassCard className="p-5"><EmptyState icon={Smile} title="No answers yet" description="Once feedback is on, answers show here." /></GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {rows.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="w-16 shrink-0 pt-0.5">{face(r.rating)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white font-semibold truncate">{r.customer_name || "Unnamed customer"}</span>
                    <span className="block text-[11px] text-os-text-dim">
                      {r.about} · {r.answered_via === "voice" ? "by call" : r.answered_via === "whatsapp" ? "on WhatsApp" : r.status.replace("_", " ")} · {when(r.answered_at || r.created_at)}
                    </span>
                    {r.comment && <span className="block text-xs text-white/90 mt-1">“{r.comment}”</span>}
                    {r.note && <span className="block text-[10px] text-amber-300 mt-1">{r.note}</span>}
                  </span>
                  {r.rating !== null && r.rating <= 2 && (
                    <Link href="/talk-to-team" className="text-[11px] text-teal hover:underline shrink-0">Talk to team</Link>
                  )}
                </div>
              ))}
            </div>
          </GlassCard>
        )}
      </div>
    </AppLayout>
  );
}

function SettingsCard() {
  const [data, setData] = useState<FeedbackSettingsOut | null>(null);
  const [draft, setDraft] = useState<FeedbackSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const take = (d: FeedbackSettingsOut) => {
    setData(d);
    setDraft({ enabled: d.enabled, triggers: d.triggers, delay_minutes: d.delay_minutes, channel: d.channel,
      call_after_hours: d.call_after_hours, cooldown_days: d.cooldown_days, ask_review: d.ask_review });
  };
  useEffect(() => { feedback.settings().then(take).catch((e) => setError(e instanceof Error ? e.message : "Could not load.")); }, []);
  if (!data || !draft) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton className="h-40 w-full" />;

  const set = (patch: Partial<FeedbackSettings>) => { setDraft({ ...draft, ...patch }); setMsg(null); };
  const toggleTrigger = (key: string) =>
    set({ triggers: draft.triggers.includes(key) ? draft.triggers.filter((t) => t !== key) : [...draft.triggers, key] });
  const save = async () => {
    setBusy(true); setError(null);
    try { take(await feedback.save(draft)); setMsg("Saved"); } catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setBusy(false); }
  };
  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const out = await feedback.submitTemplate();
      setMsg(out.failed.length ? `Meta refused it: ${out.failed[0].error}` : "Sent to Meta - approval usually takes a few minutes to a day.");
      take(await feedback.settings());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send it."); }
    finally { setBusy(false); }
  };
  const usesWhatsApp = draft.channel !== "voice";
  const templateOk = data.template_state === "approved";

  return (
    <GlassCard className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">Ask customers how it went</p>
          <p className="text-[11px] text-os-text-dim mt-0.5">One short question after a visit, an order or a chat. Unhappy answers go straight to Talk to team.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-white cursor-pointer shrink-0">
          <input type="checkbox" className="w-4 h-4 accent-teal" checked={draft.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          {draft.enabled ? "On" : "Off"}
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-[11px] font-semibold text-os-text-dim mb-1.5">When to ask</p>
          <div className="space-y-1.5">
            {Object.entries(data.trigger_labels).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-white cursor-pointer">
                <input type="checkbox" className="accent-teal" checked={draft.triggers.includes(key)} onChange={() => toggleTrigger(key)} />
                {label}
              </label>
            ))}
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-white">
            Ask
            <select value={draft.delay_minutes} onChange={(e) => set({ delay_minutes: Number(e.target.value) })} className={pick}>
              {DELAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            after
          </div>
          <div className="flex items-center gap-2 mt-2 text-xs text-white">
            Ask the same customer at most once in
            <select value={draft.cooldown_days} onChange={(e) => set({ cooldown_days: Number(e.target.value) })} className={pick}>
              {COOLDOWNS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div>
          <p className="text-[11px] font-semibold text-os-text-dim mb-1.5">How to ask</p>
          <div className="flex gap-1.5 flex-wrap">
            {([["whatsapp", "WhatsApp", MessageSquare], ["voice", "Call", PhoneCall], ["both", "WhatsApp, then call", Send]] as [FeedbackChannel, string, React.ElementType][]).map(([key, label, Icon]) => (
              <button key={key} type="button" onClick={() => set({ channel: key })}
                className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer border flex items-center gap-1.5 ${draft.channel === key ? "border-teal bg-teal/15 text-white" : "border-white/[0.1] text-os-text-dim hover:text-white"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
          {draft.channel === "both" && (
            <div className="flex items-center gap-2 mt-2 text-xs text-white">
              Call if no answer on WhatsApp in
              <select value={draft.call_after_hours} onChange={(e) => set({ call_after_hours: Number(e.target.value) })} className={pick}>
                {CALL_AFTER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          )}
          <p className="text-[10px] text-os-text-dim mt-2 leading-relaxed">
            {draft.channel === "voice"
              ? "A short call: rate 1 to 5, and anything to do better. Calls are paid from your voice wallet."
              : "WhatsApp: three buttons - Great / Okay / Not good. After Okay or Not good, they are asked what went wrong."}
            {draft.channel === "both" ? " Calls are paid from your voice wallet." : ""}
          </p>

          {usesWhatsApp && (
            <div className="mt-3 rounded-lg border border-white/[0.08] p-2.5 text-[11px]">
              <span className="text-os-text-dim">WhatsApp template: </span>
              <Badge variant={templateOk ? "emerald" : data.template_state === "pending" ? "amber" : "rose"} size="sm">
                {templateOk ? "Approved" : data.template_state === "pending" ? "Waiting for Meta" : data.template_state === "rejected" ? "Rejected" : "Not created"}
              </Badge>
              {data.template_reason && <span className="block text-rose-300 mt-1">{data.template_reason}</span>}
              {(data.template_state === "missing") && (
                <button type="button" disabled={busy} onClick={submit} className="block mt-2 text-teal hover:underline cursor-pointer">
                  Send the template to Meta for approval
                </button>
              )}
            </div>
          )}

          <label className={`flex items-start gap-2 text-xs mt-3 ${data.review_allowed ? "text-white cursor-pointer" : "text-os-text-dim"}`}>
            <input type="checkbox" className="mt-0.5 accent-teal" disabled={!data.review_allowed} checked={draft.ask_review && data.review_allowed}
              onChange={(e) => set({ ask_review: e.target.checked })} />
            <span>
              Send happy customers your Google review link
              <span className="block text-[10px] text-os-text-dim">
                {!data.review_allowed ? "Not allowed for your type of business." : data.review_link_set ? "Only to those who tapped Great." : "Add your Google review link in Settings first."}
              </span>
            </span>
          </label>
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      <div className="flex items-center justify-end gap-3">
        {msg && <span className="text-[11px] text-emerald-400">{msg}</span>}
        <button type="button" disabled={busy} onClick={save} className="px-5 py-2 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
          {busy ? "Saving..." : "Save"}
        </button>
      </div>
    </GlassCard>
  );
}

export default function Page() {
  return (
    <OwnerAdminOnly title="Feedback">
      <FeedbackPage />
    </OwnerAdminOnly>
  );
}
