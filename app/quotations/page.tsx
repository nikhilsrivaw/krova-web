"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FileText, Plus, TrendingUp, AlertTriangle, Check, X } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  quotations as quotationsApi,
  ledger,
  formatPaise,
  type Quotation,
  type QuotationStatus,
  type QuotationPipeline,
  type CustomerSummary,
} from "@/lib/api";

const STATUS_BADGE: Record<QuotationStatus, "emerald" | "amber" | "rose" | "indigo" | "outline"> = {
  draft: "outline",
  sent: "amber",
  negotiating: "indigo",
  won: "emerald",
  lost: "rose",
  expired: "rose",
  withdrawn: "outline",
};

const STATUS_LABEL: Record<QuotationStatus, string> = {
  draft: "Draft",
  sent: "Awaiting reply",
  negotiating: "In negotiation",
  won: "Won",
  lost: "Lost",
  expired: "Expired",
  withdrawn: "Superseded",
};

// Past this, the research says win rate collapses. Same number the API's
// pipeline endpoint defaults to.
const STALE_DAYS = 21;

export default function QuotationsPage() {
  const [items, setItems] = useState<Quotation[]>([]);
  const [pipeline, setPipeline] = useState<QuotationPipeline | null>(null);
  const [contacts, setContacts] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openOnly, setOpenOnly] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState("");
  const [newRef, setNewRef] = useState("");
  const [newTotal, setNewTotal] = useState("");
  const [newNotes, setNewNotes] = useState("");

  const load = useCallback(async (onlyOpen: boolean) => {
    try {
      const [list, stats] = await Promise.all([
        quotationsApi.list(onlyOpen ? { open_only: true } : undefined),
        quotationsApi.pipeline(STALE_DAYS),
      ]);
      setItems(list);
      setPipeline(stats);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load quotations.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load(openOnly);
  }, [load, openOnly]);

  useEffect(() => {
    ledger.customers().then(setContacts).catch(() => setContacts([]));
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setError(null);
    try {
      await fn();
      await load(openOnly);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const handleCreate = () =>
    run("create", async () => {
      const rupees = newTotal.trim() ? Number(newTotal) : null;
      await quotationsApi.create({
        customer_id: newCustomer,
        reference: newRef.trim() || null,
        total_paise: rupees != null && Number.isFinite(rupees) ? Math.round(rupees * 100) : null,
        notes: newNotes.trim() || null,
        mark_sent: true,
      });
      setIsAddOpen(false);
      setNewCustomer("");
      setNewRef("");
      setNewTotal("");
      setNewNotes("");
    });

  const handleOutcome = (id: string, status: QuotationStatus) =>
    run(`out-${id}`, async () => {
      await quotationsApi.recordOutcome(id, status);
    });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Quotations</h1>
            <p className="text-sm text-os-text-dim mt-1">
              Every offer you&apos;ve made, and which ones are going quiet.
            </p>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            disabled={busy !== null}
            className="px-3 py-2 rounded-xl text-xs font-medium bg-brass/20 hover:bg-brass/30 border border-brass/30 text-brass-bright disabled:opacity-50 flex items-center gap-2"
          >
            <Plus className="w-3.5 h-3.5" />
            New quote
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        {pipeline && (
          <GlassCard className="p-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="text-os-text-dim text-[10px] block">Open quotes</span>
                <span className="text-lg font-bold text-white">{pipeline.open_count}</span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="text-os-text-dim text-[10px] block">Open value</span>
                <span className="text-lg font-bold text-white">
                  {formatPaise(pipeline.open_value_paise)}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="text-os-text-dim text-[10px] block">Win rate</span>
                <span className="text-lg font-bold text-emerald-400">
                  {pipeline.win_rate != null ? `${Math.round(pipeline.win_rate * 100)}%` : "—"}
                </span>
              </div>
              <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                <span className="text-os-text-dim text-[10px] block">Gone quiet</span>
                <span
                  className={`text-lg font-bold ${
                    pipeline.stale_count > 0 ? "text-amber-400" : "text-emerald-400"
                  }`}
                >
                  {pipeline.stale_count}
                </span>
              </div>
            </div>
            {pipeline.stale_count > 0 && (
              <p className="text-[11px] text-amber-300 font-mono flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {pipeline.note}
              </p>
            )}
          </GlassCard>
        )}

        <div className="flex items-center gap-2">
          {[
            { label: "Open", value: true },
            { label: "All", value: false },
          ].map((tab) => (
            <button
              key={tab.label}
              onClick={() => setOpenOnly(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                openOnly === tab.value
                  ? "bg-black border-brass/50 text-brass-bright font-bold"
                  : "bg-white/[0.03] border-white/[0.08] text-os-text-dim hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-24" />
            <Skeleton className="h-24" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title={openOnly ? "No open quotes" : "No quotations yet"}
            description="Add a quote you've sent, and Krova will tell you when it starts going quiet."
          />
        ) : (
          <div className="space-y-2">
            {items.map((q) => {
              const stale = (q.days_open ?? 0) >= STALE_DAYS && q.status === "sent";
              const isOpen = ["draft", "sent", "negotiating"].includes(q.status);
              return (
                <GlassCard
                  key={q.id}
                  className={`p-4 ${stale ? "border-amber-500/25" : ""}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {q.customer_name || "Unknown customer"}
                        </h3>
                        {q.reference && (
                          <span className="text-[10px] font-mono text-os-text-dim">
                            {q.reference}
                          </span>
                        )}
                        <Badge variant={STATUS_BADGE[q.status]}>
                          {STATUS_LABEL[q.status]}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-os-text-dim mt-1 font-mono">
                        {q.total_paise != null ? formatPaise(q.total_paise) : "No amount"}
                        {q.days_open != null && ` · sent ${q.days_open}d ago`}
                        {q.follow_up_count > 0 &&
                          ` · ${q.follow_up_count} follow-up${q.follow_up_count === 1 ? "" : "s"}`}
                      </p>
                      {q.notes && (
                        <p className="text-[11px] text-white/70 mt-1.5 line-clamp-2">{q.notes}</p>
                      )}
                      {/* Shown only when the quote was read out of a conversation
                          rather than typed in - so a person can check the
                          extraction instead of trusting it. */}
                      {q.source_quote && (
                        <p className="text-[10px] text-os-text-dim mt-1.5 italic border-l border-white/[0.1] pl-2">
                          &ldquo;{q.source_quote}&rdquo;
                        </p>
                      )}
                    </div>

                    {isOpen && (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => handleOutcome(q.id, "won")}
                          disabled={busy !== null}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-300 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <Check className="w-3 h-3" />
                          Won
                        </button>
                        <button
                          onClick={() => handleOutcome(q.id, "lost")}
                          disabled={busy !== null}
                          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium bg-white/[0.03] hover:bg-red-500/10 border border-white/[0.08] text-os-text-dim hover:text-red-300 disabled:opacity-50 flex items-center gap-1.5"
                        >
                          <X className="w-3 h-3" />
                          Lost
                        </button>
                      </div>
                    )}
                  </div>

                  {q.items.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {q.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/20 border border-white/[0.05] text-[11px]"
                        >
                          <span className="text-white/80 truncate">{item.description}</span>
                          <span className="font-mono text-os-text-dim shrink-0">
                            {item.quantity && `${item.quantity} · `}
                            {item.line_total_paise != null
                              ? formatPaise(item.line_total_paise)
                              : "—"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="New quotation">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-os-text-dim block mb-1.5">Customer</label>
              <select
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white focus:outline-none focus:border-brass/40"
              >
                <option value="">Select a customer…</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name || c.id.slice(0, 8)}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-os-text-dim block mb-1.5">Quote no. (optional)</label>
                <input
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  placeholder="QT-2026-118"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40"
                />
              </div>
              <div>
                <label className="text-xs text-os-text-dim block mb-1.5">Amount ₹ (optional)</label>
                <input
                  value={newTotal}
                  onChange={(e) => setNewTotal(e.target.value)}
                  inputMode="decimal"
                  placeholder="125000"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-os-text-dim block mb-1.5">Notes (optional)</label>
              <textarea
                value={newNotes}
                onChange={(e) => setNewNotes(e.target.value)}
                rows={2}
                placeholder="What was quoted, any terms discussed…"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40 resize-none"
              />
            </div>
            <button
              onClick={handleCreate}
              disabled={!newCustomer || busy !== null}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-brass/20 hover:bg-brass/30 border border-brass/30 text-brass-bright disabled:opacity-40"
            >
              Save quote
            </button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
