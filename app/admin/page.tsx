"use client";

import React, { useCallback, useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import {
  admin, adminSession, AdminSignedOut,
  type AdminBusiness, type AdminBusinessDetail, type AdminNumberRequest, type AdminOverview, type AdminPayment,
  type AdminTicket, type NumberRequestStatus, type TicketStatus,
} from "@/lib/api";

// KROVA's own operator panel. Not linked from the app on purpose; open /admin directly.
// It has its own sign-in (staff emails listed on the server), separate from customer accounts.

type Tab = "overview" | "support" | "requests" | "businesses" | "payments";
const TABS: { key: Tab; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "support", label: "Support tickets" },
  { key: "requests", label: "140 / 160 requests" },
  { key: "businesses", label: "Businesses" },
  { key: "payments", label: "Payments" },
];

const REQUEST_STATUSES: NumberRequestStatus[] = ["requested", "submitted_to_plivo", "provisioned", "rejected"];
const REQUEST_VARIANT: Record<NumberRequestStatus, "emerald" | "amber" | "rose" | "cyan"> = {
  requested: "amber", submitted_to_plivo: "cyan", provisioned: "emerald", rejected: "rose",
};
const PAY_VARIANT: Record<string, "emerald" | "amber" | "rose"> = { success: "emerald", pending: "amber", failed: "rose" };
const SUB_VARIANT: Record<string, "emerald" | "amber" | "rose" | "default"> = {
  active: "emerald", past_due: "amber", suspended: "rose", cancelled: "default",
};

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";

function Stat({ label, value, hint, warn }: { label: string; value: React.ReactNode; hint?: string; warn?: boolean }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[10px] font-mono uppercase tracking-wider text-os-text-dim">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${warn ? "text-amber-300" : "text-white"}`}>{value}</p>
      {hint && <p className="mt-0.5 text-[11px] text-os-text-dim">{hint}</p>}
    </GlassCard>
  );
}

