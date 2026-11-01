"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ClipboardPaste, Download, FileUp, Frown, Meh, MessageSquare, PhoneCall, Plus, Smile, Star, Trash2, UserPlus,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { OwnerAdminOnly } from "@/components/shell/OwnerAdminOnly";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  feedback, type FeedbackAdded, type FeedbackResponse, type FeedbackRound, type FeedbackSettings, type FeedbackSettingsOut,
  type FeedbackStats,
} from "@/lib/api";

const pick = "px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
const label = "block text-[11px] font-semibold text-os-text-dim mb-1";
const SHOW = [
  { key: "answered", label: "All answers" }, { key: "unhappy", label: "Unhappy" }, { key: "happy", label: "Happy" },
  { key: "comments", label: "With a comment" }, { key: "waiting", label: "Still waiting" },
] as const;
const DELAYS = [[0, "Right away"], [30, "30 minutes"], [60, "1 hour"], [120, "2 hours"], [240, "4 hours"], [1440, "Next day"]] as const;
const COOLDOWNS = [[0, "No limit"], [3, "3 days"], [7, "7 days"], [14, "14 days"], [30, "30 days"]] as const;
const GAPS = [[1, "1 hour"], [2, "2 hours"], [4, "4 hours"], [6, "6 hours"], [12, "12 hours"], [24, "1 day"], [48, "2 days"], [72, "3 days"], [168, "1 week"]] as const;
const HOURS = Array.from({ length: 25 }, (_, h) => h);
const hourLabel = (h: number) => (h === 0 || h === 24 ? "12 AM" : h === 12 ? "12 PM" : h < 12 ? `${h} AM` : `${h - 12} PM`);
const SOURCE: Record<string, string> = { upload: "from your file", paste: "from your list", form: "added by hand", api: "from your software" };

function face(rating: number | null) {
  if (rating === null) return <span className="text-[11px] text-os-text-dim">-</span>;
  const Icon = rating >= 4 ? Smile : rating === 3 ? Meh : Frown;
  const color = rating >= 4 ? "text-emerald-400" : rating === 3 ? "text-amber-300" : "text-rose-400";
  return <span className={`inline-flex items-center gap-1 text-xs font-bold ${color}`}><Icon className="w-4 h-4" />{rating}/5</span>;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) : "";

