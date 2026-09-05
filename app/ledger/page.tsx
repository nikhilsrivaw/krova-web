"use client";

import React, { useEffect, useState } from "react";
import {
  Layers,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowDownLeft,
  ArrowUpRight,
  HelpCircle,
  Search,
  Filter,
  Check,
  X,
  ExternalLink,
  Shield,
  Sparkles,
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  Download,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  ledger,
  formatPaise,
  type Commitment,
  type CommitmentDetail,
  type LedgerSummary,
} from "@/lib/api";

type FilterType = "all" | "overdue" | "they_owe" | "we_owe" | "unconfirmed";

const FILTERS: { key: FilterType; label: string }[] = [
  { key: "all", label: "All Promises" },
  { key: "overdue", label: "Overdue" },
  { key: "they_owe", label: "Owed to You (Receivables)" },
  { key: "we_owe", label: "You Promised (Payables)" },
  { key: "unconfirmed", label: "Needs Review (Quarantine)" },
];

export default function LedgerPage() {
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [commitments, setCommitments] = useState<Commitment[]>([]);
  const [filter, setFilter] = useState<FilterType>("all");
  const [selectedCommitment, setSelectedCommitment] = useState<CommitmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10);
  const [tallyFrom, setTallyFrom] = useState(monthStart);
  const [tallyTo, setTallyTo] = useState(today);
  const [isExportingTally, setIsExportingTally] = useState(false);

  const handleExportTally = async () => {
    setIsExportingTally(true);
    setActionError(null);
    try {
      const blob = await ledger.exportTally({ from: tallyFrom, to: tallyTo });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "krova_tally_receipts.xml";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not export for Tally.");
    } finally {
      setIsExportingTally(false);
    }
  };

  const loadLedger = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [sumRes, comRes] = await Promise.allSettled([
      ledger.summary(),
      ledger.commitments({
        direction: filter === "they_owe" ? "they_owe" : filter === "we_owe" ? "we_owe" : undefined,
        status: filter === "unconfirmed" ? "unconfirmed" : undefined,
        overdue_only: filter === "overdue",
      }),
    ]);

    if (sumRes.status === "fulfilled") setSummary(sumRes.value);
    if (comRes.status === "fulfilled") setCommitments(comRes.value);

    const failed = [sumRes, comRes].find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(
        failed.reason instanceof Error ? failed.reason.message : "Could not load the ledger.",
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadLedger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleConfirm = async (id: string) => {
    setActionError(null);
    try {
      await ledger.confirm(id);
      loadLedger();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not confirm this commitment.");
    }
  };

  const handleResolve = async (id: string, outcome: "met" | "missed" | "cancelled") => {
    setActionError(null);
    try {
      await ledger.resolve(id, outcome);
      loadLedger();
      setSelectedCommitment(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update this commitment.");
    }
  };

  const openEvidence = async (com: Commitment) => {
    setIsLoadingDetail(true);
    setActionError(null);
    try {
      const detail = await ledger.detail(com.id);
      setSelectedCommitment(detail);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load evidence for this commitment.");
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const unconfirmedList = commitments.filter((c) => c.status === "unconfirmed");
  const regularList = commitments.filter((c) => c.status !== "unconfirmed");

  return (
    <AppLayout
      title="Commitment Ledger"
      subtitle="Two-way extracted promises, payment deadlines & conversational evidence"
      actions={
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={tallyFrom}
            onChange={(e) => setTallyFrom(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none"
          />
          <span className="text-os-text-dim text-xs">to</span>
          <input
            type="date"
            value={tallyTo}
            onChange={(e) => setTallyTo(e.target.value)}
            className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none"
          />
          <button
            type="button"
            onClick={handleExportTally}
            disabled={isExportingTally}
            title="Export settled payments as a Tally-importable file for your CA"
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            {isExportingTally ? "Exporting..." : "Export for Tally"}
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {actionError}
          </div>
        )}

        {/* Metric Summary Ribbon */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Owed to You"
            value={formatPaise(summary?.owed_to_us_paise ?? 0)}
            subtitle="Receivables extracted by AI"
            icon={ArrowDownLeft}
            accentColor="emerald"
          />

          <MetricCard
            title="You Promised"
            value={formatPaise(summary?.owed_by_us_paise ?? 0)}
            subtitle="Outgoing business obligations"
            icon={ArrowUpRight}
            accentColor="cyan"
          />

          <MetricCard
            title="Overdue Receivables"
            value={formatPaise(summary?.overdue_paise ?? 0)}
            subtitle={`${summary?.overdue_count ?? 0} promises overdue`}
            icon={AlertTriangle}
            accentColor="rose"
            badgeText="Urgent"
          />

          <MetricCard
            title="Needs Review"
            value={summary?.unconfirmed_count ?? 0}
            subtitle="Excluded from totals until confirmed"
            icon={HelpCircle}
            accentColor="amber"
            badgeText="Quarantine"
          />
        </div>

        {/* Filter Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3 overflow-x-auto">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filter === f.key
                  ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-inner font-bold"
                  : "text-os-text-dim hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Unconfirmed AI Extractions Quarantine Bucket (If viewing All or Unconfirmed) */}
        {(filter === "all" || filter === "unconfirmed") && unconfirmedList.length > 0 && (
          <div className="p-5 rounded-2xl border border-amber-500/30 bg-amber-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-amber-300">
                  <HelpCircle className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold font-mono uppercase text-amber-300 tracking-wider">
                    Unconfirmed AI Extractions (Quarantined)
                  </h4>
                  <p className="text-xs text-os-text-dim">
                    AI detected potential commitments with lower confidence. Verify or reject to keep ledger 100% accurate.
                  </p>
                </div>
              </div>
              <Badge variant="amber">{unconfirmedList.length} Awaiting Verification</Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
              {unconfirmedList.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl bg-black/40 border border-amber-500/20 flex flex-col justify-between gap-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold text-white">
                        {c.customer_name || "Customer"}
                      </span>
                      <span className="text-xs font-mono font-bold text-amber-300">
                        {c.amount_display || formatPaise(c.amount_paise)}
                      </span>
                    </div>
                    <p className="text-xs text-white/80 italic mb-2">
                      "{c.source_quote || c.description}"
                    </p>
                    <span className="text-[10px] font-mono text-os-text-dim">
                      Confidence: {Math.round(c.confidence * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/[0.04]">
                    <button
                      type="button"
                      onClick={() => handleResolve(c.id, "cancelled")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white bg-white/[0.04] transition-colors"
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      onClick={() => handleConfirm(c.id)}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-black bg-amber-400 hover:bg-amber-300 transition-all shadow-md"
                    >
                      Confirm into Ledger
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Regular Confirmed Commitments Table */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-bold text-white">
              Confirmed Commitment Records
            </h4>
            <span className="text-xs font-mono text-os-text-dim">
              Sorted: Overdue First
            </span>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-14 w-full" />
            </div>
          ) : regularList.length === 0 ? (
            <EmptyState
              icon={Layers}
              title="No commitments in this view"
              description="Extracted promises from customer chats and calls will automatically appear here."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3">Direction</th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Promise / Kind</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Due Date</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {regularList.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => openEvidence(c)}
                      className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                    >
                      <td className="py-3 px-3">
                        {c.direction === "they_owe" ? (
                          <Badge variant="emerald" size="sm">
                            They Owe
                          </Badge>
                        ) : (
                          <Badge variant="cyan" size="sm">
                            We Owe
                          </Badge>
                        )}
                      </td>

                      <td className="py-3 px-3 font-semibold text-white">
                        {c.customer_name || "Customer"}
                      </td>

                      <td className="py-3 px-3 max-w-xs">
                        <p className="text-white/90 truncate">
                          {c.description}
                        </p>
                        <span className="text-[10px] font-mono text-os-text-dim capitalize">
                          Kind: {c.kind}
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono font-bold text-white">
                        {c.amount_display || (c.amount_paise ? formatPaise(c.amount_paise) : "—")}
                      </td>

                      <td className="py-3 px-3 font-mono">
                        {c.overdue ? (
                          <span className="text-thread-bright font-bold flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            Overdue
                          </span>
                        ) : c.due_at ? (
                          <span className="text-os-text-dim">
                            {new Date(c.due_at).toLocaleDateString("en-IN")}
                          </span>
                        ) : (
                          <span className="text-os-text-dim">Open</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <Badge
                          variant={
                            c.status === "met"
                              ? "emerald"
                              : c.status === "missed"
                              ? "rose"
                              : "default"
                          }
                          size="sm"
                        >
                          {c.status.toUpperCase()}
                        </Badge>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEvidence(c);
                          }}
                          className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-xs transition-colors"
                        >
                          Evidence →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* Commitment Evidence & Resolve Drawer */}
        <Drawer
          isOpen={!!selectedCommitment}
          onClose={() => setSelectedCommitment(null)}
          title="Commitment Evidence Inspector"
          subtitle={`Verified record for ${selectedCommitment?.customer_name || "Customer"}`}
          width="md"
        >
          {selectedCommitment && (
            <div className="space-y-6">
              {/* Financial Detail Card */}
              <GlassCard className="p-4 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase text-os-text-dim">
                    {selectedCommitment.direction === "they_owe"
                      ? "Receivable Amount"
                      : "Payable Obligation"}
                  </span>
                  <span className="text-xl font-bold font-mono text-seal-bright">
                    {selectedCommitment.amount_display ||
                      (selectedCommitment.amount_paise
                        ? formatPaise(selectedCommitment.amount_paise)
                        : "Non-monetary task")}
                  </span>
                </div>
                <p className="text-xs text-white/90">{selectedCommitment.description}</p>
              </GlassCard>

              {/* Exact Conversational Evidence Quote */}
              <div>
                <h4 className="text-xs font-mono uppercase text-brass-bright font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  Exact Source Citation
                </h4>
                <div className="p-4 rounded-xl bg-brass/10 border border-brass/30 text-xs text-white italic leading-relaxed">
                  "{selectedCommitment.source_quote || selectedCommitment.description}"
                </div>
              </div>

              {/* Action Buttons: Mark Met, Missed, Cancelled */}
              {selectedCommitment.status === "open" && (
                <div className="pt-4 border-t border-white/[0.06] space-y-3">
                  <h5 className="text-xs font-mono uppercase text-os-text-dim">
                    Resolve Promise:
                  </h5>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleResolve(selectedCommitment.id, "met")}
                      className="py-2 rounded-lg bg-seal hover:bg-seal-dim text-white font-bold text-xs shadow-md"
                    >
                      ✓ Mark Met
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(selectedCommitment.id, "missed")}
                      className="py-2 rounded-lg bg-thread hover:bg-thread-dim text-white font-bold text-xs shadow-md"
                    >
                      ✕ Mark Missed
                    </button>
                    <button
                      type="button"
                      onClick={() => handleResolve(selectedCommitment.id, "cancelled")}
                      className="py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-os-text-dim hover:text-white text-xs font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </Drawer>
      </div>
    </AppLayout>
  );
}
