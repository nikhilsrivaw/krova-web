"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Globe, Hand, Headphones, Instagram, MessageSquare, Phone, PhoneCall, RotateCcw, UserPlus } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { CustomerBriefing } from "@/components/team/CustomerBriefing";
import { useRole } from "@/lib/useRole";
import { account, calls, team, teamRequests, type TeamMember, type TeamRequestItem } from "@/lib/api";

const CHANNEL: Record<TeamRequestItem["channel"], { label: string; icon: React.ElementType }> = {
  voice: { label: "Call", icon: PhoneCall },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  instagram: { label: "Instagram", icon: Instagram },
  web: { label: "Website chat", icon: Globe },
};
const SOURCE: Record<TeamRequestItem["source"], string> = {
  customer: "asked for a person", missed_call: "missed call - call back", staff: "added by the team",
};
const TABS = [
  { key: "waiting", label: "Waiting" },
  { key: "mine", label: "Mine" },
  { key: "done", label: "Done" },
] as const;

function ago(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min`;
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  return `${Math.floor(minutes / (60 * 24))} d`;
}

/**
 * Talk to team: customers who asked to speak to a person - on a call, WhatsApp, Instagram or the website chat - or
 * are owed a call back after a missed call. Whoever is free takes one; the side panel has the whole story (every
 * channel, notes, promises, the next visit), a call button and the chat, and closing it leaves a note on the customer.
 * Backend: services/api/routers/team_requests.py, shared/team/requests.py.
 */
export default function TalkToTeamPage() {
  const { role } = useRole();
  const supervisor = role === "owner" || role === "admin";
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("waiting");
  const [rows, setRows] = useState<TeamRequestItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<TeamRequestItem | null>(null);
  const [me, setMe] = useState<string | null>(null);

  const load = useCallback(() => {
    const call = tab === "done" ? teamRequests.list("done") : teamRequests.list("waiting", tab === "mine");
    call.then(setRows).catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, [tab]);
  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => {
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);
  useEffect(() => { account.profile().then((p) => setMe(p.user_id)).catch(() => undefined); }, []);

  const changed = (item: TeamRequestItem) => {
    setOpen(item.status === "done" || item.status === "cancelled" ? null : item);
    load();
  };

  return (
    <AppLayout title="Talk to team" subtitle="Customers who asked for a person - whoever is free takes them">
      <div className="space-y-4">
        <div className="flex gap-1.5">
          {TABS.map((t) => (
            <button key={t.key} type="button" onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-lg text-xs cursor-pointer ${tab === t.key ? "bg-teal/20 text-teal font-semibold" : "bg-white/[0.04] text-os-text-dim hover:text-white"}`}>
              {t.label}
            </button>
          ))}
        </div>
        {error && <p className="text-xs text-red-400">{error}</p>}
        {!rows ? <Skeleton className="h-40 w-full" /> : rows.length === 0 ? (
          <GlassCard className="p-5">
            <EmptyState icon={Headphones} title={tab === "done" ? "Nothing closed yet" : "Nobody is waiting"}
              description="When a customer asks to talk to the team on a call, WhatsApp, Instagram or the website chat, it shows here." />
          </GlassCard>
        ) : (
          <GlassCard className="p-0 overflow-hidden">
            <div className="divide-y divide-white/[0.06]">
              {rows.map((r) => {
                const ch = CHANNEL[r.channel] ?? CHANNEL.whatsapp;
                const waiting = r.status === "open";
                return (
                  <button key={r.id} type="button" onClick={() => setOpen(r)}
                    className="w-full text-left px-4 py-3 hover:bg-white/[0.03] cursor-pointer flex items-start gap-3">
                    <span className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${waiting ? "bg-amber-500/15 text-amber-300" : "bg-white/[0.05] text-os-text-dim"}`}>
                      <ch.icon className="w-4 h-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold text-white truncate">{r.customer_name || "Unnamed customer"}</span>
                      <span className="block text-xs text-os-text-dim line-clamp-2">{r.what}</span>
                      <span className="block text-[10px] text-os-text-dim mt-1">
                        {ch.label} · {SOURCE[r.source]}{r.team ? ` · ${r.team}` : ""}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      {r.status === "open" && <Badge variant="amber" size="sm">Waiting {ago(r.created_at)}</Badge>}
                      {r.status === "taken" && <Badge variant="cyan" size="sm">{r.taken_by?.user_id === me ? "You" : r.taken_by?.name || "Taken"}</Badge>}
                      {(r.status === "done" || r.status === "cancelled") && (
                        <Badge variant={r.status === "done" ? "emerald" : "outline"} size="sm">{r.status === "done" ? "Done" : "Closed"}</Badge>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </GlassCard>
        )}
      </div>

      {open && <RequestPanel item={open} me={me} supervisor={supervisor} onClose={() => setOpen(null)} onChanged={changed} />}
    </AppLayout>
  );
}

function RequestPanel({ item, me, supervisor, onClose, onChanged }: {
  item: TeamRequestItem; me: string | null; supervisor: boolean; onClose: () => void; onChanged: (i: TeamRequestItem) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [people, setPeople] = useState<TeamMember[]>([]);
  const [assignTo, setAssignTo] = useState("");
  const mine = item.status === "taken" && item.taken_by?.user_id === me;
  const someoneElse = item.status === "taken" && !mine;
  const closed = item.status === "done" || item.status === "cancelled";
  const ch = CHANNEL[item.channel] ?? CHANNEL.whatsapp;

  useEffect(() => { if (supervisor) team.list().then(setPeople).catch(() => undefined); }, [supervisor]);

  const run = async (fn: () => Promise<TeamRequestItem>) => {
    setBusy(true); setError(null);
    try { onChanged(await fn()); } catch (e) { setError(e instanceof Error ? e.message : "Could not do that."); }
    finally { setBusy(false); }
  };
  const callNow = async () => {
    setBusy(true); setError(null);
    try {
      if (!mine) onChanged(await teamRequests.take(item.id, someoneElse && supervisor));
      await calls.start(item.customer_id);
      setInfo("Calling - your phone rings first, then the customer is joined.");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not start the call."); }
    finally { setBusy(false); }
  };

  return (
    <Drawer isOpen onClose={onClose} title={item.customer_name || "Unnamed customer"} subtitle={`${ch.label} · ${SOURCE[item.source]}`} width="lg">
      <div className="space-y-4">
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
          <p className="text-[11px] font-semibold text-amber-300 flex items-center gap-1"><Headphones className="w-3.5 h-3.5" /> What they want</p>
          <p className="text-sm text-white mt-1 whitespace-pre-wrap">{item.what.split(" | ").join("\n")}</p>
          <p className="text-[10px] text-os-text-dim mt-1.5">
            Asked {ago(item.created_at)} ago{item.team ? ` · ${item.team} team` : ""}
            {item.taken_by ? ` · ${mine ? "You are" : `${item.taken_by.name || "A teammate"} is`} on it` : ""}
          </p>
        </div>

        {!closed && (
          <div className="flex flex-wrap gap-2">
            {!mine && (
              <button type="button" disabled={busy || (someoneElse && !supervisor)} onClick={() => run(() => teamRequests.take(item.id, someoneElse))}
                className="px-3 py-2 rounded-lg bg-teal text-[#14151F] text-xs font-bold flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
                <Hand className="w-3.5 h-3.5" /> {someoneElse ? "Take over" : "I'll take it"}
              </button>
            )}
            <button type="button" disabled={busy || (someoneElse && !supervisor)} onClick={callNow}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs flex items-center gap-1.5 disabled:opacity-40 cursor-pointer">
              <Phone className="w-3.5 h-3.5" /> Call now
            </button>
            <Link href={`/app/inbox/${item.customer_id}`}
              className="px-3 py-2 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" /> Open chat
            </Link>
            {mine && (
              <button type="button" disabled={busy} onClick={() => run(() => teamRequests.release(item.id))}
                className="px-3 py-2 rounded-lg text-os-text-dim hover:text-white text-xs flex items-center gap-1.5 cursor-pointer">
                <RotateCcw className="w-3.5 h-3.5" /> Put back
              </button>
            )}
          </div>
        )}
        {someoneElse && !supervisor && <p className="text-[11px] text-os-text-dim">{item.taken_by?.name || "A teammate"} is on this one.</p>}
        {info && <p className="text-[11px] text-emerald-400">{info}</p>}

        {supervisor && !closed && people.length > 0 && (
          <div className="flex items-center gap-2">
            <UserPlus className="w-3.5 h-3.5 text-os-text-dim" />
            <select value={assignTo} onChange={(e) => setAssignTo(e.target.value)}
              className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none">
              <option value="">Give it to…</option>
              {people.map((p) => <option key={p.user_id} value={p.user_id}>{p.full_name || p.user_id}{p.available === false ? " (away)" : ""}</option>)}
            </select>
            <button type="button" disabled={!assignTo || busy} onClick={() => run(() => teamRequests.assign(item.id, assignTo))}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-white text-xs disabled:opacity-40 cursor-pointer">Give</button>
          </div>
        )}

        <CustomerBriefing customerId={item.customer_id} />

        {closed ? (
          <div className="rounded-xl border border-white/[0.08] p-3">
            <p className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> {item.status === "done" ? "Done" : "Closed"}</p>
            {item.outcome && <p className="text-xs text-white mt-1 whitespace-pre-wrap">{item.outcome}</p>}
          </div>
        ) : (mine || supervisor || item.status === "open") && (
          <div className="space-y-2">
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} maxLength={2000}
              placeholder="What happened? (e.g. Called him - visit fixed for Monday 11am). Saved on the customer for the whole team."
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none" />
            <div className="flex items-center justify-between gap-2">
              <button type="button" disabled={busy} onClick={() => run(() => teamRequests.done(item.id, note || null, true))}
                className="text-xs text-os-text-dim hover:text-white cursor-pointer">Close without talking</button>
              <button type="button" disabled={busy} onClick={() => run(() => teamRequests.done(item.id, note || null))}
                className="px-4 py-2 rounded-lg bg-emerald-500 text-[#14151F] text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 cursor-pointer">
                <CheckCircle2 className="w-3.5 h-3.5" /> Done
              </button>
            </div>
          </div>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>
    </Drawer>
  );
}
