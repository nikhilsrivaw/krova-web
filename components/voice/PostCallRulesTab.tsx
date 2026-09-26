"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, Plus, Pencil, Clock, Filter, ArrowUpRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { postCallRules, type AutomationRule } from "@/lib/api";

/**
 * The /voice page's view of the call-triggered automations.
 *
 * This used to be a second rule *editor* on the same API as /automations,
 * and that was a quiet source of data loss. It could only express a
 * single-step rule with no condition, no delay and no channel, while the
 * main builder writes rules with all three - so a rule built there and
 * touched here came back smaller than it went in, and its Delete button
 * removed a full multi-step rule with no indication of what was going.
 * It also listed *every* rule the business had, call-triggered or not,
 * labelled from a three-entry map, so anything else showed up as a raw
 * trigger string.
 *
 * So there is one builder now, on /automations, and this is a view onto
 * it: the call-triggered rules, what they actually do in full, and the
 * one destructive-free control worth having in context (pause/resume).
 * Editing and creating link straight into the real builder.
 */

// The three call outcomes that actually exist as triggers - see
// WebhookEventType's own comment on where each one fires from.
const VOICE_TRIGGERS = ["call.completed", "call.voicemail", "call.no_answer"] as const;
type VoiceTrigger = (typeof VOICE_TRIGGERS)[number];

const TRIGGER_LABEL: Record<VoiceTrigger, string> = {
  "call.completed": "a call finishes",
  "call.voicemail": "a call goes to voicemail",
  "call.no_answer": "a call goes unanswered",
};

// Full action vocabulary, not the two this tab used to know about - a
// call-triggered rule can do any of these, and showing a raw action_type
// for the other seven was the same bug in smaller form.
const ACTION_LABEL: Record<string, string> = {
  whatsapp_followup: "send a WhatsApp follow-up",
  create_escalation_task: "create a task for the team",
  add_tag: "tag the customer",
  send_flow: "send a WhatsApp Flow",
  place_call: "call the customer",
  send_sms: "send an SMS",
  send_email: "send an email",
  instagram_followup: "send an Instagram reply",
  instagram_comment_reply: "reply privately to a comment",
};

function formatDelay(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400} day${seconds / 86400 === 1 ? "" : "s"}`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour${seconds / 3600 === 1 ? "" : "s"}`;
  if (seconds % 60 === 0) return `${seconds / 60} minute${seconds / 60 === 1 ? "" : "s"}`;
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

export function PostCallRulesTab() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        setRules(await postCallRules.list());
        setLoadError(null);
      } catch (err) {
        setLoadError(err instanceof Error ? err.message : "Could not load rules.");
      } finally {
        setIsLoading(false);
      }
    };
    void load();
  }, []);

  const voiceRules = rules.filter((r) =>
    (VOICE_TRIGGERS as readonly string[]).includes(r.trigger_type),
  );

  const handleToggle = async (rule: AutomationRule) => {
    setBusyId(rule.id);
    try {
      // PATCH replaces the whole rule server-side rather than merging, so
      // the rule's own name, channel and steps go back unchanged -
      // pausing must never be a way to lose the rest of it.
      const updated = await postCallRules.update(rule.id, {
        name: rule.name ?? null,
        trigger_type: rule.trigger_type,
        is_active: !rule.is_active,
        channel: rule.channel ?? null,
        steps: rule.steps,
      });
      setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not update this rule.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Post-call Actions</h3>
              <p className="text-xs text-os-text-dim">
                When a call ends a certain way, do something about it automatically. Built and
                edited on Automations - shown here so you can see them in context.
              </p>
            </div>
          </div>
          <Link
            href="/automations?trigger=call.voicemail"
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" /> New rule
          </Link>
        </div>

        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : voiceRules.length === 0 ? (
          <EmptyState
            icon={Zap}
            title="No call rules yet"
            description="Set up an automatic follow-up for a voicemail, a missed call, or how any call ends."
          />
        ) : (
          <div className="space-y-2">
            {voiceRules.map((rule) => (
              <div key={rule.id} className="p-3.5 rounded-xl bg-black/20 border border-white/[0.06] space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {rule.name && <p className="text-xs font-semibold text-white">{rule.name}</p>}
                    <p className="text-xs text-white">
                      <span className="text-os-text-dim">When </span>
                      {TRIGGER_LABEL[rule.trigger_type as VoiceTrigger]}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={rule.is_active ? "emerald" : "amber"} dot>
                      {rule.is_active ? "Active" : "Paused"}
                    </Badge>
                    <Link
                      href={`/automations?edit=${rule.id}`}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white border border-white/[0.08] transition-all cursor-pointer"
                      aria-label="Edit on Automations"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Link>
                    <button
                      type="button"
                      onClick={() => void handleToggle(rule)}
                      disabled={busyId === rule.id}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-50 text-os-text-dim hover:text-white text-[11px] font-semibold border border-white/[0.08] transition-all cursor-pointer"
                    >
                      {rule.is_active ? "Pause" : "Resume"}
                    </button>
                  </div>
                </div>

                {/* Every step, in order - including the conditions and waits
                    this tab used to hide, which is what made editing here
                    lossy in the first place. */}
                <ol className="space-y-1">
                  {rule.steps.map((step, i) => (
                    <li key={i} className="text-[11px] text-os-text-dim flex flex-wrap items-center gap-x-2">
                      <span className="text-white/70">{i + 1}.</span>
                      {step.delay_seconds ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" /> wait {formatDelay(step.delay_seconds)}, then
                        </span>
                      ) : null}
                      <span>{ACTION_LABEL[step.action_type] ?? step.action_type}</span>
                      {step.conditions?.length ? (
                        <span className="inline-flex items-center gap-1 text-os-text-dim/80">
                          <Filter className="w-3 h-3" /> only if{" "}
                          {step.conditions
                            .map((c) => `${c.field} ${c.operator.replace(/_/g, " ")} "${String(c.value)}"`)
                            .join(" and ")}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/automations?tab=activity"
          className="inline-flex items-center gap-1.5 text-[11px] text-cyan-400 hover:text-cyan-300 transition-colors"
        >
          See what these rules actually did <ArrowUpRight className="w-3 h-3" />
        </Link>
      </GlassCard>
    </div>
  );
}
