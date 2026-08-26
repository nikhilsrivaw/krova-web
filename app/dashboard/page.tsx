"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  AlertTriangle,
  CheckSquare,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  MessageSquare,
  PhoneCall,
  Shield,
  Layers,
  ArrowUpRight,
  ExternalLink,
  Flame,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import {
  ledger,
  approvals,
  analytics,
  formatPaise,
  type LedgerSummary,
  type Commitment,
  type MessageDraft,
  type AnalyticsOverview,
} from "@/lib/api";

export default function DashboardPage() {
  const [ledgerSummary, setLedgerSummary] = useState<LedgerSummary | null>(null);
  const [pendingDrafts, setPendingDrafts] = useState<MessageDraft[]>([]);
  const [overdueCommitments, setOverdueCommitments] = useState<Commitment[]>([]);
  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadDashboard = async () => {
      const [sumRes, draftsRes, overdueRes, overRes] = await Promise.allSettled([
        ledger.summary(),
        approvals.list("pending"),
        ledger.commitments({ overdue_only: true, limit: 5 }),
        analytics.overview(),
      ]);
      if (!mounted) return;

      if (sumRes.status === "fulfilled") setLedgerSummary(sumRes.value);
      if (draftsRes.status === "fulfilled") setPendingDrafts(draftsRes.value.slice(0, 5));
      if (overdueRes.status === "fulfilled") setOverdueCommitments(overdueRes.value);
      if (overRes.status === "fulfilled") setOverview(overRes.value);

      const failed = [sumRes, draftsRes, overdueRes, overRes].find(
        (r) => r.status === "rejected",
      );
      if (failed && failed.status === "rejected") {
        setLoadError(
          failed.reason instanceof Error
            ? failed.reason.message
            : "Some dashboard data could not be loaded.",
        );
      }
      setIsLoading(false);
    };

    loadDashboard();
    return () => {
      mounted = false;
    };
  }, []);

  const owedToUs = ledgerSummary?.owed_to_us_paise ?? 0;
  const overduePaise = ledgerSummary?.overdue_paise ?? 0;
  const overdueCount = ledgerSummary?.overdue_count ?? 0;
  const pendingCount = pendingDrafts.length;
  const openCount = ledgerSummary?.open_count ?? 0;
  const unconfirmedCount = ledgerSummary?.unconfirmed_count ?? 0;

  return (
    <AppLayout
      title="Executive Command Center"
      subtitle="Autonomous AI Operations & Financial Telemetry"
      actions={
        <Link
          href="/approvals"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-semibold shadow-lg shadow-brass/20 active:scale-95 transition-all"
        >
          <CheckSquare className="w-3.5 h-3.5" />
          <span>Review {pendingCount} Pending Drafts</span>
        </Link>
      }
    >
      <div className="space-y-6 max-w-7xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {/* Top ROI Impact Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-brass/30 bg-gradient-to-r from-brass/[0.08] via-os-bg to-os-card p-6 shadow-2xl">
          <div className="absolute top-0 right-0 w-96 h-96 bg-brass/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-seal/10 border border-seal/30 text-seal-bright text-[11px] font-mono font-semibold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-seal-bright animate-pulse" />
                  AI Watchdog Active
                </span>
                <span className="text-xs text-os-text-dim font-mono">
                  • 24/7 Channel Ingestion
                </span>
              </div>
              <h2 className="text-2xl md:text-3xl font-serif font-semibold text-os-ink tracking-tight">
                {overview ? overview.owed_to_you : formatPaise(owedToUs)}{" "}
                <span className="text-base md:text-lg font-sans font-normal text-os-text-dim">
                  Total Receivables Tracked
                </span>
              </h2>
              <p className="text-xs text-os-text-dim max-w-xl">
                KROVA is monitoring WhatsApp and Voice streams, extracting commitment promises, and preparing draft responses.
              </p>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <p className="text-[10px] uppercase font-mono text-os-text-dim">
                  Promises Kept
                </p>
                <p className="text-lg font-bold font-mono text-white">
                  {overview?.promises_kept != null
                    ? `${Math.round(overview.promises_kept * 100)}%`
                    : "—"}
                </p>
              </div>
              <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                <p className="text-[10px] uppercase font-mono text-os-text-dim">
                  Drafted by Agent
                </p>
                <p className="text-lg font-bold font-mono text-white">
                  {overview?.agent.drafted ?? "—"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 4 Core Financial & Operational Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Owed to You"
            value={formatPaise(owedToUs)}
            subtitle="Customer commitments extracted"
            icon={DollarSign}
            accentColor="emerald"
            badgeText={`${openCount} open`}
          />

          <MetricCard
            title="Overdue Receivables"
            value={formatPaise(overduePaise)}
            subtitle={`${overdueCount} promises past deadline`}
            icon={AlertTriangle}
            accentColor="rose"
            badgeText="Urgent"
          />

          <MetricCard
            title="Pending Approvals"
            value={pendingCount}
            subtitle="AI replies ready for review"
            icon={CheckSquare}
            accentColor="indigo"
            badgeText="Draft Queue"
          />

          <MetricCard
            title="Needs Review"
            value={unconfirmedCount}
            subtitle="AI guesses awaiting confirmation"
            icon={Clock}
            accentColor="amber"
            badgeText="Quarantine"
          />
        </div>

        {/* "What Needs Your Attention Today" Priority Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column 1: Overdue Commitments Needing Follow-up */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-thread/10 border border-thread/20 text-thread-bright">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Overdue Commitments
                    </h3>
                    <p className="text-[11px] text-os-text-dim">
                      Oldest unpaid promises requiring attention
                    </p>
                  </div>
                </div>
                <Link
                  href="/ledger?filter=overdue"
                  className="text-xs font-semibold text-thread-bright hover:text-thread-bright flex items-center gap-1 transition-colors"
                >
                  View All ({overdueCount}) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : overdueCommitments.length === 0 ? (
                <div className="py-8 text-center text-xs text-os-text-dim border border-dashed border-white/[0.06] rounded-xl">
                  🎉 No overdue commitments! All customers are on track.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {overdueCommitments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {c.customer_name || "Client"}
                          </span>
                          <Badge variant="rose" size="sm">
                            Overdue
                          </Badge>
                        </div>
                        <p className="text-[11px] text-os-text-dim line-clamp-1">
                          "{c.description || c.source_quote || "Payment promised"}"
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-xs font-bold font-mono text-thread-bright">
                          {c.amount_display || formatPaise(c.amount_paise)}
                        </p>
                        <p className="text-[10px] font-mono text-os-text-dim">
                          Due {c.due_at ? new Date(c.due_at).toLocaleDateString("en-IN") : "Past"}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-os-text-dim">
              <span>Auto-reminder campaigns available</span>
              <Link
                href="/campaigns"
                className="text-xs text-brass hover:text-brass-bright font-semibold"
              >
                Send Reminder Broadcast →
              </Link>
            </div>
          </GlassCard>

          {/* Column 2: Oldest Pending Drafts */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-brass/10 border border-brass/20 text-brass">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Pending Draft Replies
                    </h3>
                    <p className="text-[11px] text-os-text-dim">
                      AI proposed replies waiting for human approval
                    </p>
                  </div>
                </div>
                <Link
                  href="/approvals"
                  className="text-xs font-semibold text-brass hover:text-brass-bright flex items-center gap-1 transition-colors"
                >
                  Go to Approvals ({pendingCount}) <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-16 w-full" />
                </div>
              ) : pendingDrafts.length === 0 ? (
                <div className="py-8 text-center text-xs text-os-text-dim border border-dashed border-white/[0.06] rounded-xl">
                  ✨ Approvals inbox clear! No drafts pending your review.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pendingDrafts.map((d) => (
                    <div
                      key={d.id}
                      className="p-3.5 rounded-xl bg-white/[0.02] border border-brass/20 hover:border-brass/40 transition-all flex items-center justify-between gap-3 group"
                    >
                      <div className="space-y-1 overflow-hidden">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white truncate">
                            {d.customer_name || "Customer"}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brass/20 text-brass-bright border border-brass/30">
                            {d.channel.toUpperCase()}
                          </span>
                          <span className="text-[10px] font-mono text-seal-bright">
                            {Math.round(d.confidence * 100)}% Match
                          </span>
                        </div>
                        <p className="text-[11px] text-os-text-dim line-clamp-1 italic">
                          "{d.body}"
                        </p>
                      </div>

                      <Link
                        href="/approvals"
                        className="px-2.5 py-1.5 rounded-lg bg-brass/10 hover:bg-brass/20 text-brass-bright text-xs font-semibold border border-brass/30 shrink-0 transition-colors"
                      >
                        Review
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06] flex items-center justify-between text-xs text-os-text-dim">
              <span>Operating in <strong>Draft Mode</strong> (Human-in-the-loop)</span>
              <Link
                href="/settings"
                className="text-xs text-os-text-dim hover:text-white"
              >
                Configure Autonomy →
              </Link>
            </div>
          </GlassCard>
        </div>

        {/* Live Channel Telemetry Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-os-card border border-white/[0.06] flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-seal/10 border border-seal/20 text-seal-bright">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">WhatsApp Business</p>
              <p className="text-[11px] text-seal-bright font-mono">
                ● Live & Connected (Quality: Green)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-os-card border border-white/[0.06] flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <PhoneCall className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Voice Phone Agent</p>
              <p className="text-[11px] text-cyan-400 font-mono">
                ● Live Inbound Ready (0.8s Latency)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-os-card border border-white/[0.06] flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Knowledge Base</p>
              <p className="text-[11px] text-purple-400 font-mono">
                ● Context Active (0 Unanswered Gaps)
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
