"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Siren, Wallet, ArrowRight, Inbox as InboxIcon, CalendarDays, Ticket, UserPlus, LifeBuoy, Coins } from "lucide-react";
import {
  account, approvals, billing, escalations, ledger, queue, scheduling, team, teamSettings,
  type LedgerSummary, type MyWork,
} from "@/lib/api";
import { appPath } from "@/lib/app-nav";
import { getUserId } from "@/lib/auth";
import { PhoneField } from "@/components/team/PhoneField";
import { PendingWrapups } from "@/components/team/PendingWrapups";

// YYYY-MM-DD in the phone's own day, and that day shifted.
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dayKey(d); };

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * The daily briefing - what /mobile's own marketing copy promises
 * ("Aaj kya hua?"). Composed entirely from endpoints the desktop OS
 * already has (approvals/count, escalations/count, ledger/summary) -
 * no new backend built for this screen specifically, same discipline
 * as the rest of this app shell.
 */
export default function TodayPage() {
  const [pending, setPending] = useState<number | null>(null);
  const [openEscalations, setOpenEscalations] = useState<number | null>(null);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mine, setMine] = useState<MyWork | null>(null);
  const [away, setAway] = useState<boolean | null>(null);
  const [myPhone, setMyPhone] = useState<string | null | undefined>(undefined);
  // Owner and admins: the business at a glance. Agents never load these.
  const [supervisor, setSupervisor] = useState(false);
  const [wallet, setWallet] = useState<{ balance: string; low: boolean } | null>(null);
  const [bookings, setBookings] = useState<{ count: number; next: string | null } | null>(null);
  const [waiting, setWaiting] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, e, s, w] = await Promise.allSettled([
        approvals.count(),
        escalations.count(),
        ledger.summary(),
        teamSettings.myWork(),
      ]);
      if (!mounted) return;
      if (a.status === "fulfilled") setPending(a.value.pending);
      if (e.status === "fulfilled") setOpenEscalations(e.value.open);
      if (s.status === "fulfilled") setSummary(s.value);
      if (w.status === "fulfilled") setMine(w.value);
      account.profile().then((p) => {
        if (!mounted) return;
        const boss = p.role === "owner" || p.role === "admin";
        setSupervisor(boss);
        const caps = p.capabilities || [];
        const today = shift(0);
        if (caps.includes("scheduling")) {
          scheduling.listAppointments({ from: shift(-1), to: shift(2) }).then((all) => {
            if (!mounted) return;
            const mine = all.filter((a) => dayKey(new Date(a.starts_at)) === today && a.status !== "cancelled");
            const upcoming = mine
              .filter((a) => new Date(a.starts_at).getTime() > Date.now() && a.status !== "visited" && a.status !== "no_show")
              .sort((x, y) => x.starts_at.localeCompare(y.starts_at))[0];
            setBookings({
              count: mine.length,
              next: upcoming ? new Date(upcoming.starts_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : null,
            });
          }).catch(() => {});
        }
        if (caps.includes("opd_queue")) {
          queue.list({ status: "waiting", queue_date: today }).then((rows) => { if (mounted) setWaiting(rows.length); }).catch(() => {});
        }
        if (boss) {
          billing.overview().then((o) => {
            if (mounted && o.wallet_balance != null) setWallet({ balance: o.wallet_balance, low: o.low_balance });
          }).catch(() => {});
        }
      }).catch(() => {});
      team.list().then((list) => {
        const me = list.find((m) => m.user_id === getUserId());
        if (mounted && me && me.role === "agent") setAway(me.available === false);
        if (mounted && me) setMyPhone(me.phone ?? null);
      }).catch(() => {});
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="px-4 pt-5 space-y-5 max-w-md mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-os-ink">{greeting}.</h1>
        <p className="text-xs text-os-text-dim mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {away !== null && (
            <button
              type="button"
              onClick={async () => {
                const next = !away;
                setAway(next);
                try { await teamSettings.setAvailable(!next); } catch { setAway(!next); }
              }}
              className={`w-full rounded-2xl border p-3.5 text-left text-sm ${away ? "bg-amber-500/10 border-amber-400/30 text-amber-100" : "bg-os-card border-os-border text-os-ink"}`}
            >
              {away ? "You are Away - no new chats come to you. Tap to go available." : "You are available for new chats. Tap to go Away."}
            </button>
          )}
          {myPhone !== undefined && (
            <div className="rounded-2xl border border-os-border bg-os-card p-3.5">
              <PhoneField
                tone="light"
                value={myPhone}
                label="Calls for you ring on"
                onSave={async (phone) => {
                  const res = await team.setMyPhone(phone);
                  setMyPhone(res.phone);
                  return res.phone;
                }}
              />
              {!myPhone && (
                <p className="mt-2 text-[11px] text-os-text-dim">
                  Add your number to get customers put through to you and to call customers from here.
                </p>
              )}
            </div>
          )}
          <PendingWrapups tone="light" />
          {mine && mine.chats + mine.escalations + mine.cases > 0 && (
            <Link href={appPath("/inbox")} className="block rounded-2xl bg-os-card border border-os-border p-4">
              <p className="text-[10px] font-mono uppercase tracking-wide text-os-text-dim mb-2">Mine right now</p>
              <p className="text-sm text-os-ink">
                {mine.chats} {mine.chats === 1 ? "chat" : "chats"}
                {mine.drafts_waiting > 0 && ` - ${mine.drafts_waiting} AI ${mine.drafts_waiting === 1 ? "reply" : "replies"} waiting`}
                {mine.escalations > 0 && ` - ${mine.escalations} escalation${mine.escalations === 1 ? "" : "s"}`}
                {mine.cases > 0 && ` - ${mine.cases} open case${mine.cases === 1 ? "" : "s"}`}
              </p>
            </Link>
          )}
          {/* Escalations - most urgent first */}
          {openEscalations !== null && openEscalations > 0 && (
            <Link
              href={appPath("/escalations")}
              className="flex items-center gap-3 p-4 rounded-2xl bg-thread/10 border border-thread/25 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-thread/15 flex items-center justify-center shrink-0">
                <Siren className="w-5 h-5 text-thread-bright" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-os-ink">
                  {openEscalations} open escalation{openEscalations === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-os-text-dim">Needs a human, now</p>
              </div>
              <ArrowRight className="w-4 h-4 text-os-text-dim shrink-0" />
            </Link>
          )}

          {(bookings || waiting !== null) && (
            <div className="grid grid-cols-2 gap-3">
              {bookings && (
                <div className="p-4 rounded-2xl bg-os-card border border-os-border">
                  <CalendarDays className="w-4 h-4 text-teal mb-2" />
                  <p className="text-lg font-semibold text-os-ink font-mono">{bookings.count}</p>
                  <p className="text-[10px] text-os-text-dim">
                    Booking{bookings.count === 1 ? "" : "s"} today{bookings.next ? ` · next ${bookings.next}` : ""}
                  </p>
                </div>
              )}
              {waiting !== null && (
                <div className="p-4 rounded-2xl bg-os-card border border-os-border">
                  <Ticket className="w-4 h-4 text-teal mb-2" />
                  <p className="text-lg font-semibold text-os-ink font-mono">{waiting}</p>
                  <p className="text-[10px] text-os-text-dim">Waiting in the queue</p>
                </div>
              )}
            </div>
          )}

          <Link
            href={appPath("/approvals")}
            className="flex items-center gap-3 p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-os-ink">
                {pending ?? 0} {pending === 1 ? "reply" : "replies"} waiting
              </p>
              <p className="text-[11px] text-os-text-dim">Drafted and ready to review</p>
            </div>
            <ArrowRight className="w-4 h-4 text-os-text-dim shrink-0" />
          </Link>

          <Link
            href={appPath("/inbox")}
            className="flex items-center gap-3 p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <InboxIcon className="w-5 h-5 text-os-text-dim" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-os-ink">Conversations</p>
              <p className="text-[11px] text-os-text-dim">See what's coming in</p>
            </div>
            <ArrowRight className="w-4 h-4 text-os-text-dim shrink-0" />
          </Link>

          {summary && (
            <Link
              href={appPath("/ledger")}
              className="block p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-teal" />
                <p className="text-xs font-mono uppercase tracking-wide text-os-text-dim">Ledger</p>
                <ArrowRight className="w-3.5 h-3.5 text-os-text-dim ml-auto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-semibold text-os-ink font-mono">
                    {formatPaise(summary.owed_to_us_paise)}
                  </p>
                  <p className="text-[10px] text-os-text-dim">Owed to you</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-thread-bright font-mono">
                    {formatPaise(summary.overdue_paise)}
                  </p>
                  <p className="text-[10px] text-os-text-dim">
                    Overdue{summary.overdue_count > 0 ? ` (${summary.overdue_count})` : ""}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {wallet && (
            <div className={`flex items-center gap-3 p-4 rounded-2xl border ${wallet.low ? "bg-amber-500/10 border-amber-400/30" : "bg-os-card border-os-border"}`}>
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
                <Coins className={`w-5 h-5 ${wallet.low ? "text-amber-300" : "text-os-text-dim"}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-os-ink font-mono">{wallet.balance}</p>
                <p className="text-[11px] text-os-text-dim">
                  {wallet.low ? "Wallet running low - calls stop at zero. Add money on Billing." : "Wallet for calls"}
                </p>
              </div>
            </div>
          )}

          {supervisor && (
            <div className="grid grid-cols-2 gap-3">
              <Link href={appPath("/customers")} className="p-3.5 rounded-2xl bg-os-card border border-os-border flex items-center gap-2 text-xs font-semibold text-os-ink active:scale-[0.98]">
                <UserPlus className="w-4 h-4 text-teal" /> Add a contact
              </Link>
              <Link href={appPath("/help")} className="p-3.5 rounded-2xl bg-os-card border border-os-border flex items-center gap-2 text-xs font-semibold text-os-ink active:scale-[0.98]">
                <LifeBuoy className="w-4 h-4 text-teal" /> Help
              </Link>
            </div>
          )}

          {pending === 0 && (openEscalations ?? 0) === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-os-text-dim">Nothing waiting on you right now.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
