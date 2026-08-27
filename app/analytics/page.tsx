"use client";

import React, { useEffect, useState } from "react";
import {
  BarChart3,
  TrendingUp,
  PieChart,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Shield,
  Sparkles,
  DollarSign,
  MessageSquare,
  Phone,
  Mail,
  Zap,
  ArrowRight,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { MetricCard } from "@/components/ui/MetricCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import {
  analytics,
  type ReceivablesAgeing,
  type KeptAnalytics,
  type ChannelActivity,
  type AgentPerformance,
  type TeamPerformance,
} from "@/lib/api";

export default function AnalyticsPage() {
  const [receivables, setReceivables] = useState<ReceivablesAgeing | null>(null);
  const [kept, setKept] = useState<KeptAnalytics | null>(null);
  const [channelsData, setChannelsData] = useState<ChannelActivity[]>([]);
  const [agentPerf, setAgentPerf] = useState<AgentPerformance | null>(null);
  const [teamPerf, setTeamPerf] = useState<TeamPerformance | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const loadAnalytics = async () => {
      const [recRes, keptRes, chRes, agRes, teamRes] = await Promise.allSettled([
        analytics.receivables(),
        analytics.kept(),
        analytics.channels(),
        analytics.agent(),
        analytics.team(),
      ]);
      if (!mounted) return;

      if (recRes.status === "fulfilled") setReceivables(recRes.value);
      if (keptRes.status === "fulfilled") setKept(keptRes.value);
      if (chRes.status === "fulfilled") setChannelsData(chRes.value);
      if (agRes.status === "fulfilled") setAgentPerf(agRes.value);
      if (teamRes.status === "fulfilled") setTeamPerf(teamRes.value);

      const failed = [recRes, keptRes, chRes, agRes].find((r) => r.status === "rejected");
      if (failed && failed.status === "rejected") {
        setLoadError(
          failed.reason instanceof Error
            ? failed.reason.message
            : "Some analytics data could not be loaded.",
        );
      }
      setIsLoading(false);
    };

    loadAnalytics();
    return () => {
      mounted = false;
    };
  }, []);

  // A business is only safe to move off Draft mode once the agent has a
  // real track record: the same 95%-across-200-samples bar this page used
  // to state as fixed advice text, now actually checked against real counts
  // instead of asserted regardless of them.
  const readyForActMode =
    agentPerf != null &&
    agentPerf.approval_rate != null &&
    agentPerf.approval_rate >= 0.95 &&
    agentPerf.drafted >= 200;

  return (
    <AppLayout
      title="Analytics & Intelligence"
      subtitle="Receivables aging, promise fulfillment & AI agent performance benchmark"
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}

        {/* SECTION 1: AGENT PERFORMANCE (THE "IS IT SAFE FOR ACT MODE?" BENCHMARK) */}
        <div className="p-6 rounded-2xl border border-brass/30 bg-gradient-to-br from-[#0B0F17] to-brass/10 space-y-4 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-brass/20 border border-brass/30 text-brass-bright">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">
                  AI Agent Performance — Readiness for Act Mode
                </h3>
                <p className="text-xs text-os-text-dim">
                  How accurately the AI writes replies before you flip the switch from Draft to Autonomous Act mode.
                </p>
              </div>
            </div>

            <Badge variant={readyForActMode ? "emerald" : "amber"}>
              {readyForActMode ? "Ready for Act Mode" : "Maintain Draft Mode"}
            </Badge>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-os-text-dim text-[10px] block">Drafts Prepared</span>
              <span className="text-lg font-bold text-white">{agentPerf?.drafted ?? "—"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-os-text-dim text-[10px] block">Approval Rate</span>
              <span className="text-lg font-bold text-seal-bright">
                {agentPerf?.approval_rate != null
                  ? `${Math.round(agentPerf.approval_rate * 100)}%`
                  : "—"}
              </span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-os-text-dim text-[10px] block">Human Edits</span>
              <span className="text-lg font-bold text-brass-bright">{agentPerf?.edited ?? "—"}</span>
            </div>
            <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <span className="text-os-text-dim text-[10px] block">Rejections</span>
              <span className="text-lg font-bold text-thread-bright">{agentPerf?.rejected ?? "—"}</span>
            </div>
          </div>

          {agentPerf?.note && (
            <p className="text-xs text-brass-bright/90 font-mono bg-brass/10 p-3 rounded-lg border border-brass/20">
              💡 {agentPerf.note}
            </p>
          )}
        </div>

        {/* SECTION 1b: TEAM PERFORMANCE - THE HUMANS, NOT THE AI */}
        {teamPerf && teamPerf.members.length > 0 && (
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-bold text-white">Team Performance</h4>
              <span className="text-[10px] font-mono text-os-text-dim">
                Last {teamPerf.days} days
              </span>
            </div>
            <p className="text-xs text-os-text-dim mb-4">
              First-response time only counts a reply a team member actually sent to someone
              waiting - not a campaign blast, not an unreviewed AI send.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-2 px-3">Team Member</th>
                    <th className="py-2 px-3">Messages Sent</th>
                    <th className="py-2 px-3">Avg First Response</th>
                    <th className="py-2 px-3">Commitments Resolved</th>
                    <th className="py-2 px-3">Avg Resolution Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {teamPerf.members.map((m) => (
                    <tr key={m.user_id}>
                      <td className="py-2.5 px-3">
                        <p className="font-bold text-white">{m.full_name || m.email}</p>
                        <p className="text-[10px] text-os-text-dim">{m.email}</p>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white">{m.messages_sent}</td>
                      <td className="py-2.5 px-3 font-mono text-seal-bright">
                        {m.avg_first_response_minutes != null
                          ? m.avg_first_response_minutes < 60
                            ? `${m.avg_first_response_minutes}m`
                            : `${(m.avg_first_response_minutes / 60).toFixed(1)}h`
                          : "—"}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-white">{m.commitments_resolved}</td>
                      <td className="py-2.5 px-3 font-mono text-brass-bright">
                        {m.avg_resolution_hours != null
                          ? m.avg_resolution_hours < 48
                            ? `${m.avg_resolution_hours}h`
                            : `${(m.avg_resolution_hours / 24).toFixed(1)}d`
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        )}

        {/* SECTION 2: RECEIVABLES AGING & PROMISE-KEEPING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Receivables Aging Buckets */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Receivables Aging (CA-Readable)</h4>
                <p className="text-xs text-os-text-dim">Outstanding promises grouped by days overdue</p>
              </div>
              <span className="text-xs font-mono font-bold text-thread-bright">
                {receivables?.total ?? "₹0"} Total Owed
              </span>
            </div>

            <div className="space-y-3 font-mono text-xs">
              {(receivables?.buckets ?? []).map((bucket) => (
                <div
                  key={bucket.label}
                  className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between"
                >
                  <span className="text-os-text-dim">
                    {bucket.label} ({bucket.count})
                  </span>
                  <span
                    className={`font-bold ${
                      bucket.label === "Not yet due" || bucket.label === "0-30 days"
                        ? "text-seal-bright"
                        : bucket.label === "31-60 days"
                        ? "text-amber-400"
                        : "text-thread-bright"
                    }`}
                  >
                    {bucket.amount}
                  </span>
                </div>
              ))}
            </div>

            {receivables?.worst_customer && (
              <div className="mt-4 p-3 rounded-xl bg-thread/10 border border-thread/20 flex items-center justify-between text-xs">
                <div>
                  <span className="text-[10px] uppercase font-mono text-thread-bright block">
                    Highest Overdue Customer:
                  </span>
                  <span className="font-bold text-white">
                    {receivables.worst_customer.name || "Unnamed customer"}
                  </span>
                </div>
                <span className="font-mono font-bold text-thread-bright">
                  {receivables.worst_customer.amount} ({receivables.worst_customer.oldest_days}d late)
                </span>
              </div>
            )}
          </GlassCard>

          {/* Promise-Keeping Rate */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="text-sm font-bold text-white">Promise-Keeping Reliability</h4>
                <p className="text-xs text-os-text-dim">Customer fulfillment rate of stated payment commitments</p>
              </div>
              <Badge variant="emerald">
                {kept?.kept_rate != null ? `${Math.round(kept.kept_rate * 100)}%` : "—"} Kept
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4 font-mono text-xs text-center">
              <div className="p-3 rounded-xl bg-seal/10 border border-seal/20">
                <span className="text-[10px] text-os-text-dim block">Promises Met</span>
                <span className="text-lg font-bold text-seal-bright">{kept?.met ?? "—"}</span>
              </div>
              <div className="p-3 rounded-xl bg-thread/10 border border-thread/20">
                <span className="text-[10px] text-os-text-dim block">Missed Deadlines</span>
                <span className="text-lg font-bold text-thread-bright">{kept?.missed ?? "—"}</span>
              </div>
            </div>

            {kept?.note && (
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs text-os-text-dim">
                <p className="leading-relaxed">{kept.note}</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* SECTION 3: CHANNEL VOLUME SPLIT */}
        <GlassCard className="p-6">
          <h4 className="text-sm font-bold text-white mb-1">
            Channel Volume Telemetry
          </h4>
          <p className="text-xs text-os-text-dim mb-4">
            Total message and voice minutes processed across active business connectors.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {channelsData.map((ch) => (
              <div
                key={ch.channel}
                className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2 font-mono text-xs"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white uppercase">{ch.channel}</span>
                  <Badge variant="default" size="sm">
                    {ch.customers} Clients
                  </Badge>
                </div>
                <div className="flex justify-between text-os-text-dim text-[11px]">
                  <span>Inbound: <strong className="text-white">{ch.inbound}</strong></span>
                  <span>Outbound: <strong className="text-white">{ch.outbound}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
