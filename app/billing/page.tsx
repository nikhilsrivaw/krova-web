"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertTriangle, Check, CreditCard, Phone, Wallet } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import { account, billing, goToPayu, type BillingOverview } from "@/lib/api";

const inr = (rupees: string | number) =>
  `₹${Number(rupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-");

const KIND: Record<string, string> = {
  topup: "Added to wallet",
  calls: "Voice calls",
  number_rent: "Phone number rent",
  adjustment: "Adjustment",
};

const STATUS_BADGE: Record<string, "emerald" | "amber" | "rose" | "cyan"> = {
  active: "emerald",
  past_due: "amber",
  suspended: "rose",
  cancelled: "cyan",
};

const PRESETS = [500, 1000, 2000, 5000];

export default function BillingPage() {
  return (
    <Suspense fallback={null}>
      <BillingInner />
    </Suspense>
  );
}

function BillingInner() {
  const params = useSearchParams();
  const [data, setData] = useState<BillingOverview | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [amount, setAmount] = useState(1000);
  const [quote, setQuote] = useState<{ credit: string; gst: string; fee: string; total: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const [overview, profile] = await Promise.all([billing.overview(), account.profile()]);
      setData(overview);
      setRole(profile.role);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load billing.");
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (amount < 100 || amount > 50000) {
      setQuote(null);
      return;
    }
    let stale = false;
    billing.quote(amount).then((q) => { if (!stale) setQuote(q); }).catch(() => { if (!stale) setQuote(null); });
    return () => { stale = true; };
  }, [amount]);

  const isOwner = role === "owner";
  const sub = data?.subscription ?? null;
  const returned = params.get("payment");

  const pay = async (label: string, start: () => Promise<Parameters<typeof goToPayu>[0]>) => {
    setBusy(label);
    setError(null);
    try {
      goToPayu(await start());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the payment.");
      setBusy(null);
    }
  };

  const run = async (label: string, fn: () => Promise<unknown>) => {
    setBusy(label);
    setError(null);
    try {
      await fn();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout title="Billing" subtitle="Your plan, your wallet and what you have paid">
      <div className="space-y-6 max-w-4xl">
        {returned === "success" && (
          <div role="status" className="px-4 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
            Payment received. Thank you.
          </div>
        )}
        {returned === "failed" && (
          <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300">
            That payment did not go through, and you have not been charged. You can try again below.
          </div>
        )}
        {returned === "pending" && (
          <div role="status" className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            Your bank is still confirming this payment. This page updates once it does - UPI can take a few minutes.
          </div>
        )}
        {error && <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>}
        {data && !data.payments_enabled && (
          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
            Online payments are not switched on for this workspace yet.
          </div>
        )}
        {data?.blocked && (
          <div role="alert" className="flex items-start gap-2 px-4 py-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Your plan is paused. AI replies and campaigns are off until a payment goes through. Your customers and conversations are all still here.
          </div>
        )}

        {!data ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <>
            {/* Plan */}
            <section aria-label="Plan" className="space-y-3">
              <div className="flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-teal-bright" />
                <h2 className="text-sm font-bold text-white">Plan</h2>
                {sub && <Badge variant={STATUS_BADGE[sub.status] ?? "cyan"} size="sm">{sub.status.replace("_", " ")}</Badge>}
              </div>

              {sub && (
                <GlassCard className="p-4 text-xs text-white space-y-1">
                  <p>
                    <span className="font-bold capitalize">{sub.plan}</span> - {inr(sub.amount)} a month, GST included
                  </p>
                  {sub.cancel_at_period_end ? (
                    <p className="text-os-text-dim">Ends on {date(sub.current_period_end)}. It will not renew.</p>
                  ) : sub.status === "active" ? (
                    <p className="text-os-text-dim">Renews on {date(sub.next_charge_at ?? sub.current_period_end)}.</p>
                  ) : sub.status === "past_due" ? (
                    <p className="text-amber-300">
                      The last payment failed{sub.last_failure ? ` (${sub.last_failure})` : ""}. We will try again
                      {sub.next_charge_at ? ` on ${date(sub.next_charge_at)}` : ""}
                      {sub.retry_until ? ` and stop on ${date(sub.retry_until)}` : ""}.
                    </p>
                  ) : null}
                  {isOwner && sub.status !== "suspended" && sub.status !== "cancelled" && (
                    <div className="pt-2">
                      {sub.cancel_at_period_end ? (
                        <button type="button" disabled={busy !== null} onClick={() => run("resume", billing.resume)} className="px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/[0.12] text-xs font-semibold cursor-pointer disabled:opacity-50">
                          Keep my plan
                        </button>
                      ) : (
                        <button type="button" disabled={busy !== null} onClick={() => run("cancel", billing.cancel)} className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.1] text-xs text-os-text-dim hover:text-white cursor-pointer disabled:opacity-50">
                          Cancel plan
                        </button>
                      )}
                    </div>
                  )}
                </GlassCard>
              )}

              {isOwner ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {data.plans.map((p) => {
                    const current = sub && sub.plan === p.key && sub.status !== "suspended" && sub.status !== "cancelled";
                    return (
                      <GlassCard key={p.key} className="p-4 space-y-3">
                        <p className="text-sm font-bold text-white">{p.label}</p>
                        <div>
                          <p className="text-2xl font-bold text-white">{inr(p.base)}<span className="text-xs font-normal text-os-text-dim"> /month</span></p>
                          <p className="text-[11px] text-os-text-dim">+ {inr(p.gst)} GST = {inr(p.total)}</p>
                        </div>
                        {current ? (
                          <p className="flex items-center gap-1 text-xs text-emerald-300"><Check className="w-3.5 h-3.5" /> Your plan</p>
                        ) : (
                          <button
                            type="button"
                            disabled={busy !== null || !data.payments_enabled}
                            onClick={() => pay(`plan-${p.key}`, () => billing.subscribe(p.key))}
                            className="w-full px-3 py-2 rounded-lg bg-teal hover:bg-teal-dim text-os-bg text-xs font-bold cursor-pointer disabled:opacity-50"
                          >
                            {busy === `plan-${p.key}` ? "Opening payment..." : sub && sub.status !== "cancelled" && sub.status !== "suspended" ? `Switch to ${p.label}` : `Choose ${p.label}`}
                          </button>
                        )}
                      </GlassCard>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-os-text-dim">Only the owner can choose or change the plan.</p>
              )}
              <p className="text-[11px] text-os-text-dim">
                You approve the monthly payment once (card or UPI AutoPay) and it renews by itself. You are told before each charge.
                If one fails we try again over a week before pausing.
              </p>
            </section>

            {/* Wallet */}
            <section aria-label="Wallet" className="space-y-3">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-teal-bright" />
                <h2 className="text-sm font-bold text-white">Wallet for voice</h2>
              </div>
              <GlassCard className="p-4 space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] text-os-text-dim">Balance</p>
                    <p className={`text-3xl font-bold ${data.low_balance ? "text-amber-300" : "text-white"}`}>
                      {data.wallet_balance !== null ? inr(data.wallet_balance) : "₹0.00"}
                    </p>
                  </div>
                  <p className="flex items-center gap-1.5 text-[11px] text-os-text-dim">
                    <Phone className="w-3.5 h-3.5" /> Calls are charged at cost + 25%. Each phone number is {inr(data.number_rent)} a month.
                  </p>
                </div>
                {data.low_balance && <p className="text-xs text-amber-300">Running low - calls stop when this reaches zero.</p>}

                <div className="space-y-2">
                  <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Add money</p>
                  <div className="flex flex-wrap gap-2">
                    {PRESETS.map((n) => (
                      <button
                        key={n} type="button" onClick={() => setAmount(n)} aria-pressed={amount === n}
                        className={`px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${amount === n ? "bg-teal/15 border-teal/40 text-white" : "bg-white/[0.02] border-white/[0.08] text-os-text-dim"}`}
                      >
                        {inr(n).replace(".00", "")}
                      </button>
                    ))}
                    <input
                      type="number" min={100} max={50000} step={100} value={amount}
                      onChange={(e) => setAmount(Number(e.target.value))} aria-label="Amount in rupees"
                      className="w-28 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none"
                    />
                  </div>
                  {quote ? (
                    <dl className="text-xs text-white max-w-xs space-y-0.5">
                      <div className="flex justify-between"><dt className="text-os-text-dim">Goes into your wallet</dt><dd>{inr(quote.credit)}</dd></div>
                      <div className="flex justify-between"><dt className="text-os-text-dim">GST (18%)</dt><dd>{inr(quote.gst)}</dd></div>
                      <div className="flex justify-between"><dt className="text-os-text-dim">Payment gateway fee</dt><dd>{inr(quote.fee)}</dd></div>
                      <div className="flex justify-between border-t border-white/[0.1] pt-1 font-bold"><dt>You pay</dt><dd>{inr(quote.total)}</dd></div>
                    </dl>
                  ) : (
                    <p className="text-[11px] text-os-text-dim">Enter an amount from ₹100 to ₹50,000.</p>
                  )}
                  <button
                    type="button" disabled={busy !== null || !quote || !data.payments_enabled}
                    onClick={() => pay("topup", () => billing.topup(amount))}
                    className="px-4 py-2 rounded-lg bg-teal hover:bg-teal-dim text-os-bg text-xs font-bold cursor-pointer disabled:opacity-50"
                  >
                    {busy === "topup" ? "Opening payment..." : "Add money"}
                  </button>
                </div>
              </GlassCard>

              {data.entries.length > 0 && (
                <GlassCard className="divide-y divide-white/[0.05]">
                  {data.entries.map((e, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-white truncate">{e.note || KIND[e.kind] || e.kind}</p>
                        <p className="text-[10px] text-os-text-dim font-mono">{new Date(e.at).toLocaleString("en-IN")}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={Number(e.amount) >= 0 ? "text-emerald-300" : "text-white"}>
                          {Number(e.amount) >= 0 ? "+" : "-"}{inr(Math.abs(Number(e.amount)))}
                        </p>
                        <p className="text-[10px] text-os-text-dim font-mono">balance {inr(e.balance_after)}</p>
                      </div>
                    </div>
                  ))}
                </GlassCard>
              )}
            </section>

            {data.payments.length > 0 && (
              <section aria-label="Payments" className="space-y-3">
                <h2 className="text-sm font-bold text-white">Payments</h2>
                <GlassCard className="divide-y divide-white/[0.05]">
                  {data.payments.map((p, i) => (
                    <div key={i} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <p className="text-white">{p.purpose === "topup" ? "Wallet top-up" : p.purpose === "renewal" ? "Monthly renewal" : "Plan payment"}</p>
                        <p className="text-[10px] text-os-text-dim font-mono">{new Date(p.at).toLocaleString("en-IN")}{p.failure ? ` - ${p.failure}` : ""}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-white">{inr(p.total)}</span>
                        <Badge variant={p.status === "success" ? "emerald" : p.status === "failed" ? "rose" : "amber"} size="sm">{p.status}</Badge>
                      </div>
                    </div>
                  ))}
                </GlassCard>
              </section>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
