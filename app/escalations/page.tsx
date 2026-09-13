"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Siren, Check, Clock, Zap, TrendingDown, MessageSquareWarning } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { escalations, ledger, signals as signalsApi, type EscalationRow, type CustomerSummary } from "@/lib/api";

const CATEGORY_LABEL: Record<string, string> = {
  billing: "Billing",
  booking: "Booking",
  complaint: "Complaint",
  technical: "Technical",
  urgent: "Urgent",
  other: "Other",
};

// Which of a customer's own open Signals is worth flagging right on their
// escalation card - real context a staff member handling this should see
// (churn_risk/complaint only; the other 13 kinds either aren't about this
// customer specifically or aren't relevant to "should I be extra careful
// here"), not every open signal they happen to have.
const FLAGGED_SIGNAL_KINDS: Record<string, { label: string; icon: typeof TrendingDown }> = {
  churn_risk: { label: "Churn risk", icon: TrendingDown },
  complaint: { label: "Prior complaint", icon: MessageSquareWarning },
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function EscalationsPage() {
  const [viewMode, setViewMode] = useState<"open" | "acknowledged">("open");
  const [rows, setRows] = useState<EscalationRow[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [openSignals, setOpenSignals] = useState<{ customer_id: string | null; kind: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed user"]));
    return (id: string | null) => (id ? map.get(id) || id.slice(0, 8) : "Unknown user");
  }, [customers]);

  // First matching open signal (churn_risk before complaint, if a
  // customer somehow has both open at once) per customer - a lookup, not
  // a new AI call, same "join against data that already exists" shape as
  // customerName above.
  const customerFlag = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of openSignals) {
      if (!s.customer_id || !FLAGGED_SIGNAL_KINDS[s.kind] || map.has(s.customer_id)) continue;
      map.set(s.customer_id, s.kind);
    }
    return (id: string | null) => (id ? map.get(id) : undefined);
  }, [openSignals]);

  const load = async (mode: "open" | "acknowledged") => {
    setIsLoading(true);
    const results = await Promise.allSettled([
      escalations.list(mode === "acknowledged"),
      ledger.customers(),
      signalsApi.list(),
    ]);
    const [rowsRes, customersRes, signalsRes] = results;
    if (rowsRes.status === "fulfilled") {
      setRows(rowsRes.value);
      setLoadError(null);
    } else {
      setLoadError(rowsRes.reason instanceof Error ? rowsRes.reason.message : "Could not load escalations.");
    }
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value);
    if (signalsRes.status === "fulfilled") setOpenSignals(signalsRes.value);
    setIsLoading(false);
  };

  useEffect(() => {
    load(viewMode);
  }, [viewMode]);

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await escalations.acknowledge(id);
      setRows((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not acknowledge.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Siren className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white">Escalations</h1>
              <p className="text-xs text-os-text-dim font-mono">
                Every time the agent couldn&apos;t handle something on its own. Unacknowledged for 15+ minutes alerts whoever&apos;s on staff.
              </p>
            </div>
          </div>
          <Link
            href="/automations?trigger=escalation.raised"
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-os-text-dim hover:text-white hover:bg-white/[0.06] border border-white/[0.08] transition-colors text-[11px] font-semibold"
            title="Build a rule for escalations like this"
          >
            <Zap className="w-3.5 h-3.5" />
            Create an automation
          </Link>
        </div>

        <div className="flex gap-1.5 p-1 rounded-lg bg-black/30 border border-white/[0.08] w-fit">
          {(["open", "acknowledged"] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setViewMode(mode)}
              className={`px-3 py-1.5 rounded-md text-[11px] font-semibold cursor-pointer transition-all ${
                viewMode === mode ? "bg-rose-500/20 text-rose-400" : "text-os-text-dim hover:text-white"
              }`}
            >
              {mode === "open" ? "Open" : "Acknowledged"}
            </button>
          ))}
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        )}

        {loadError && (
          <div className="p-4 rounded-xl bg-rose-500/[0.06] border border-rose-500/[0.2] text-rose-400 text-sm">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && rows.length === 0 && (
          <EmptyState
            icon={Check}
            title={viewMode === "open" ? "No open escalations" : "Nothing acknowledged yet"}
            description={
              viewMode === "open"
                ? "Every escalation the agent has raised has been acknowledged."
                : "Escalations you've acknowledged will show up here."
            }
          />
        )}

        <div className="space-y-3">
          {rows.map((e) => {
            const flagKind = customerFlag(e.customer_id);
            const Flag = flagKind ? FLAGGED_SIGNAL_KINDS[flagKind].icon : null;
            return (
            <GlassCard key={e.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="rose" dot>
                    {e.channel}
                  </Badge>
                  {e.category && (
                    <Badge variant="default">{CATEGORY_LABEL[e.category] || e.category}</Badge>
                  )}
                  <span className="text-[11px] text-white font-semibold">{customerName(e.customer_id)}</span>
                  {flagKind && Flag && (
                    <span
                      className="text-[10px] text-amber-400 font-mono flex items-center gap-1"
                      title={`This customer has an open ${FLAGGED_SIGNAL_KINDS[flagKind].label} signal`}
                    >
                      <Flag className="w-3 h-3" />
                      {FLAGGED_SIGNAL_KINDS[flagKind].label}
                    </span>
                  )}
                  <span className="text-[11px] text-os-text-dim font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(e.created_at)}
                  </span>
                  {e.escalated_further_at && (
                    <Badge variant="amber" dot>
                      Alerted
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-white">{e.reason}</p>
              </div>
              {viewMode === "open" && (
                <button
                  type="button"
                  onClick={() => handleAcknowledge(e.id)}
                  disabled={acknowledgingId === e.id}
                  className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  {acknowledgingId === e.id ? "…" : "Acknowledge"}
                </button>
              )}
            </GlassCard>
            );
          })}
        </div>
      </div>
    </AppLayout>
  );
}