/**
 * Feedback: ask customers how a visit, trip, order or chat went - on WhatsApp, by call, in rounds until they answer -
 * about things KROVA saw finish or ones the business adds itself (a file, a pasted list, a form, the API).
 * Unhappy answers go to Talk to team; happy ones get the review link. Rules: shared/care/feedback.py.
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
    <AppLayout title="Feedback" subtitle="How customers felt about a visit, a trip, an order or a chat">
      <div className="space-y-5">
        <SettingsCard />
        <AddCustomersCard onAdded={load} />

        {stats && (
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-5">
            <Tile title="Average rating" value={<>{stats.average ?? "-"} <Star className="w-5 h-5 text-amber-300 fill-amber-300" /></>} hint={`last ${stats.days} days`} />
            <Tile title="Answered" value={<>{stats.answered}<span className="text-sm text-os-text-dim"> / {stats.asked}</span></>} hint="of those asked" />
            <Tile title="Still waiting" value={stats.waiting} hint="more rounds to go" />
            <Tile title="Happy (4-5)" value={<span className="text-emerald-400">{stats.happy}</span>} hint="sent the review link if set" />
            <Tile title="Unhappy (1-2)" value={<span className="text-rose-400">{stats.unhappy}</span>} hint="went to Talk to team" />
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
          <GlassCard className="p-5"><EmptyState icon={Smile} title="Nothing here yet" description="Once feedback is on, answers show here." /></GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {rows.map((r) => (
                <div key={r.id} className="px-4 py-3 flex items-start gap-3">
                  <span className="w-16 shrink-0 pt-0.5">{face(r.rating)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-white font-semibold truncate">{r.customer_name || "Unnamed customer"}</span>
                    <span className="block text-[11px] text-os-text-dim">
                      {r.about}
                      {r.answered_via ? ` · ${r.answered_via === "voice" ? "by call" : "on WhatsApp"} · ${when(r.answered_at)}` : ""}
                      {SOURCE[r.source] ? ` · ${SOURCE[r.source]}` : ""}
                      {r.round > 0 ? ` · asked ${r.round} time${r.round === 1 ? "" : "s"}` : ""}
                    </span>
                    {!r.answered_via && (
                      <span className="block text-[10px] text-os-text-dim">
                        {r.status === "no_reply" ? "No answer after every round" : r.status === "skipped" ? "Not asked" : r.next_at ? `Next round ${when(r.next_at)}` : ""}
                      </span>
                    )}
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

function Tile({ title, value, hint }: { title: string; value: React.ReactNode; hint: string }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[11px] text-os-text-dim">{title}</p>
      <p className="text-2xl font-bold text-white mt-1 flex items-center gap-1.5">{value}</p>
      <p className="text-[10px] text-os-text-dim">{hint}</p>
    </GlassCard>
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
    setDraft({ enabled: d.enabled, triggers: d.triggers, delay_minutes: d.delay_minutes, cooldown_days: d.cooldown_days,
      ask_review: d.ask_review, rounds: d.rounds, ask_from: d.ask_from, ask_until: d.ask_until, review_link: d.review_link });
  };
  useEffect(() => { feedback.settings().then(take).catch((e) => setError(e instanceof Error ? e.message : "Could not load.")); }, []);
  if (!data || !draft) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton className="h-40 w-full" />;

  const set = (patch: Partial<FeedbackSettings>) => { setDraft({ ...draft, ...patch }); setMsg(null); };
  const setRound = (i: number, patch: Partial<FeedbackRound>) =>
    set({ rounds: draft.rounds.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
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
      setMsg(out.failed.length ? `Meta refused one: ${out.failed[0].error}` : "Sent to Meta - approval usually takes minutes, at most a day.");
      take(await feedback.settings());
    } catch (e) { setError(e instanceof Error ? e.message : "Could not send it."); }
    finally { setBusy(false); }
  };
  const usesWhatsApp = draft.rounds.some((r) => r.channel === "whatsapp");
  const usesCall = draft.rounds.some((r) => r.channel === "voice");
  const stateBadge = (state: string) => (
    <Badge variant={state === "approved" ? "emerald" : state === "pending" ? "amber" : "rose"} size="sm">
      {state === "approved" ? "Approved" : state === "pending" ? "Waiting for Meta" : state === "rejected" ? "Rejected" : "Not created"}
    </Badge>
  );

  return (
    <GlassCard className="p-5 space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white">Ask customers how it went</p>
          <p className="text-[11px] text-os-text-dim mt-0.5">One short question, asked again in rounds until they answer. Unhappy answers go straight to Talk to team.</p>
        </div>
        <label className="flex items-center gap-2 text-xs text-white cursor-pointer shrink-0">
          <input type="checkbox" className="w-4 h-4 accent-teal" checked={draft.enabled} onChange={(e) => set({ enabled: e.target.checked })} />
          {draft.enabled ? "On" : "Off"}
        </label>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="space-y-3">
          <div>
            <p className={label}>Ask about these automatically</p>
            <div className="space-y-1.5">
              {Object.entries(data.trigger_labels).map(([key, text]) => (
                <label key={key} className="flex items-center gap-2 text-xs text-white cursor-pointer">
                  <input type="checkbox" className="accent-teal" checked={draft.triggers.includes(key)} onChange={() => toggleTrigger(key)} />
                  {text}
                </label>
              ))}
              <p className="text-[10px] text-os-text-dim">Customers you add yourself (below) are always asked.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-white flex-wrap">
            First ask
            <select value={draft.delay_minutes} onChange={(e) => set({ delay_minutes: Number(e.target.value) })} className={pick}>
              {DELAYS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            {draft.delay_minutes ? "after it is over" : ""}
          </div>
          <div className="flex items-center gap-2 text-xs text-white flex-wrap">
            Only ask between
            <select value={draft.ask_from} onChange={(e) => set({ ask_from: Number(e.target.value) })} className={pick}>
              {HOURS.slice(0, 24).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
            and
            <select value={draft.ask_until} onChange={(e) => set({ ask_until: Number(e.target.value) })} className={pick}>
              {HOURS.slice(1).map((h) => <option key={h} value={h}>{hourLabel(h)}</option>)}
            </select>
          </div>
          <div className="flex items-center gap-2 text-xs text-white flex-wrap">
            Ask the same customer at most once in
            <select value={draft.cooldown_days} onChange={(e) => set({ cooldown_days: Number(e.target.value) })} className={pick}>
              {COOLDOWNS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
        </div>

        <div className="space-y-3">
          <div>
            <p className={label}>Rounds - asked until they answer</p>
            <div className="space-y-2">
              {draft.rounds.map((r, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white flex-wrap rounded-lg border border-white/[0.08] px-2.5 py-2">
                  <span className="w-16 text-os-text-dim">Round {i + 1}</span>
                  {(["whatsapp", "voice"] as const).map((c) => (
                    <button key={c} type="button" onClick={() => setRound(i, { channel: c })}
                      className={`px-2.5 py-1 rounded-md border flex items-center gap-1 cursor-pointer ${r.channel === c ? "border-teal bg-teal/15 text-white" : "border-white/[0.1] text-os-text-dim hover:text-white"}`}>
                      {c === "whatsapp" ? <MessageSquare className="w-3 h-3" /> : <PhoneCall className="w-3 h-3" />}
                      {c === "whatsapp" ? "WhatsApp" : "Call"}
                    </button>
                  ))}
                  {i === 0 ? <span className="text-os-text-dim">first</span> : (
                    <>
                      <span className="text-os-text-dim">if no answer, after</span>
                      <select value={r.wait_hours} onChange={(e) => setRound(i, { wait_hours: Number(e.target.value) })} className={pick}>
                        {GAPS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                      </select>
                    </>
                  )}
                  {draft.rounds.length > 1 && (
                    <button type="button" onClick={() => set({ rounds: draft.rounds.filter((_, j) => j !== i) })} aria-label="Remove round"
                      className="ml-auto p-1 text-os-text-dim hover:text-white cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                  )}
                </div>
              ))}
              {draft.rounds.length < 5 && (
                <button type="button" onClick={() => set({ rounds: [...draft.rounds, { channel: "voice", wait_hours: 24 }] })}
                  className="text-xs text-teal hover:underline flex items-center gap-1 cursor-pointer"><Plus className="w-3.5 h-3.5" /> Add a round</button>
              )}
            </div>
            <p className="text-[10px] text-os-text-dim mt-1.5 leading-relaxed">
              It stops the moment they answer. WhatsApp: three buttons - Great / Okay / Not good. Call: rate 1 to 5 and anything to do better.
              {usesCall ? " Calls are paid from your voice wallet." : ""}
            </p>
          </div>

          {usesWhatsApp && (
            <div className="rounded-lg border border-white/[0.08] p-2.5 text-[11px] space-y-1">
              <p><span className="text-os-text-dim">Feedback template: </span>{stateBadge(data.template_state)}</p>
              {usesCall && <p><span className="text-os-text-dim">Review link after a call: </span>{stateBadge(data.review_template_state)}</p>}
              {data.template_reason && <p className="text-rose-300">{data.template_reason}</p>}
              {(data.template_state === "missing" || (usesCall && data.review_template_state === "missing")) && (
                <button type="button" disabled={busy} onClick={submit} className="text-teal hover:underline cursor-pointer">Send the templates to Meta for approval</button>
              )}
            </div>
          )}

          <div>
            <label className={`flex items-start gap-2 text-xs ${data.review_allowed ? "text-white cursor-pointer" : "text-os-text-dim"}`}>
              <input type="checkbox" className="mt-0.5 accent-teal" disabled={!data.review_allowed} checked={draft.ask_review && data.review_allowed}
                onChange={(e) => set({ ask_review: e.target.checked })} />
              <span>
                Send happy customers (4-5) your review link
                <span className="block text-[10px] text-os-text-dim">{data.review_allowed ? "Any review page - Google, redBus, Justdial, your own site." : "Not allowed for your type of business."}</span>
              </span>
            </label>
            {data.review_allowed && draft.ask_review && (
              <input value={draft.review_link ?? ""} onChange={(e) => set({ review_link: e.target.value || null })}
                placeholder={data.review_link_set ? "Leave empty to use your Google review link from Settings" : "https://g.page/r/... or your review page"}
                className={`${input} mt-2`} />
            )}
          </div>
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

/** Same clean-up as the server (shared/care/feedback.py clean_what): "how was the product?" -> "product". */
function cleanWhat(text: string) {
  let what = text.split(/\s+/).filter(Boolean).join(" ");
  for (let i = 0; i < 2; i++) {
    what = what
      .replace(/^(?:(?:how|hows|how's)\s+(?:was|is|did|were)\s+(?:you\s+(?:find|like)\s+)?|feedback\s+(?:on|for|about)\s+|please\s+rate\s+)?(?:(?:the|your|my|our)\b)?\s*/i, "")
      .replace(/\s*(?:kaisa|kaisi|kaise)\s*(?:tha|thi|the|laga|lagi|rha|rhi|raha|rahi)?\s*$|[\s?!.]+$/i, "")
      .trim();
  }
  return what;
}

function preview(about: string, date: string) {
  const what = cleanWhat(about) || "visit";
  if (/\d/.test(what)) return what;
  const day = date ? new Date(`${date}T00:00:00`) : new Date();
  return `${what} on ${day.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

const SAMPLE ="Name,Phone,What,Date\nRavi Kumar,9876543210,Delhi to Jaipur bus,02/11/2026 06:00\nNeha Gupta,9123456780,AC repair,01/11/2026\n";

function AddCustomersCard({ onAdded }: { onAdded: () => void }) {
  const [tab, setTab] = useState<"file" | "paste" | "form">("file");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<FeedbackAdded | null>(null);
  const [text, setText] = useState("");
  const [person, setPerson] = useState({ name: "", phone: "", about: "", date: "", time: "" });

  const run = async (fn: () => Promise<FeedbackAdded>) => {
    setBusy(true); setError(null); setResult(null);
    try { setResult(await fn()); onAdded(); } catch (e) { setError(e instanceof Error ? e.message : "Could not add them."); }
    finally { setBusy(false); }
  };
  const sample = () => {
    const url = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "feedback-customers.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <GlassCard className="p-5 space-y-4">
      <div>
        <p className="text-sm font-bold text-white flex items-center gap-2"><UserPlus className="w-4 h-4 text-teal" /> Add customers to ask</p>
        <p className="text-[11px] text-os-text-dim mt-0.5">
          For things that happened outside KROVA - a ticket sold on another app, a walk-in sale, a job done on site. They are asked on the rounds above,
          after the date you give. Your software can also send them with an API key (POST /public-api/feedback).
        </p>
      </div>
      <div className="flex gap-1.5">
        {([["file", "Upload a file", FileUp], ["paste", "Paste a list", ClipboardPaste], ["form", "One customer", UserPlus]] as const).map(([key, text2, Icon]) => (
          <button key={key} type="button" onClick={() => { setTab(key); setResult(null); setError(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer flex items-center gap-1.5 ${tab === key ? "bg-teal/20 text-teal font-semibold" : "bg-white/[0.04] text-os-text-dim hover:text-white"}`}>
            <Icon className="w-3.5 h-3.5" />{text2}
          </button>
        ))}
      </div>

      {tab === "file" && (
        <div className="space-y-2">
          <label className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-white/[0.15] py-6 cursor-pointer hover:bg-white/[0.02]">
            <FileUp className="w-5 h-5 text-os-text-dim" />
            <span className="text-xs text-white">{busy ? "Adding..." : "Choose a CSV or Excel (.xlsx) file"}</span>
            <span className="text-[10px] text-os-text-dim">Up to 2,000 customers, 2 MB</span>
            <input type="file" accept=".csv,.xlsx,.txt,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" className="hidden" disabled={busy}
              onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) run(() => feedback.upload(f)); }} />
          </label>
          <p className="text-[10px] text-os-text-dim">
            Columns, in any order and with your own names: name (Passenger, Customer), phone (Mobile, Contact), what (Route, Trip, Service, Product),
            date (Travel date, Visit date - 02/11/2026 or 2 Nov 2026), optional time and booking id (PNR, Ticket). Old .xls files: save as .xlsx first.
          </p>
          <button type="button" onClick={sample} className="text-[11px] text-teal hover:underline flex items-center gap-1 cursor-pointer">
            <Download className="w-3.5 h-3.5" /> Download a sample file
          </button>
        </div>
      )}

      {tab === "paste" && (
        <div className="space-y-2">
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5}
            placeholder={"Copy rows from Excel or Google Sheets, or type one per line:\nRavi Kumar, 9876543210, Delhi to Jaipur bus, 2 Nov 2026\nNeha Gupta, 9123456780, AC repair, 1 Nov 2026"}
            className={input} />
          <p className="text-[10px] text-os-text-dim">With a header row, columns are matched by name; without one, the order is name, phone, what, date.</p>
          <button type="button" disabled={busy || !text.trim()} onClick={() => run(() => feedback.paste(text))}
            className="px-4 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold disabled:opacity-50 cursor-pointer">{busy ? "Adding..." : "Add these"}</button>
        </div>
      )}

      {tab === "form" && (
        <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block"><span className={label}>Name</span><input value={person.name} onChange={(e) => setPerson({ ...person, name: e.target.value })} className={input} placeholder="Ravi Kumar" /></label>
            <label className="block"><span className={label}>Phone</span><input value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} className={input} placeholder="98765 43210" inputMode="tel" /></label>
            <label className="block sm:col-span-2">
              <span className={label}>What to ask about - the thing, not a question</span>
              <input value={person.about} onChange={(e) => setPerson({ ...person, about: e.target.value })} className={input} placeholder="Delhi to Jaipur bus, order, AC repair" />
              <span className="block text-[10px] text-os-text-dim mt-1">
                They get: “Hi! How was your <span className="text-white">{preview(person.about, person.date)}</span> with your business? Tap a button below…”
              </span>
            </label>
            <label className="block"><span className={label}>When it happened</span><input type="date" value={person.date} onChange={(e) => setPerson({ ...person, date: e.target.value })} className={input} /></label>
            <label className="block"><span className={label}>Time (optional)</span><input type="time" value={person.time} onChange={(e) => setPerson({ ...person, time: e.target.value })} className={input} /></label>
          </div>
          <button type="button" disabled={busy || person.phone.replace(/\D/g, "").length < 10}
            onClick={() => run(() => feedback.add({ ...person, name: person.name || undefined, about: person.about || undefined, date: person.date || undefined, time: person.time || undefined }))}
            className="px-4 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold disabled:opacity-50 cursor-pointer">{busy ? "Adding..." : "Add"}</button>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
      {result && (
        <div className="rounded-lg border border-white/[0.08] p-3 text-xs space-y-1">
          <p className="text-emerald-400 font-semibold">{result.added} added{result.skipped.length ? `, ${result.skipped.length} skipped` : ""}.</p>
          {result.waiting_for_switch && <p className="text-amber-300">Feedback is off - they will be asked once you switch it on.</p>}
          {result.skipped.slice(0, 20).map((s) => <p key={s.row} className="text-os-text-dim">Row {s.row}: {s.reason}</p>)}
          {result.skipped.length > 20 && <p className="text-os-text-dim">…and {result.skipped.length - 20} more.</p>}
        </div>
      )}
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
