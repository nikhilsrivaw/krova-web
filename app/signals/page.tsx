"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Radar, Bug, Sparkles, MessageSquareWarning, TrendingDown, Heart, Check, Activity, Clock, FileWarning, ReceiptIndianRupee, TriangleAlert, Github, Video, Tag, Swords, PhoneOff, PhoneMissed, Zap, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { signals as signalsApi, ledger, account, type Signal, type SignalKind, type SignalSeverity, type CustomerSummary, type AutomationTrigger, type Capability } from "@/lib/api";

const KIND_META: Record<SignalKind, { label: string; icon: typeof Bug; badge: "rose" | "indigo" | "amber" | "purple" | "emerald" }> = {
  bug: { label: "Bug", icon: Bug, badge: "rose" },
  feature_request: { label: "Feature Request", icon: Sparkles, badge: "indigo" },
  complaint: { label: "Complaint", icon: MessageSquareWarning, badge: "amber" },
  churn_risk: { label: "Churn Risk", icon: TrendingDown, badge: "rose" },
  praise: { label: "Praise", icon: Heart, badge: "emerald" },
  account_health: { label: "Account Health", icon: Activity, badge: "purple" },
  overdue_followup: { label: "Overdue Follow-up", icon: Clock, badge: "amber" },
  report_not_collected: { label: "Not Yet Collected", icon: FileWarning, badge: "amber" },
  callback_overdue: { label: "Callback Overdue", icon: PhoneMissed, badge: "amber" },
  intent_leakage: { label: "Intent Leakage", icon: Radar, badge: "indigo" },
  overdue_refund: { label: "Refund/Replacement Owed", icon: ReceiptIndianRupee, badge: "amber" },
  rto_risk: { label: "Delivery Risk", icon: TriangleAlert, badge: "rose" },
  demo_request: { label: "Demo Request", icon: Video, badge: "indigo" },
  pricing_question: { label: "Pricing Question", icon: Tag, badge: "purple" },
  competitor_mention: { label: "Competitor Mentioned", icon: Swords, badge: "rose" },
  escalation_rate: { label: "Escalation Rate", icon: PhoneOff, badge: "rose" },
  claim_status_changed: { label: "Claim Status Changed", icon: ShieldCheck, badge: "indigo" },
};

// Which kinds a business can even see, so the top grid and filter row show
// only what's actually possible for them rather than every kind every
// business could ever get - the page was showing 16 cards (now 17, with
// callback_overdue added above - a real gap, the backend has emitted this
// kind since shared/ai/recall_insights.py shipped but the frontend had no
// entry for it, which would have thrown on render the first time one
// appeared) regardless of vertical, most reading "0" forever for a given
// business and burying the handful that actually matter.
//
// Three tiers, grounded in each kind's real backend gate (confirmed by
// reading each generator, not guessed):
// - universal: every business gets these regardless of capability -
//   complaint/churn_risk/praise/competitor_mention (shared/ai/signals.py's
//   conversation mode, which every business is in), account_health
//   (shared/channels/whatsapp/health_monitor.py fires for any connected
//   number), escalation_rate (shared/care/escalation_alerts.py, business-
//   level for everyone).
// - capability-gated: bug/feature_request/demo_request/pricing_question
//   need product_feedback (shared/ai/signals.py's product mode);
//   intent_leakage/rto_risk need order_sync (shared/care/
//   intent_leakage.py's own docstring: "D2C risk sweeps - order_sync
//   capability"); claim_status_changed needs tpa_claim_tracking
//   (services/api/routers/insurance_claims.py).
// - no single capability flag covers these (shared/ai/recall_insights.py
//   generates them off each vertical's own watch_for template config, not
//   a Capability): overdue_followup/report_not_collected/callback_overdue/
//   overdue_refund. Shown only once this business actually has one -
//   data-driven rather than guessed from the template.
const UNIVERSAL_KINDS: SignalKind[] = [
  "complaint", "churn_risk", "praise", "competitor_mention", "account_health", "escalation_rate",
];
const CAPABILITY_GATED: Partial<Record<SignalKind, Capability>> = {
  bug: "product_feedback",
  feature_request: "product_feedback",
  demo_request: "product_feedback",
  pricing_question: "product_feedback",
  intent_leakage: "order_sync",
  rto_risk: "order_sync",
  claim_status_changed: "tpa_claim_tracking",
};

const SEVERITY_BADGE: Record<SignalSeverity, "rose" | "amber" | "default"> = {
  critical: "rose",
  warning: "amber",
  info: "default",
};

// Only the kinds that can actually drive an Automations rule get a
// mapping - account_health/escalation_rate are business-level (no
// customer_id ever), so shared/care/signal_dispatch.py never sends them
// to apply_rules; deliberately absent here so the button below simply
// never renders for those two cards, correctly reflecting that they can't
// have a rule (they're still real, still shown, just webhook-only - see
// Settings' outbound-webhook picker instead).
const SIGNAL_KIND_TO_TRIGGER: Partial<Record<SignalKind, AutomationTrigger>> = {
  bug: "bug.detected",
  feature_request: "feature_request.detected",
  complaint: "complaint.detected",
  churn_risk: "churn_risk.detected",
  praise: "praise.detected",
  overdue_followup: "overdue_followup.detected",
  report_not_collected: "report_not_collected.detected",
  callback_overdue: "callback_overdue.detected",
  intent_leakage: "intent_leakage.detected",
  overdue_refund: "overdue_refund.detected",
  rto_risk: "rto_risk.detected",
  demo_request: "demo.requested",
  pricing_question: "pricing_question.asked",
  competitor_mention: "competitor.mentioned",
  claim_status_changed: "claim.status_changed",
};

