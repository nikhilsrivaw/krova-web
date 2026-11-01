"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Globe, Headphones, Instagram, MessageSquare, Phone, PhoneCall } from "lucide-react";
import { account, calls, teamRequests, type TeamRequestItem } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { appPath } from "@/lib/app-nav";
import { CustomerBriefing } from "@/components/team/CustomerBriefing";

const CHANNEL: Record<string, { label: string; icon: typeof MessageSquare }> = {
  voice: { label: "Call", icon: PhoneCall },
  whatsapp: { label: "WhatsApp", icon: MessageSquare },
  instagram: { label: "Instagram", icon: Instagram },
  web: { label: "Website", icon: Globe },
};

function waited(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `${hrs}h ${mins % 60}m` : `${Math.floor(hrs / 24)}d`;
}

/**
 * Talk to team on the phone: customers who asked for a person, waiting for whoever is free. Take one, call or chat,
 * then close it with a note - the same requests as the desktop page (shared/team/requests.py).
 */
export default function AppTalkToTeamPage() {
  const [rows, setRows] = useState<TeamRequestItem[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [supervisor, setSupervisor] = useState(false);
  const me = getUserId();

  const load = useCallback(() => {
    teamRequests.list("waiting").then(setRows).catch(() => setRows([]));
  }, []);
  useEffect(() => {
    load();
    account.profile().then((p) => setSupervisor(p.role === "owner" || p.role === "admin")).catch(() => {});
    const timer = setInterval(load, 15000);
    return () => clearInterval(timer);
  }, [load]);

  const act = async (id: string, fn: () => Promise<unknown>, after?: string) => {
    setBusy(id); setError(null); setInfo(null);
    try { await fn(); if (after) setInfo(after); load(); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not do that."); }
    finally { setBusy(null); }
  };

  return (
    <div className="px-4 pt-5 pb-24 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-1 flex items-center gap-2">
        <Headphones className="w-4 h-4 text-teal" /> Talk to team
      </h1>
      <p className="text-xs text-os-text-dim mb-5">Customers who asked for a person. Whoever is free takes one.</p>
      {error && <div role="alert" className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-100">{error}</div>}
      {info && <div className="mb-3 px-3.5 py-2.5 rounded-xl bg-teal/10 border border-teal/30 text-xs text-os-ink">{info}</div>}

      {!rows ? (
        <div className="space-y-3">{[0, 1].map((i) => <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Check className="w-8 h-8 text-teal mx-auto mb-3 opacity-60" />
          <p className="text-sm text-os-text-dim">Nobody is waiting for the team.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const ch = CHANNEL[r.channel] ?? CHANNEL.whatsapp;
            const mine = r.status === "taken" && r.taken_by?.user_id === me;
            const other = r.status === "taken" && !mine;
            const expanded = openId === r.id;
            return (
              <div key={r.id} className={`rounded-2xl border overflow-hidden ${r.status === "open" ? "bg-amber-500/[0.06] border-amber-400/30" : "bg-os-card border-os-border"}`}>
                <button type="button" onClick={() => { setOpenId(expanded ? null : r.id); setNote(""); }} className="w-full text-left px-4 pt-3 pb-3">
                  <span className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-os-text-dim">
                      <ch.icon className="w-3 h-3" /> {ch.label}{r.source === "missed_call" ? " · missed call" : ""}
                    </span>
                    <span className={`text-[10px] ${r.status === "open" ? "text-amber-300 font-semibold" : "text-os-text-dim"}`}>
                      {r.status === "open" ? `waiting ${waited(r.created_at)}` : mine ? "You have this" : `With ${r.taken_by?.name ?? "a teammate"}`}
                    </span>
                  </span>
                  <span className="block text-sm font-semibold text-os-ink mt-1">{r.customer_name || "Unnamed customer"}</span>
                  <span className="block text-xs text-os-ink/80 mt-0.5 line-clamp-2">{r.what}</span>
                </button>
                {expanded && (
                  <div className="px-3 pb-3 space-y-2.5">
                    <CustomerBriefing customerId={r.customer_id} tone="light" />
                    <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="What happened? Saved on the customer."
                      className="w-full px-3 py-2 rounded-xl bg-os-bg border border-os-border text-[16px] sm:text-xs text-os-ink" />
                  </div>
                )}
                <div className="grid grid-cols-3 border-t border-os-border">
                  {!mine ? (
                    <button type="button" disabled={busy === r.id || (other && !supervisor)}
                      onClick={() => act(r.id, () => teamRequests.take(r.id, other))}
                      className="py-2.5 text-xs font-bold text-teal disabled:opacity-40">{other ? "Take over" : "I'll take it"}</button>
                  ) : (
                    <button type="button" disabled={busy === r.id}
                      onClick={() => act(r.id, () => teamRequests.done(r.id, note || null), "Closed - your note is on the customer.")}
                      className="py-2.5 text-xs font-bold text-emerald-400 disabled:opacity-40">Done</button>
                  )}
                  <button type="button" disabled={busy === r.id || (other && !supervisor)}
                    onClick={() => act(r.id, async () => { if (!mine) await teamRequests.take(r.id, other); await calls.start(r.customer_id); },
                      "Calling - your phone rings first, then the customer.")}
                    className="py-2.5 text-xs font-semibold text-os-ink border-l border-os-border flex items-center justify-center gap-1 disabled:opacity-40">
                    <Phone className="w-3.5 h-3.5" /> Call
                  </button>
                  <a href={appPath(`/inbox/${r.customer_id}`)} className="py-2.5 text-xs font-semibold text-os-ink border-l border-os-border flex items-center justify-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5" /> Chat
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
