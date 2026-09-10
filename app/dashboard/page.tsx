"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  DollarSign,
  AlertTriangle,
  CheckSquare,
  Clock,
  ArrowRight,
  MessageSquare,
  PhoneCall,
  Shield,
  Flame,
  Mail,
  Instagram,
  Globe,
  Radio,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { DotPattern } from "@/components/magicui/dot-pattern";
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

const CHANNEL_META: Record<string, { label: string; icon: React.ElementType; iconWrap: string; text: string }> = {
  whatsapp: { label: "WhatsApp", icon: MessageSquare, iconWrap: "bg-seal/10 border-seal/20 text-seal-bright", text: "text-seal-bright" },
  voice: { label: "Voice", icon: PhoneCall, iconWrap: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400", text: "text-cyan-400" },
  instagram: { label: "Instagram", icon: Instagram, iconWrap: "bg-purple-500/10 border-purple-500/20 text-purple-400", text: "text-purple-400" },
  email: { label: "Email", icon: Mail, iconWrap: "bg-amber-500/10 border-amber-500/20 text-amber-400", text: "text-amber-400" },
  web: { label: "Website Widget", icon: Globe, iconWrap: "bg-indigo-500/10 border-indigo-500/20 text-indigo-400", text: "text-indigo-400" },
};
const DEFAULT_CHANNEL_META = { label: "Other", icon: Radio, iconWrap: "bg-white/[0.04] border-white/[0.08] text-os-text-dim", text: "text-os-text-dim" };

/** Rupees from paise, as a plain number for NumberTicker (which does its own
 * en-IN grouping) rather than the pre-formatted "₹1,85,000" string. */
const rupees = (paise: number) => paise / 100;

/** Only surfaces anything once a draft's reply window is genuinely close to
 * closing - `expire_stale_drafts()` on the backend silently drops an
 * unapproved draft once this passes, so this is the one visible warning
 * an owner gets before that happens. */
function expiryUrgency(expiresAt: string | null): { label: string; className: string } | null {
  if (!expiresAt) return null;
  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) {
    return { label: "Window closed", className: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  }
  const hoursLeft = msLeft / 3_600_000;
  if (hoursLeft < 2) {
    const mins = Math.round(msLeft / 60_000);
    return {
      label: `Expires in ${mins}m`,
      className: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
    };
  }
  if (hoursLeft < 6) {
    return {
      label: `Expires in ${Math.round(hoursLeft)}h`,
      className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }
  return null;
}

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
        ledger.commitments({ overdue_only: true, direction: "they_owe", limit: 5 }),
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
  // "Receivables" means money customers owe us - scoped to that direction,
  // not the combined overdue_paise/overdue_count (which also includes
  // things we promised customers that are running late, a different kind
  // of overdue entirely).
  const overduePaise = ledgerSummary?.overdue_they_owe_paise ?? 0;
  const overdueCount = ledgerSummary?.overdue_they_owe_count ?? 0;
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
      {/* A flat os-bg gives GlassCard's own backdrop-blur nothing to blur -
          this soft, low-key depth layer (brass/seal glow + a faint dot grid,
          both far below marketing-page intensity) is what makes the glass
          cards below actually read as glass rather than plain panels. */}
      <div className="relative">
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-24 right-[8%] w-[480px] h-[480px] rounded-full bg-brass/[0.07] blur-[120px]" />
          <div className="absolute top-[40%] -left-24 w-[420px] h-[420px] rounded-full bg-seal/[0.06] blur-[120px]" />
          <div className="absolute bottom-0 right-[20%] w-[360px] h-[360px] rounded-full bg-thread/[0.04] blur-[110px]" />
          <DotPattern
            className="fill-white/[0.025]"
            width={28}
            height={28}
          />
        </div>

        <div className="space-y-6 max-w-7xl mx-auto">
          {loadError && (
            <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
              {loadError}
            </div>
          )}
          {/* Top ROI Impact Banner */}
          <GlassCard variant="glow" className="relative overflow-hidden p-6">
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
                  <NumberTicker value={rupees(owedToUs)} prefix="₹" className="text-os-ink" />{" "}
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
                    {overview?.promises_kept != null ? (
                      <NumberTicker value={Math.round(overview.promises_kept * 100)} suffix="%" />
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
                <div className="px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
                  <p className="text-[10px] uppercase font-mono text-os-text-dim">
                    Drafted by Agent
                  </p>
                  <p className="text-lg font-bold font-mono text-white">
                    {overview?.agent.drafted != null ? (
                      <NumberTicker value={overview.agent.drafted} />
                    ) : (
                      "—"
                    )}
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>

          {/* 4 Core Financial & Operational Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Owed to You"
              value={<NumberTicker value={rupees(owedToUs)} prefix="₹" />}
              subtitle="Customer commitments extracted"
              icon={DollarSign}
              accentColor="emerald"
              badgeText={`${openCount} open`}
            />

            <MetricCard
              title="Overdue Receivables"
              value={<NumberTicker value={rupees(overduePaise)} prefix="₹" />}
              subtitle={`${overdueCount} promises past deadline`}
              icon={AlertTriangle}
              accentColor="rose"
              badgeText="Urgent"
            />

            <MetricCard
              title="Pending Approvals"
              value={<NumberTicker value={pendingCount} />}
              subtitle="AI replies ready for review"
              icon={CheckSquare}
              accentColor="indigo"
              badgeText="Draft Queue"
            />

            <MetricCard
              title="Needs Review"
              value={<NumberTicker value={unconfirmedCount} />}
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
                    {pendingDrafts.map((d) => {
                      const urgency = expiryUrgency(d.expires_at);
                      return (
                        <div
                          key={d.id}
                          className="p-3.5 rounded-xl bg-white/[0.02] border border-brass/20 hover:border-brass/40 transition-all flex items-center justify-between gap-3 group"
                        >
                          <div className="space-y-1 overflow-hidden">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-white truncate">
                                {d.customer_name || "Customer"}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-brass/20 text-brass-bright border border-brass/30">
                                {d.channel.toUpperCase()}
                              </span>
                              <span className="text-[10px] font-mono text-seal-bright">
                                {Math.round(d.confidence * 100)}% Match
                              </span>
                              {urgency && (
                                <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 ${urgency.className}`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {urgency.label}
                                </span>
                              )}
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
                      );
                    })}
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

          {/* Channel Activity — real message volume per channel, last 30 days */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-white tracking-tight uppercase font-mono">
                Channel Activity <span className="text-os-text-dim font-normal normal-case">(last 30 days)</span>
              </h3>
              <Link href="/settings" className="text-[11px] text-os-text-dim hover:text-white">
                Connect a channel →
              </Link>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : !overview || overview.channels.length === 0 ? (
              <div className="py-6 text-center text-xs text-os-text-dim border border-dashed border-white/[0.06] rounded-xl">
                No conversations on any channel in the last 30 days yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {overview.channels.map((c) => {
                  const meta = CHANNEL_META[c.channel] || DEFAULT_CHANNEL_META;
                  const Icon = meta.icon;
                  return (
                    <GlassCard key={c.channel} variant="subtle" className="p-4 flex items-center gap-3">
                      <div className={`p-2.5 rounded-lg border ${meta.iconWrap}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-white">{meta.label}</p>
                        <p className={`text-[11px] font-mono ${meta.text}`}>
                          {c.inbound + c.outbound} messages · {c.customers} customer
                          {c.customers === 1 ? "" : "s"}
                        </p>
                      </div>
                    </GlassCard>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