export default function SignalsPage() {
  const [allSignals, setAllSignals] = useState<Signal[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [kindFilter, setKindFilter] = useState<SignalKind | "all">("all");
  const [severityFilter, setSeverityFilter] = useState<SignalSeverity | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [filingId, setFilingId] = useState<string | null>(null);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed user"]));
    return (id: string | null) => (id ? map.get(id) || id.slice(0, 8) : "Unknown user");
  }, [customers]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const results = await Promise.allSettled([signalsApi.list(), ledger.customers(), account.profile()]);
    const [signalsRes, customersRes, profileRes] = results;
    if (signalsRes.status === "fulfilled") setAllSignals(signalsRes.value);
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value);
    if (profileRes.status === "fulfilled") setCapabilities(profileRes.value.capabilities || []);

    // Only the first two matter for the page's own error banner - a failed
    // capabilities fetch just means the kind grid falls back to "show
    // everything with a signal" below, not a broken page.
    const failed = [signalsRes, customersRes].find((r) => r.status === "rejected");
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

  // See UNIVERSAL_KINDS/CAPABILITY_GATED's own comment above for how each
  // tier is grounded. counts is computed below this, so the data-driven
  // tier is folded in right where it's used (visibleKinds), not here.

  const handleDismiss = async (id: string) => {
    setActionError(null);
    try {
      await signalsApi.dismiss(id);
      setAllSignals((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not dismiss this signal.");
    }
  };

  const handleFileGithubIssue = async (id: string) => {
    setActionError(null);
    setFilingId(id);
    try {
      await signalsApi.fileGithubIssue(id);
      // Filing dismisses the signal server-side too - a linked Commitment
      // now tracks it through to close, see the Commitment Ledger.
      setAllSignals((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not file this as a GitHub issue - check your GitHub connection in Settings.");
    } finally {
      setFilingId(null);
    }
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const s of allSignals) c[s.kind] = (c[s.kind] || 0) + 1;
    return c;
  }, [allSignals]);

  // What actually gets a card/filter button - universal kinds always,
  // capability-gated kinds only once this business has that capability,
  // and everything else (the vertical-watch_for-driven kinds with no
  // single capability flag) only once it has actually produced a signal.
  // This is what keeps the page from showing 17 cards to every business
  // when most verticals can only ever get 7-9 of them.
  const visibleKinds = useMemo(() => {
    return (Object.keys(KIND_META) as SignalKind[]).filter((kind) => {
      if (UNIVERSAL_KINDS.includes(kind)) return true;
      const needsCapability = CAPABILITY_GATED[kind];
      if (needsCapability) return capabilities.includes(needsCapability);
      return (counts[kind] || 0) > 0;
    });
  }, [capabilities, counts]);

  return (
    <AppLayout
      title="Signals"
      subtitle="What's worth knowing right now - product feedback signals, or overdue follow-ups and uncollected reports, depending on your business."
    >
      <div className="workspace-signals space-y-6">
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

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {visibleKinds.map((kind) => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            return (
              <GlassCard key={kind} className="p-4">
                <div className="flex min-w-0 items-start gap-2 mb-1.5">
                  <Icon className="w-3.5 h-3.5 shrink-0 text-os-text-dim" />
                  <span className="min-w-0 break-words text-[10px] text-os-text-dim">{meta.label}</span>
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
          {visibleKinds.map((kind) => (
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
            description="KROVA surfaces what's worth knowing without you having to dig for it - bugs, feature requests, complaints, churn risk and praise from conversations, or overdue follow-ups and uncollected reports from your commitment ledger."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((s) => {
              const meta = KIND_META[s.kind];
              const Icon = meta.icon;
              return (
                <GlassCard key={s.id} className="p-5 flex flex-wrap items-start gap-4">
                  <div className={`p-2 rounded-lg bg-white/[0.04] border border-white/[0.06] shrink-0`}>
                    <Icon className="w-4 h-4 text-os-text-dim" />
                  </div>
                  <div className="min-w-0 flex-1 basis-40">
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
                  <div className="workspace-actions w-full sm:ml-auto sm:w-auto">
                  {s.kind === "bug" && (
                    <button
                      type="button"
                      onClick={() => handleFileGithubIssue(s.id)}
                      disabled={filingId === s.id}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-os-text-dim hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                      title="File as GitHub issue"
                    >
                      <Github className="w-3.5 h-3.5" />
                      {filingId === s.id ? "Filing..." : "File issue"}
                    </button>
                  )}
                  {SIGNAL_KIND_TO_TRIGGER[s.kind] && (
                    <Link
                      href={`/automations?trigger=${SIGNAL_KIND_TO_TRIGGER[s.kind]}`}
                      className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-os-text-dim hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors text-[11px] font-semibold"
                      title="Build a rule for signals like this"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      Create an automation
                    </Link>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDismiss(s.id)}
                    className="shrink-0 p-2 rounded-lg text-os-text-dim hover:text-seal-bright hover:bg-seal/10 transition-colors"
                    title="Dismiss"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  </div>
                </GlassCard>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
