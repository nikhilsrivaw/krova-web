"use client";

import React, { useCallback, useEffect, useState } from "react";
import { History, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  postCallRules,
  type AutomationRunHistory,
  type AutomationRunLog,
  type AutomationRunStatus,
} from "@/lib/api";

/**
 * What a business's automations actually did.
 *
 * This is the panel the whole execution-history feature exists for. Before
 * it, a rule with no delayed step left no trace anywhere a business could
 * see, so a rule that never matched and a rule that was broken looked
 * exactly the same: nothing happened. Silence read as broken, and the
 * predictable next step was to stop trusting the feature.
 *
 * So the emphasis here is on the *reason*, not the event. "Skipped" with
 * "sentiment is 'angry' - actual value was 'neutral'" is the entire point;
 * a list of timestamps would not have fixed anything.
 */

const STATUS_LABEL: Record<AutomationRunStatus, string> = {
  ran: "Done",
  no_action: "Nothing to do",
  skipped: "Skipped",
  queued: "Waiting",
  failed: "Failed",
};

const STATUS_VARIANT: Record<AutomationRunStatus, "emerald" | "amber" | "rose" | "outline" | "cyan"> = {
  ran: "emerald",
  // Not a failure - the step ran and genuinely had nothing to do (no phone
  // number on the customer, say). Amber rather than red on purpose: it is
  // worth looking at, it is not broken.
  no_action: "amber",
  skipped: "outline",
  queued: "cyan",
  failed: "rose",
};

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function RunHistoryPanel({
  ruleId,
  triggerLabel,
  actionLabel,
  limit = 50,
}: {
  /** Omitted = every rule this business has. Set = just that one rule. */
  ruleId?: string;
  /** The page's own TRIGGER_LABEL / ACTION_LABEL maps, passed in rather
   * than duplicated here so there is one set of wording in the product. */
  triggerLabel: Record<string, string>;
  actionLabel: Record<string, string>;
  limit?: number;
}) {
  const [history, setHistory] = useState<AutomationRunHistory | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      setHistory(await postCallRules.runs({ rule_id: ruleId, limit }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load activity");
    } finally {
      setIsLoading(false);
    }
  }, [ruleId, limit]);

  useEffect(() => {
    void load();
  }, [load]);

  if (isLoading && !history) return <Skeleton className="h-24 w-full" />;

  if (error) {
    return (
      <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
        {error}
      </div>
    );
  }

  const runs = history?.runs ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-os-text-dim">
          <History className="w-3.5 h-3.5" />
          <span>
            {runs.length === 0
              ? "Nothing yet"
              : `${runs.length} step${runs.length === 1 ? "" : "s"}, newest first`}
          </span>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white border border-white/[0.08] transition-all cursor-pointer"
          aria-label="Refresh activity"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {runs.length === 0 ? (
        <EmptyState
          icon={History}
          title="No automation has run yet"
          description={
            // The distinction that matters: an empty list here means the
            // trigger genuinely has not fired, not that anything is
            // broken - and saying the retention window out loud stops
            // "aged out" being mistaken for "never ran".
            `Nothing has triggered one of your rules in the last ${
              history?.retention_days ?? 60
            } days. Once one fires, every step shows up here with what it did and why.`
          }
        />
      ) : (
        <div className="space-y-1.5">
          {runs.map((run) => (
            <RunRow key={run.id} run={run} triggerLabel={triggerLabel} actionLabel={actionLabel} showRule={!ruleId} />
          ))}
        </div>
      )}
    </div>
  );
}

function RunRow({
  run,
  triggerLabel,
  actionLabel,
  showRule,
}: {
  run: AutomationRunLog;
  triggerLabel: Record<string, string>;
  actionLabel: Record<string, string>;
  showRule: boolean;
}) {
  return (
    <div className="p-3 rounded-xl bg-black/20 border border-white/[0.06] space-y-1.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {showRule && (
            <p className="text-xs font-semibold text-white truncate">
              {/* An unnamed rule falls back to what it reacts to, which is
                  the only other thing the business would recognise it by. */}
              {run.rule_name || triggerLabel[run.trigger_type] || run.trigger_type}
            </p>
          )}
          <p className="text-[11px] text-os-text-dim truncate">
            Step {run.step_position + 1} · {actionLabel[run.action_type] || run.action_type}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant={STATUS_VARIANT[run.status]}>{STATUS_LABEL[run.status]}</Badge>
          <span className="text-[11px] text-os-text-dim">{relativeTime(run.occurred_at)}</span>
        </div>
      </div>
      {run.detail && (
        // Written as a sentence by the backend; shown verbatim rather than
        // re-worded here, so there is one place this wording lives.
        <p className="text-[11px] text-os-text-dim leading-relaxed">{run.detail}</p>
      )}
    </div>
  );
}
