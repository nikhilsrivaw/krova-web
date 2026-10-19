"use client";

import { useEffect, useState } from "react";
import { FileText, MessageSquare } from "lucide-react";
import { formatPaise, quotations, type Quotation, type QuotationPipeline } from "@/lib/api";
import { appPath } from "@/lib/app-nav";

// Same line the desktop Quotations page and the pipeline use for "going quiet".
const STALE_DAYS = 21;

/**
 * Open quotes on the phone, the quietest first - the ones worth a call today. Mark won or lost when you hear back.
 * KROVA never messages the buyer on its own about a quote; this is for the person who will.
 */
export default function AppQuotationsPage() {
  const [rows, setRows] = useState<Quotation[] | null>(null);
  const [pipe, setPipe] = useState<QuotationPipeline | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    quotations.list({ open_only: true })
      .then((r) => setRows([...r].sort((a, b) => (b.days_open ?? 0) - (a.days_open ?? 0))))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load quotations."));
    quotations.pipeline(STALE_DAYS).then(setPipe).catch(() => {});
  }, []);

  const close = async (q: Quotation, status: "won" | "lost") => {
    setBusy(q.id); setError(null);
    try {
      await quotations.recordOutcome(q.id, status);
      setRows((prev) => prev?.filter((x) => x.id !== q.id) ?? prev);
      quotations.pipeline(STALE_DAYS).then(setPipe).catch(() => {});
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not save.");
    } finally { setBusy(null); }
  };

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><FileText className="w-4 h-4 text-teal" /> Quotations</h1>
      {pipe && (
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-2xl bg-os-card border border-os-border">
            <p className="text-sm font-semibold text-os-ink font-mono">{formatPaise(pipe.open_value_paise)}</p>
            <p className="text-[10px] text-os-text-dim">{pipe.open_count} open</p>
          </div>
          <div className="p-3 rounded-2xl bg-os-card border border-os-border">
            <p className="text-sm font-semibold text-amber-300 font-mono">{pipe.stale_count}</p>
            <p className="text-[10px] text-os-text-dim">Gone quiet</p>
          </div>
          <div className="p-3 rounded-2xl bg-os-card border border-os-border">
            <p className="text-sm font-semibold text-os-ink font-mono">{pipe.win_rate == null ? "—" : `${Math.round(pipe.win_rate * 100)}%`}</p>
            <p className="text-[10px] text-os-text-dim">Win rate</p>
          </div>
        </div>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {rows === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />)}</div>
      ) : rows.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-10">No open quotes. Add them on the Quotations page on a computer.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((q) => {
            const stale = (q.days_open ?? 0) >= STALE_DAYS;
            return (
              <div key={q.id} className={`rounded-2xl border p-3.5 space-y-2.5 ${stale ? "bg-amber-500/[0.06] border-amber-400/25" : "bg-os-card border-os-border"}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-os-ink truncate">{q.customer_name || "Customer"}</p>
                    <p className="text-[10px] text-os-text-dim">
                      {q.reference ? `${q.reference} · ` : ""}{q.days_open != null ? `${q.days_open} days open` : q.status}
                      {q.follow_up_count ? ` · chased ${q.follow_up_count}×` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-mono text-os-ink">{q.total_paise != null ? formatPaise(q.total_paise) : "—"}</p>
                </div>
                {stale && <p className="text-[11px] text-amber-200">Going quiet - worth a call today.</p>}
                <div className="flex gap-2">
                  <button type="button" disabled={busy === q.id} onClick={() => close(q, "won")}
                    className="flex-1 py-2 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs font-semibold text-emerald-200 disabled:opacity-40">Won</button>
                  <button type="button" disabled={busy === q.id} onClick={() => close(q, "lost")}
                    className="flex-1 py-2 rounded-xl bg-white/[0.05] text-xs font-semibold text-os-text-dim disabled:opacity-40">Lost</button>
                  <a href={appPath(`/inbox/${q.customer_id}`)} aria-label="Open chat"
                    className="px-3 py-2 rounded-xl bg-white/[0.06] text-os-ink flex items-center"><MessageSquare className="w-4 h-4" /></a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
