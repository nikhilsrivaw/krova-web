"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Radar, Bug, Sparkles, MessageSquareWarning, TrendingDown, Heart, Check, Activity } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { signals as signalsApi, ledger, type Signal, type SignalKind, type SignalSeverity, type CustomerSummary } from "@/lib/api";

const KIND_META: Record<SignalKind, { label: string; icon: typeof Bug; badge: "rose" | "indigo" | "amber" | "purple" | "emerald" }> = {
  bug: { label: "Bug", icon: Bug, badge: "rose" },
  feature_request: { label: "Feature Request", icon: Sparkles, badge: "indigo" },
  complaint: { label: "Complaint", icon: MessageSquareWarning, badge: "amber" },
  churn_risk: { label: "Churn Risk", icon: TrendingDown, badge: "rose" },
  praise: { label: "Praise", icon: Heart, badge: "emerald" },
  account_health: { label: "Account Health", icon: Activity, badge: "purple" },
};

const SEVERITY_BADGE: Record<SignalSeverity, "rose" | "amber" | "default"> = {
  critical: "rose",
  warning: "amber",
  info: "default",
};

export default function SignalsPage() {
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [kindFilter, setKindFilter] = useState<SignalKind | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<SignalSeverity | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed user"]));
    return (id: string | null) => (id ? map.get(id) || id.slice(0, 8) : "Unknown user");
  }, [customers]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const results = await Promise.allSettled([signalsApi.list(), ledger.customers()]);
    const [signalsRes, customersRes] = results;
    if (signalsRes.status === "fulfilled") setAllSignals(signalsRes.value);
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value);

    const failed = results.find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(failed.reason instanceof Error ? failed.reason.message : "Could not load signals.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = allSignals.filter(
    (s) => (kindFilter === "all" || s.kind === kindFilter) && (severityFilter === "all" || s.severity === severityFilter),
  );

  const handleDismiss = async (id: string) => {
    setActionError(null);
    try {
      await signalsApi.dismiss(id);
      setAllSignals((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not dismiss this signal.");
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of allSignals) c[s.kind] = (c[s.kind] || 0) + 1;
    return c;
  }, [allSignals]);

  return (
    <AppLayout
      title="Product Feedback Signals"
      subtitle="What users are actually telling you - bugs, feature requests, complaints, churn risk, and praise."
    >
      <div className="space-y-6 max-w-6xl mx-auto">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {(Object.keys(KIND_META) as SignalKind[]).map((kind) => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            return (
              <GlassCard key={kind} className="p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Icon className="w-3.5 h-3.5 text-os-text-dim" />
                  <span className="text-[10px] font-mono uppercase text-os-text-dim">{meta.label}</span>
                </div>
                <span className="text-2xl font-bold text-white">{counts[kind] || 0}</span>
              </GlassCard>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3">
          <button
            type="button"
            onClick={() => setKindFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${kindFilter === "all" ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"}`}
          >
            All kinds
          </button>
          {(Object.keys(KIND_META) as SignalKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              onClick={() => setKindFilter(kind)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${kindFilter === kind ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"}`}
            >
              {KIND_META[kind].label}
            </button>
          ))}
          <div className="w-px h-5 bg-white/[0.1] mx-1" />
          {(["all", "critical", "warning", "info"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setSeverityFilter(sev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${severityFilter === sev ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"}`}
            >
              {sev}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Radar}
            title="No signals to review"
            description="As users message you, KROVA reads for bugs, feature requests, complaints, churn risk and praise - each one cited to the real conversation it came from."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const meta = KIND_META[s.kind];
              const Icon = meta.icon;
              return (
                <GlassCard key={s.id} className="p-5 flex items-start gap-4">
                  <div className={`p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0`}>
                    <Icon className="w-4 h-4 text-os-text-dim" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-sm font-bold text-white">{s.title}</span>
                      <Badge variant={meta.badge} size="sm">{meta.label}</Badge>
                      <Badge variant={SEVERITY_BADGE[s.severity]} size="sm">{s.severity}</Badge>
                    </div>
                    {s.body && <p className="text-xs text-white/80 mb-2">{s.body}</p>}
                    <p className="text-[10px] font-mono text-os-text-dim">
                      {customerName(s.customer_id)} · {new Date(s.created_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismiss(s.id)}
                    className="shrink-0 p-2 rounded-lg text-os-text-dim hover:text-seal-bright hover:bg-seal/10 transition-colors"
                    title="Dismiss"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
