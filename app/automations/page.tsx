"use client";

import React, { useEffect, useState } from "react";
import { Zap, Trash2, Plus } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  postCallRules,
  flows as flowsApi,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationAction,
  type WhatsAppFlow,
} from "@/lib/api";

/** Same check as app/flows/page.tsx and app/campaigns/page.tsx's own usesLiveData. */
function usesLiveData(flow: WhatsAppFlow): boolean {
  try {
    return JSON.stringify(flow.flow_json).includes('"data":');
  } catch {
    return false;
  }
}

const TRIGGER_LABEL: Record<AutomationTrigger, string> = {
  "message.received": "A customer sends a message",
  "flow.completed": "A customer completes a WhatsApp Flow",
  "appointment.booked": "An appointment is booked",
  "appointment.cancelled": "An appointment is cancelled",
  "escalation.raised": "The AI escalates to a human",
  "queue_token.issued": "A queue token is issued",
  "competitor.mentioned": "A competitor is mentioned",
  "call.completed": "A call finishes",
  "call.voicemail": "A call goes to voicemail",
  "call.no_answer": "A call goes unanswered",
};

const ACTION_LABEL: Record<AutomationAction, string> = {
  whatsapp_followup: "Send a WhatsApp follow-up",
  create_escalation_task: "Create a task for the team",
  add_tag: "Tag the customer",
  send_flow: "Send a WhatsApp Flow",
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [publishedFlows, setPublishedFlows] = useState<WhatsAppFlow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [trigger, setTrigger] = useState<AutomationTrigger>("message.received");
  const [action, setAction] = useState<AutomationAction>("whatsapp_followup");
  const [textConfig, setTextConfig] = useState(""); // message / reason / tag
  const [flowId, setFlowId] = useState("");
  const [flowBody, setFlowBody] = useState("Please fill this in:");
  const [flowCta, setFlowCta] = useState("Open");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [rulesRes, flowsRes] = await Promise.allSettled([postCallRules.list(), flowsApi.list()]);
    if (rulesRes.status === "fulfilled") {
      setRules(rulesRes.value);
      setLoadError(null);
    } else {
      setLoadError(rulesRes.reason instanceof Error ? rulesRes.reason.message : "Could not load automations.");
    }
    if (flowsRes.status === "fulfilled") {
      setPublishedFlows(flowsRes.value.filter((f) => f.status === "PUBLISHED"));
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const selectedFlow = publishedFlows.find((f) => f.id === flowId) || null;
  // Best-effort guess at the entry screen id, same as the /flows page's own send modal.
  const flowScreen = (() => {
    const screens = (selectedFlow?.flow_json as { screens?: { id?: string }[] } | undefined)?.screens;
    return screens?.[0]?.id || "";
  })();

  const resetForm = () => {
    setTrigger("message.received");
    setAction("whatsapp_followup");
    setTextConfig("");
    setFlowId("");
    setFlowBody("Please fill this in:");
    setFlowCta("Open");
    setSaveError(null);
  };

  const buildConfig = (): Record<string, string> | null => {
    if (action === "whatsapp_followup") {
      return textConfig.trim() ? { message: textConfig.trim() } : null;
    }
    if (action === "create_escalation_task") {
      return textConfig.trim() ? { reason: textConfig.trim() } : null;
    }
    if (action === "add_tag") {
      return textConfig.trim() ? { tag: textConfig.trim() } : null;
    }
    if (action === "send_flow") {
      if (!selectedFlow || !flowBody.trim() || !flowScreen) return null;
      return { flow_id: selectedFlow.id, body: flowBody.trim(), screen: flowScreen, cta: flowCta.trim() || "Open" };
    }
    return null;
  };

  const handleCreate = async () => {
    const config = buildConfig();
    if (!config) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await postCallRules.create({ trigger_type: trigger, action_type: action, action_config: config });
      setRules((prev) => [...prev, created]);
      resetForm();
      setIsCreating(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not create this automation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    const updated = await postCallRules.update(rule.id, {
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: !rule.is_active,
    });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  };

  const handleDelete = async (id: string) => {
    await postCallRules.remove(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
  };

  const ruleSummary = (rule: AutomationRule): string => {
    if (rule.action_type === "send_flow") {
      const flow = publishedFlows.find((f) => f.id === rule.action_config.flow_id);
      return `Flow: ${flow?.name || rule.action_config.flow_id}`;
    }
    return rule.action_config.message || rule.action_config.reason || rule.action_config.tag || "";
  };

  return (
    <AppLayout
      title="Automations"
      subtitle="When something real happens in a conversation, do something about it automatically - no canvas, real signals only."
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{loadError}</div>
        )}

        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Rules</h3>
                <p className="text-xs text-os-text-dim">
                  Pick a trigger and an action - runs automatically from the moment it happens.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (isCreating) resetForm();
                setIsCreating((v) => !v);
              }}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New rule
            </button>
          </div>

          {isCreating && (
            <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">When</label>
                  <select
                    value={trigger}
                    onChange={(e) => setTrigger(e.target.value as AutomationTrigger)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    {(Object.keys(TRIGGER_LABEL) as AutomationTrigger[]).map((t) => (
                      <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Then</label>
                  <select
                    value={action}
                    onChange={(e) => {
                      setAction(e.target.value as AutomationAction);
                      setTextConfig("");
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    {(Object.keys(ACTION_LABEL) as AutomationAction[]).map((a) => (
                      <option key={a} value={a}>{ACTION_LABEL[a]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {action === "whatsapp_followup" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Message to send</label>
                  <p className="text-[11px] text-os-text-dim mb-2">
                    Sent via your approved &quot;post_call_followup&quot; WhatsApp template.
                  </p>
                  <textarea
                    value={textConfig}
                    onChange={(e) => setTextConfig(e.target.value)}
                    rows={2}
                    placeholder="Thanks for reaching out - we'll get right back to you."
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
                  />
                  {trigger === "call.completed" && (
                    <p className="text-[11px] text-os-text-dim mt-1.5">
                      Use <code className="text-cyan-400">{"{{summary}}"}</code> to include what the AI captured about this call.
                    </p>
                  )}
                </div>
              )}

              {action === "create_escalation_task" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Task description</label>
                  <textarea
                    value={textConfig}
                    onChange={(e) => setTextConfig(e.target.value)}
                    rows={2}
                    placeholder="Follow up with this customer."
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
                  />
                </div>
              )}

              {action === "add_tag" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Tag</label>
                  <input
                    type="text"
                    value={textConfig}
                    onChange={(e) => setTextConfig(e.target.value)}
                    placeholder="e.g. interested, follow-up"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              )}

              {action === "send_flow" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Flow</label>
                    {publishedFlows.length === 0 ? (
                      <p className="text-[11px] text-amber-400">
                        No published flows yet - publish one from the Flows page first.
                      </p>
                    ) : (
                      <select
                        value={flowId}
                        onChange={(e) => setFlowId(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">Choose a flow...</option>
                        {publishedFlows.map((f) => (
                          <option key={f.id} value={f.id}>{f.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Message body</label>
                      <input
                        type="text"
                        value={flowBody}
                        onChange={(e) => setFlowBody(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Button text</label>
                      <input
                        type="text"
                        maxLength={20}
                        value={flowCta}
                        onChange={(e) => setFlowCta(e.target.value)}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <p className="text-[11px] text-os-text-dim">
                    Only sends inside the 24-hour reply window, same as sending a flow by hand - a rule can&apos;t
                    reach someone outside it either.
                  </p>
                  {selectedFlow && usesLiveData(selectedFlow) && (
                    <p className="text-[11px] text-amber-400">
                      This flow shows live data - make sure &quot;Enable live data&quot; is on for it (Flows page),
                      or it won&apos;t work when this rule fires.
                    </p>
                  )}
                </div>
              )}

              {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSaving || !buildConfig()}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
                >
                  {isSaving ? "Saving…" : "Save rule"}
                </button>
                <button
                  type="button"
                  onClick={() => { resetForm(); setIsCreating(false); }}
                  className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : rules.length === 0 && !isCreating ? (
            <EmptyState
              icon={Zap}
              title="No automations yet"
              description="Set up a rule for a message arriving, a Flow completing, an appointment booked, and more."
            />
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="p-3.5 rounded-xl bg-black/20 border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-xs text-white">
                      <span className="text-os-text-dim">When </span>
                      {(TRIGGER_LABEL[rule.trigger_type] ?? rule.trigger_type).toLowerCase()}
                      <span className="text-os-text-dim">, </span>
                      {(ACTION_LABEL[rule.action_type] ?? rule.action_type).toLowerCase()}
                    </p>
                    <p className="text-[11px] text-os-text-dim mt-0.5 truncate">{ruleSummary(rule)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={rule.is_active ? "emerald" : "amber"} dot>
                      {rule.is_active ? "Active" : "Paused"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleToggle(rule)}
                      className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white text-[11px] font-semibold border border-white/[0.08] transition-all cursor-pointer"
                    >
                      {rule.is_active ? "Pause" : "Resume"}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(rule.id)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-os-text-dim hover:text-red-400 border border-white/[0.08] transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}