function Overview({ goto }: { goto: (t: Tab) => void }) {
  const [o, setO] = useState<AdminOverview | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    admin.overview().then(setO).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
  }, []);
  if (err) return <p className="text-xs text-red-400">{err}</p>;
  if (!o) return <p className="text-xs text-os-text-dim">Loading...</p>;
  const waiting = o.number_requests_waiting;
  return (
    <div className="space-y-4">
      {o.support_tickets_open > 0 && (
        <button
          type="button" onClick={() => goto("support")}
          className="w-full text-left px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 cursor-pointer"
        >
          {o.support_tickets_open} support ticket{o.support_tickets_open > 1 ? "s" : ""} not resolved yet. Open them.
        </button>
      )}
      {waiting > 0 && (
        <button
          type="button" onClick={() => goto("requests")}
          className="w-full text-left px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 cursor-pointer"
        >
          {waiting} number request{waiting > 1 ? "s" : ""} waiting for you (140 / 160 series). Open the queue.
        </button>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Businesses" value={o.businesses_total} hint={`${o.businesses_new_7d} new in 7 days`} />
        <Stat label="Monthly plan revenue" value={o.mrr} hint="active + past due, before GST" />
        <Stat label="Without a plan" value={o.businesses_no_plan} hint="no subscription yet" />
        <Stat label="Messages this month" value={o.messages_this_month.toLocaleString("en-IN")} hint="all businesses, no voice" />
        <Stat label="Active plans" value={o.subs_active} />
        <Stat label="Past due" value={o.subs_past_due} warn={o.subs_past_due > 0} hint="renewal failed, retrying" />
        <Stat label="Suspended" value={o.subs_suspended} warn={o.subs_suspended > 0} />
        <Stat label="Cancelled" value={o.subs_cancelled} />
        <Stat label="Wallets hold" value={o.wallet_total} hint="owed to customers as call credit" />
        <Stat label="Low wallets" value={o.wallets_low} warn={o.wallets_low > 0} hint="under ₹100" />
        <Stat label="Unpaid number rent" value={o.wallets_rent_short} warn={o.wallets_rent_short > 0} />
        <Stat label="With Plivo" value={o.number_requests_with_plivo} hint="requests you submitted" />
        <Stat label="Failed payments (7 days)" value={o.payments_failed_7d} warn={o.payments_failed_7d > 0} />
        <Stat label="Stuck pending (over 1 hour)" value={o.payments_pending_old} warn={o.payments_pending_old > 0} />
      </div>
    </div>
  );
}

function Requests() {
  const [rows, setRows] = useState<AdminNumberRequest[]>([]);
  const [drafts, setDrafts] = useState<Record<string, { notes: string; number: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [only, setOnly] = useState<"open" | "all">("open");

  useEffect(() => {
    admin.numberRequests().then((d) => {
      setRows(d);
      setDrafts(Object.fromEntries(d.map((r) => [r.id, { notes: r.admin_notes || "", number: r.provisioned_number || "" }])));
    }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
  }, []);

  const save = async (r: AdminNumberRequest, status?: NumberRequestStatus) => {
    setBusy(r.id);
    setErr(null);
    try {
      const d = drafts[r.id] || { notes: "", number: "" };
      const u = await admin.updateNumberRequest(r.id, { ...(status ? { status } : {}), admin_notes: d.notes, provisioned_number: d.number });
      setRows((p) => p.map((x) => (x.id === r.id ? u : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  };

  const shown = rows.filter((r) => only === "all" || r.status === "requested" || r.status === "submitted_to_plivo");
  return (
    <div className="space-y-3">
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2 text-[11px]">
        {(["open", "all"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setOnly(k)}
            className={`px-3 py-1 rounded-md cursor-pointer ${only === k ? "bg-white text-black font-bold" : "bg-white/[0.05] text-os-text-dim"}`}>
            {k === "open" ? "Needs work" : "Everything"}
          </button>
        ))}
      </div>
      {shown.length === 0 && <GlassCard className="p-6 text-xs text-os-text-dim">Nothing here.</GlassCard>}
      {shown.map((r) => {
        const d = drafts[r.id] || { notes: "", number: "" };
        return (
          <GlassCard key={r.id} className="p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-white">
                  {r.request_type === "promotional_140" ? "140-series (promotional)" : "160-series (service / transactional)"}
                  {r.bfsi_declaration && r.request_type === "transactional_160" && (
                    <span className="ml-2 text-[10px] font-mono text-cyan-300">BFSI declared</span>
                  )}
                </p>
                <p className="text-xs text-white mt-0.5">{r.business_name || "Unknown business"}</p>
                <p className="text-[11px] text-os-text-dim">
                  {[r.owner_name, r.owner_email, r.owner_phone].filter(Boolean).join(" · ") || "No owner contact"} · asked {when(r.created_at)}
                </p>
              </div>
              <Badge variant={REQUEST_VARIANT[r.status]}>{r.status}</Badge>
            </div>
            <p className="text-xs text-os-text-dim whitespace-pre-wrap">{r.justification}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <input
                value={d.number} placeholder="Number you got from Plivo"
                onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: { ...d, number: e.target.value } }))}
                className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
              />
              <input
                value={d.notes} placeholder="Your notes (Plivo ticket, rejection reason)"
                onChange={(e) => setDrafts((p) => ({ ...p, [r.id]: { ...d, notes: e.target.value } }))}
                className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {REQUEST_STATUSES.map((s) => (
                <button key={s} type="button" disabled={busy === r.id} onClick={() => save(r, s)}
                  className={`px-2.5 py-1 rounded-md text-[10px] font-mono cursor-pointer ${r.status === s ? "bg-white text-black font-bold" : "bg-white/[0.05] text-os-text-dim hover:text-white"}`}>
                  {s}
                </button>
              ))}
              <button type="button" disabled={busy === r.id} onClick={() => save(r)}
                className="ml-auto px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer">
                {busy === r.id ? "Saving..." : "Save notes / number"}
              </button>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

const TICKET_STATUSES: TicketStatus[] = ["open", "in_progress", "resolved"];
const TICKET_VARIANT: Record<TicketStatus, "amber" | "cyan" | "emerald"> = { open: "amber", in_progress: "cyan", resolved: "emerald" };

// Issues businesses raised from their Help page. The reply and status show to them there.
function Support() {
  const [rows, setRows] = useState<AdminTicket[]>([]);
  const [replies, setReplies] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [only, setOnly] = useState<"open" | "all">("open");
  const [chat, setChat] = useState<string | null>(null);

  useEffect(() => {
    admin.supportTickets().then((d) => {
      setRows(d);
      setReplies(Object.fromEntries(d.map((t) => [t.id, t.reply || ""])));
    }).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
  }, []);

  const save = async (t: AdminTicket, status?: TicketStatus) => {
    setBusy(t.id);
    setErr(null);
    try {
      const u = await admin.updateSupportTicket(t.id, { ...(status ? { status } : {}), reply: replies[t.id] ?? "" });
      setRows((p) => p.map((x) => (x.id === t.id ? u : x)));
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Could not save.");
    } finally {
      setBusy(null);
    }
  };

  const shown = rows.filter((t) => only === "all" || t.status !== "resolved");
  return (
    <div className="space-y-3">
      {err && <p className="text-xs text-red-400">{err}</p>}
      <div className="flex gap-2 text-[11px]">
        {(["open", "all"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setOnly(k)}
            className={`px-3 py-1 rounded-md cursor-pointer ${only === k ? "bg-white text-black font-bold" : "bg-white/[0.05] text-os-text-dim"}`}>
            {k === "open" ? "Not resolved" : "Everything"}
          </button>
        ))}
      </div>
      {shown.length === 0 && <GlassCard className="p-6 text-xs text-os-text-dim">Nothing here.</GlassCard>}
      {shown.map((t) => (
        <GlassCard key={t.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white break-words">{t.subject}</p>
              <p className="text-xs text-white mt-0.5">{t.business_name || "Unknown business"}</p>
              <p className="text-[11px] text-os-text-dim">
                {t.number} · {t.category}{t.page ? ` · ${t.page}` : ""} · {[t.raised_by, t.raised_by_contact].filter(Boolean).join(" · ") || "unknown"} · {when(t.created_at)}
              </p>
            </div>
            <Badge variant={TICKET_VARIANT[t.status]}>{t.status}</Badge>
          </div>
          <p className="text-xs text-os-text-dim whitespace-pre-wrap break-words">{t.details}</p>
          {t.transcript.length > 0 && (
            <div>
              <button type="button" onClick={() => setChat(chat === t.id ? null : t.id)} className="text-[11px] text-cyan-300 cursor-pointer">
                {chat === t.id ? "Hide" : "Show"} the KROVA Buddy chat ({t.transcript.length})
              </button>
              {chat === t.id && (
                <div className="mt-2 space-y-1 rounded-lg bg-black/30 p-2.5">
                  {t.transcript.map((m, i) => (
                    <p key={i} className="text-[11px] whitespace-pre-wrap break-words">
                      <span className={m.role === "owner" ? "text-cyan-300" : "text-os-text-dim"}>{m.role === "owner" ? "Them" : "Buddy"}:</span>{" "}
                      <span className="text-white/90">{m.text}</span>
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
          <textarea
            value={replies[t.id] ?? ""} rows={3} placeholder="Your reply - the business sees this on its Help page"
            onChange={(e) => setReplies((p) => ({ ...p, [t.id]: e.target.value }))}
            className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
          />
          <div className="flex items-center gap-2 flex-wrap">
            {TICKET_STATUSES.map((s) => (
              <button key={s} type="button" disabled={busy === t.id} onClick={() => save(t, s)}
                className={`px-2.5 py-1 rounded-md text-[10px] font-mono cursor-pointer ${t.status === s ? "bg-white text-black font-bold" : "bg-white/[0.05] text-os-text-dim hover:text-white"}`}>
                {s}
              </button>
            ))}
            {t.replied_at && <span className="text-[10px] text-os-text-dim">replied {when(t.replied_at)}{t.replied_by ? ` by ${t.replied_by}` : ""}</span>}
            <button type="button" disabled={busy === t.id} onClick={() => save(t)}
              className="ml-auto px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer">
              {busy === t.id ? "Saving..." : "Save reply"}
            </button>
          </div>
        </GlassCard>
      ))}
    </div>
  );
}

function PaymentTable({ rows }: { rows: AdminPayment[] }) {
  if (rows.length === 0) return <p className="text-xs text-os-text-dim">No payments.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
          <tr>
            <th className="py-2 px-2">When</th><th className="py-2 px-2">Business</th><th className="py-2 px-2">For</th>
            <th className="py-2 px-2">Amount</th><th className="py-2 px-2">Status</th><th className="py-2 px-2">Detail</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/[0.03]">
          {rows.map((p) => (
            <tr key={p.id}>
              <td className="py-2 px-2 whitespace-nowrap text-os-text-dim">{when(p.created_at)}</td>
              <td className="py-2 px-2 text-white">{p.business_name || "—"}</td>
              <td className="py-2 px-2">{p.purpose}{p.plan ? ` · ${p.plan}` : ""}</td>
              <td className="py-2 px-2 font-mono">{p.total}</td>
              <td className="py-2 px-2"><Badge variant={PAY_VARIANT[p.status] || "amber"} size="sm">{p.status}</Badge></td>
              <td className="py-2 px-2 text-os-text-dim">
                {p.failure || [p.mode, p.txnid].filter(Boolean).join(" · ")}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Payments() {
  const [state, setState] = useState<"" | "pending" | "success" | "failed">("");
  const [rows, setRows] = useState<AdminPayment[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    setRows(null);
    admin.payments(state || undefined).then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
  }, [state]);
  return (
    <div className="space-y-3">
      <div className="flex gap-2 text-[11px]">
        {(["", "failed", "pending", "success"] as const).map((k) => (
          <button key={k || "all"} type="button" onClick={() => setState(k)}
            className={`px-3 py-1 rounded-md cursor-pointer ${state === k ? "bg-white text-black font-bold" : "bg-white/[0.05] text-os-text-dim"}`}>
            {k || "all"}
          </button>
        ))}
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
      <GlassCard className="p-3">{rows ? <PaymentTable rows={rows} /> : <p className="text-xs text-os-text-dim">Loading...</p>}</GlassCard>
    </div>
  );
}

function BusinessDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const [d, setD] = useState<AdminBusinessDetail | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    admin.business(id).then(setD).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
  }, [id]);
  return (
    <GlassCard className="p-5 space-y-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-white">{d?.business.name || "Business"}</p>
        <button type="button" onClick={onClose} className="text-xs text-os-text-dim hover:text-white cursor-pointer">Close</button>
      </div>
      {err && <p className="text-xs text-red-400">{err}</p>}
      {!d && !err && <p className="text-xs text-os-text-dim">Loading...</p>}
      {d && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><p className="text-os-text-dim text-[10px]">Owner</p><p className="text-white">{d.business.owner_name || "—"}</p><p className="text-os-text-dim">{d.business.owner_email || d.business.owner_phone || ""}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Plan</p><p className="text-white">{d.business.plan}</p><p className="text-os-text-dim">{d.business.sub_status || "no subscription"}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Wallet</p><p className="text-white">{d.business.wallet || "none"}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Messages this month</p><p className="text-white">{d.business.messages_month}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Joined</p><p className="text-white">{when(d.business.created_at)}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Vertical</p><p className="text-white">{d.business.vertical}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Locked until paid</p><p className="text-white">{d.settings_flags.billing_required ? "yes (forced)" : "by cutoff date"}</p></div>
            <div><p className="text-os-text-dim text-[10px]">Voice numbers</p><p className="text-white">{d.business.voice_numbers}</p></div>
          </div>

          {d.subscription && (
            <div className="text-xs space-y-0.5">
              <p className="font-bold text-white">Subscription</p>
              <p className="text-os-text-dim">
                {d.subscription.plan} · {d.subscription.amount} a month · renews/ends {when(d.subscription.current_period_end)} · next charge {when(d.subscription.next_charge_at)}
                {d.subscription.cancel_at_period_end ? " · cancelling" : ""}
              </p>
              {d.subscription.last_failure && <p className="text-amber-300">Last failure: {d.subscription.last_failure} ({d.subscription.attempts} attempts)</p>}
            </div>
          )}

          <div className="text-xs">
            <p className="font-bold text-white mb-1">Team ({d.team.length})</p>
            {d.team.map((m, i) => (
              <p key={i} className="text-os-text-dim">
                {m.name || m.username || m.email || "—"} · {m.role} · last login {when(m.last_login)}{m.active ? "" : " · disabled"}
              </p>
            ))}
          </div>

          <div className="text-xs">
            <p className="font-bold text-white mb-1">Phone numbers and 140/160 requests</p>
            {d.numbers.length === 0 && d.number_requests.length === 0 && <p className="text-os-text-dim">None.</p>}
            {d.numbers.map((n) => (<p key={n.number} className="text-os-text-dim font-mono">{n.number} · {n.label || "no label"} · {n.status}</p>))}
            {d.number_requests.map((r) => (<p key={r.id} className="text-os-text-dim">{r.type} · {r.status} · {when(r.created_at)}{r.provisioned_number ? ` · ${r.provisioned_number}` : ""}</p>))}
          </div>

          <div>
            <p className="text-xs font-bold text-white mb-1">Payments</p>
            <PaymentTable rows={d.payments} />
          </div>

          <div>
            <p className="text-xs font-bold text-white mb-1">Wallet history</p>
            {d.wallet_entries.length === 0 ? <p className="text-xs text-os-text-dim">No wallet activity.</p> : (
              <div className="text-xs space-y-0.5">
                {d.wallet_entries.map((e, i) => (
                  <p key={i} className="text-os-text-dim">
                    {when(e.created_at)} · <span className="text-white font-mono">{e.amount}</span> · {e.kind}{e.note ? ` · ${e.note}` : ""} · balance {e.balance_after}
                  </p>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}

function Businesses() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<AdminBusiness[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const load = useCallback((query: string) => {
    admin.businesses(query.trim() || undefined).then(setRows).catch((e) => setErr(e instanceof Error ? e.message : "Could not load."));
  }, []);
  useEffect(() => { load(""); }, [load]);
  return (
    <div className="space-y-3">
      <form onSubmit={(e) => { e.preventDefault(); load(q); }} className="flex gap-2">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search business name, owner email or phone"
          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none" />
        <button type="submit" className="px-4 py-2 rounded-lg bg-teal text-os-bg text-xs font-bold cursor-pointer">Search</button>
      </form>
      {err && <p className="text-xs text-red-400">{err}</p>}
      {open && <BusinessDetail id={open} onClose={() => setOpen(null)} />}
      <GlassCard className="p-3">
        {!rows ? <p className="text-xs text-os-text-dim">Loading...</p> : rows.length === 0 ? <p className="text-xs text-os-text-dim">No business found.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-2 px-2">Business</th><th className="py-2 px-2">Owner</th><th className="py-2 px-2">Plan</th>
                  <th className="py-2 px-2">Wallet</th><th className="py-2 px-2">Numbers</th><th className="py-2 px-2">Msgs / month</th><th className="py-2 px-2">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {rows.map((b) => (
                  <tr key={b.id} onClick={() => setOpen(b.id)} className="hover:bg-white/[0.03] cursor-pointer">
                    <td className="py-2 px-2 text-white font-semibold">{b.name}{!b.is_active && <span className="ml-1 text-red-400">(off)</span>}</td>
                    <td className="py-2 px-2 text-os-text-dim">{b.owner_email || b.owner_phone || "—"}</td>
                    <td className="py-2 px-2">
                      {b.sub_status ? <Badge variant={SUB_VARIANT[b.sub_status] || "default"} size="sm">{b.plan} · {b.sub_status}</Badge> : <span className="text-os-text-dim">{b.plan}</span>}
                    </td>
                    <td className="py-2 px-2 font-mono">{b.wallet || "—"}</td>
                    <td className="py-2 px-2">{b.voice_numbers}</td>
                    <td className="py-2 px-2">{b.messages_month}</td>
                    <td className="py-2 px-2 text-os-text-dim whitespace-nowrap">{when(b.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}

function SignIn({ onDone }: { onDone: (email: string) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const r = await admin.login(email, password);
      adminSession.set(r.token);
      onDone(r.email);
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not sign in.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-white/[0.1] bg-white/[0.03] p-6 space-y-4">
        <div>
          <p className="text-lg font-bold text-white">KROVA Admin</p>
          <p className="text-xs text-os-text-dim">Staff sign-in</p>
        </div>
        <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email"
          className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-sm text-white focus:border-teal focus:outline-none" />
        <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password"
          className="w-full px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-sm text-white focus:border-teal focus:outline-none" />
        {err && <p className="text-xs text-red-400 flex items-center gap-1.5"><ShieldAlert className="w-3.5 h-3.5 shrink-0" /> {err}</p>}
        <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg bg-teal hover:bg-teal-dim text-os-bg text-sm font-bold cursor-pointer disabled:opacity-50">
          {busy ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </div>
  );
}

export default function AdminPage() {
  const [who, setWho] = useState<string | null | undefined>(undefined); // undefined = checking, null = signed out
  const [tab, setTab] = useState<Tab>("overview");

  useEffect(() => {
    if (!adminSession.get()) {
      setWho(null);
    } else {
      admin.me().then((r) => setWho(r.email)).catch(() => setWho(null));
    }
    const hash = window.location.hash.replace("#", "") as Tab;
    if (TABS.some((t) => t.key === hash)) setTab(hash);
  }, []);

  // Any panel call that finds the session gone drops back to the sign-in form.
  useEffect(() => {
    const onReject = (e: PromiseRejectionEvent) => {
      if (e.reason instanceof AdminSignedOut) { e.preventDefault(); setWho(null); }
    };
    window.addEventListener("unhandledrejection", onReject);
    return () => window.removeEventListener("unhandledrejection", onReject);
  }, []);

  const go = (t: Tab) => { setTab(t); window.history.replaceState(null, "", `#${t}`); };
  const signOut = () => { adminSession.clear(); setWho(null); };

  if (who === undefined) return <p className="p-6 text-xs text-os-text-dim">Checking access...</p>;
  if (who === null) return <SignIn onDone={setWho} />;

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-lg font-bold text-white">KROVA Admin</p>
          <p className="text-xs text-os-text-dim">Everything across all businesses · signed in as {who}</p>
        </div>
        <button type="button" onClick={signOut} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-os-text-dim hover:text-white cursor-pointer">Sign out</button>
      </div>
      <div className="flex gap-1.5 flex-wrap">
        {TABS.map((t) => (
          <button key={t.key} type="button" onClick={() => go(t.key)}
            className={`px-3.5 py-1.5 rounded-lg text-xs cursor-pointer ${tab === t.key ? "bg-teal text-os-bg font-bold" : "bg-white/[0.05] text-os-text-dim hover:text-white"}`}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === "overview" && <Overview goto={go} />}
      {tab === "support" && <Support />}
      {tab === "requests" && <Requests />}
      {tab === "businesses" && <Businesses />}
      {tab === "payments" && <Payments />}
    </div>
  );
}
