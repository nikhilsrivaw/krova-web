"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckSquare, Siren, ChevronRight, MessageCircle, CalendarDays, Ticket, UserPlus, LifeBuoy, Coins, Users,
  CircleCheck, AlertTriangle, PhoneCall,
} from "lucide-react";
import {
  account, approvals, billing, conversations, escalations, ledger, queue, scheduling, team, teamSettings,
  type LedgerSummary, type MyWork,
} from "@/lib/api";
import { AskBar } from "@/components/app-shell/AskBar";
import { appPath } from "@/lib/app-nav";
import { getUserId } from "@/lib/auth";
import { PhoneField } from "@/components/team/PhoneField";
import { PendingWrapups } from "@/components/team/PendingWrapups";

// YYYY-MM-DD in the phone's own day, and that day shifted.
const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const shift = (days: number) => { const d = new Date(); d.setDate(d.getDate() + days); return dayKey(d); };

const rupees = (paise: number) => `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
const rupeesText = (amount: string) => `₹${Math.round(Number(amount)).toLocaleString("en-IN")}`;

type Task = { key: string; href: string; icon: typeof Siren; count: number; title: string; hint: string; urgent?: boolean };

/**
 * Today: what needs you now, what is on today, and the money - in that order, the way an owner or a team member
 * starts the day. Composed from endpoints the rest of the app already uses; nothing is built for this screen alone.
 * It refreshes when the app comes back to the front.
 */
export default function TodayPage() {
  const [pending, setPending] = useState<number | null>(null);
  const [openEscalations, setOpenEscalations] = useState<number | null>(null);
  const [customersWaiting, setCustomersWaiting] = useState<number | null>(null);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mine, setMine] = useState<MyWork | null>(null);
  const [away, setAway] = useState<boolean | null>(null);
  const [myPhone, setMyPhone] = useState<string | null | undefined>(undefined);
  const [name, setName] = useState("");
  // Owner and admins: the business at a glance. Agents never load these.
  const [supervisor, setSupervisor] = useState(false);
  const [wallet, setWallet] = useState<{ balance: string; low: boolean } | null>(null);
  const [bookings, setBookings] = useState<{ count: number; next: string | null } | null>(null);
  const [inQueue, setInQueue] = useState<number | null>(null);

  const load = useCallback(async (mounted: () => boolean) => {
    const [a, e, s, w, c] = await Promise.allSettled([
      approvals.count(),
      escalations.count(),
      ledger.summary(),
      teamSettings.myWork(),
      conversations.list(),
    ]);
    if (!mounted()) return;
    if (a.status === "fulfilled") setPending(a.value.pending);
    if (e.status === "fulfilled") setOpenEscalations(e.value.open);
    if (s.status === "fulfilled") setSummary(s.value);
    if (w.status === "fulfilled") setMine(w.value);
    if (c.status === "fulfilled") setCustomersWaiting(c.value.filter((x) => x.last_direction === "inbound").length);
    account.profile().then((p) => {
      if (!mounted()) return;
      setName((p.full_name || "").trim().split(/\s+/)[0] || "");
      const boss = p.role === "owner" || p.role === "admin";
      setSupervisor(boss);
      const caps = p.capabilities || [];
      const today = shift(0);
      if (caps.includes("scheduling")) {
        scheduling.listAppointments({ from: shift(-1), to: shift(2) }).then((all) => {
          if (!mounted()) return;
          const todays = all.filter((x) => dayKey(new Date(x.starts_at)) === today && x.status !== "cancelled");
          const upcoming = todays
            .filter((x) => new Date(x.starts_at).getTime() > Date.now() && x.status !== "visited" && x.status !== "no_show")
            .sort((x, y) => x.starts_at.localeCompare(y.starts_at))[0];
          setBookings({
            count: todays.length,
            next: upcoming ? new Date(upcoming.starts_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : null,
          });
        }).catch(() => {});
      }
      if (caps.includes("opd_queue")) {
        queue.list({ status: "waiting", queue_date: today }).then((rows) => { if (mounted()) setInQueue(rows.length); }).catch(() => {});
      }
      if (boss) {
        billing.overview().then((o) => {
          if (mounted() && o.wallet_balance != null) setWallet({ balance: o.wallet_balance, low: o.low_balance });
        }).catch(() => {});
      }
    }).catch(() => {});
    team.list().then((list) => {
      const me = list.find((m) => m.user_id === getUserId());
      if (mounted() && me && me.role === "agent") setAway(me.available === false);
      if (mounted() && me) setMyPhone(me.phone ?? null);
    }).catch(() => {});
    setIsLoading(false);
  }, []);

  useEffect(() => {
    let alive = true;
    const mounted = () => alive;
    load(mounted);
    const onShow = () => { if (document.visibilityState === "visible") load(mounted); };
    document.addEventListener("visibilitychange", onShow);
    return () => { alive = false; document.removeEventListener("visibilitychange", onShow); };
  }, [load]);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const tasks: Task[] = [
    { key: "esc", href: "/escalations", icon: Siren, count: openEscalations ?? 0, title: "Escalations", hint: "A customer needs a person", urgent: true },
    { key: "wait", href: "/inbox", icon: MessageCircle, count: customersWaiting ?? 0, title: "Customers waiting", hint: "They wrote last - nobody has replied" },
    { key: "drafts", href: "/approvals", icon: CheckSquare, count: pending ?? 0, title: "AI replies to review", hint: "Drafted and ready to send" },
    { key: "wrap", href: "/inbox", icon: PhoneCall, count: mine?.calls_to_write_up ?? 0, title: "Calls to write up", hint: "Note what was promised" },
  ].filter((t) => t.count > 0);

  const overdueOwed = summary?.overdue_they_owe_count ?? 0;

  return (
    <div className="px-4 pt-5 pb-6 space-y-5 max-w-md mx-auto">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-os-ink truncate">{greeting}{name ? `, ${name}` : ""}</h1>
          <p className="text-xs text-os-text-dim mt-0.5">
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
          </p>
        </div>
        {away !== null && (
          <button
            type="button"
            onClick={async () => {
              const next = !away;
              setAway(next);
              try { await teamSettings.setAvailable(!next); } catch { setAway(!next); }
            }}
            aria-pressed={!away}
            className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold ${
              away ? "bg-amber-500/10 border-amber-400/40 text-amber-200" : "bg-teal/10 border-teal/40 text-teal"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${away ? "bg-amber-300" : "bg-teal"}`} />
            {away ? "Away" : "Available"}
          </button>
        )}
      </div>

      {supervisor && <AskBar />}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {away && (
            <p className="text-[11px] text-amber-200/90 -mt-2">You are Away: no new chats come to you. Tap Available when you are back.</p>
          )}

          <PendingWrapups tone="light" />

          {/* Needs you now */}
          <section className="space-y-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-wide text-os-text-dim px-1">Needs you now</h2>
            {tasks.length === 0 ? (
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-os-card border border-os-border">
                <CircleCheck className="w-5 h-5 text-teal shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-os-ink">All clear</p>
                  <p className="text-[11px] text-os-text-dim">Nobody is waiting on you right now.</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-os-card border border-os-border overflow-hidden divide-y divide-os-border">
                {tasks.map((t) => {
                  const Icon = t.icon;
                  return (
                    <Link key={t.key} href={appPath(t.href)} className="flex items-center gap-3 px-4 py-3.5 active:bg-white/[0.03]">
                      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${t.urgent ? "bg-thread/15" : "bg-teal/10"}`}>
                        <Icon className={`w-4 h-4 ${t.urgent ? "text-thread-bright" : "text-teal"}`} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-os-ink">{t.title}</span>
                        <span className="block text-[11px] text-os-text-dim truncate">{t.hint}</span>
                      </span>
                      <span className={`min-w-[28px] h-7 px-2 rounded-full text-xs font-bold flex items-center justify-center ${
                        t.urgent ? "bg-thread/20 text-thread-bright" : "bg-teal/15 text-teal"
                      }`}>
                        {t.count > 99 ? "99+" : t.count}
                      </span>
                      <ChevronRight className="w-4 h-4 text-os-text-dim shrink-0" />
                    </Link>
                  );
                })}
              </div>
            )}
            {mine && mine.chats > 0 && (
              <Link href={appPath("/inbox")} className="flex items-center justify-between px-1 text-xs text-os-text-dim">
                <span>{mine.chats} {mine.chats === 1 ? "chat is" : "chats are"} yours{mine.cases > 0 ? ` · ${mine.cases} open case${mine.cases === 1 ? "" : "s"}` : ""}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </section>

          {/* Today */}
          {(bookings || inQueue !== null) && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-os-text-dim px-1">Today</h2>
              <div className="grid grid-cols-2 gap-3">
                {bookings && (
                  <Link href={appPath("/bookings")} className="p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98]">
                    <CalendarDays className="w-4 h-4 text-teal mb-2" />
                    <p className="text-2xl font-semibold text-os-ink">{bookings.count}</p>
                    <p className="text-[11px] text-os-text-dim">
                      Booking{bookings.count === 1 ? "" : "s"}{bookings.next ? ` · next ${bookings.next}` : ""}
                    </p>
                  </Link>
                )}
                {inQueue !== null && (
                  <Link href={appPath("/queue")} className="p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98]">
                    <Ticket className="w-4 h-4 text-teal mb-2" />
                    <p className="text-2xl font-semibold text-os-ink">{inQueue}</p>
                    <p className="text-[11px] text-os-text-dim">Waiting in the queue</p>
                  </Link>
                )}
              </div>
            </section>
          )}

          {/* Money */}
          {(summary || wallet) && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-os-text-dim px-1">Money</h2>
              {summary && (
                <Link href={appPath("/ledger")} className="grid grid-cols-2 gap-3">
                  <div className="p-4 rounded-2xl bg-os-card border border-os-border">
                    <p className="text-[11px] text-os-text-dim mb-1">Owed to you</p>
                    <p className="text-xl font-semibold text-os-ink">{rupees(summary.owed_to_us_paise)}</p>
                  </div>
                  <div className={`p-4 rounded-2xl border ${overdueOwed > 0 ? "bg-thread/10 border-thread/25" : "bg-os-card border-os-border"}`}>
                    <p className="text-[11px] text-os-text-dim mb-1 flex items-center gap-1">
                      {overdueOwed > 0 && <AlertTriangle className="w-3 h-3 text-thread-bright" />}
                      Overdue{overdueOwed > 0 ? ` · ${overdueOwed}` : ""}
                    </p>
                    <p className={`text-xl font-semibold ${overdueOwed > 0 ? "text-thread-bright" : "text-os-ink"}`}>
                      {rupees(summary.overdue_they_owe_paise)}
                    </p>
                  </div>
                </Link>
              )}
              {summary && summary.overdue_we_owe_count > 0 && (
                <Link href={appPath("/ledger")} className="flex items-center justify-between px-1 text-xs text-amber-200/90">
                  <span>You have {summary.overdue_we_owe_count} overdue promise{summary.overdue_we_owe_count === 1 ? "" : "s"} to customers</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              )}
              {wallet && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border ${wallet.low ? "bg-amber-500/10 border-amber-400/30" : "bg-os-card border-os-border"}`}>
                  <Coins className={`w-5 h-5 shrink-0 ${wallet.low ? "text-amber-300" : "text-teal"}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-os-ink">{rupeesText(wallet.balance)} <span className="text-[11px] font-normal text-os-text-dim">wallet for calls</span></p>
                    {wallet.low && <p className="text-[11px] text-amber-200/90">Running low - calls stop at zero. Add money on Billing (computer).</p>}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Shortcuts */}
          {supervisor && (
            <section className="space-y-2">
              <h2 className="text-[11px] font-semibold uppercase tracking-wide text-os-text-dim px-1">Shortcuts</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { href: "/customers", icon: UserPlus, label: "Add contact" },
                  { href: "/customers", icon: Users, label: "Customers" },
                  { href: "/help", icon: LifeBuoy, label: "Help" },
                ].map((s) => {
                  const Icon = s.icon;
                  return (
                    <Link key={s.label} href={appPath(s.href)} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-os-card border border-os-border active:scale-[0.98]">
                      <Icon className="w-5 h-5 text-teal" />
                      <span className="text-[11px] font-medium text-os-ink text-center">{s.label}</span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {/* Where calls reach this person - shown until a number is set */}
          {myPhone === null && (
            <section className="rounded-2xl border border-os-border bg-os-card p-3.5">
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
              <p className="mt-2 text-[11px] text-os-text-dim">
                Add your number to get customers put through to you and to call customers from KROVA.
              </p>
            </section>
          )}
        </>
      )}
    </div>
  );
}
