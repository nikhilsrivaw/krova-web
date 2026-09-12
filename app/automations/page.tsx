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
  CONDITION_FIELDS,
  type AutomationRule,
  type AutomationTrigger,
  type AutomationAction,
  type AutomationChannel,
  type AutomationCondition,
  type AutomationOperator,
  type WhatsAppFlow,
} from "@/lib/api";

const CHANNEL_LABEL: Record<AutomationChannel, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  email: "Email",
  voice: "Voice",
  web: "Website chat",
};

// Triggers that can only ever fire from one specific channel - a picker
// there would be redundant (call.* is always voice, flow.completed is
// always whatsapp, since WhatsApp Flows don't exist on any other
// channel). Every other trigger genuinely can come from more than one
// channel (message.received fires identically for WhatsApp, Instagram,
// email, and every utterance of a live voice call), which is exactly
// what makes the picker necessary there.
const CHANNEL_AMBIGUOUS_TRIGGERS = new Set<AutomationTrigger>([
  "message.received",
  "appointment.booked",
  "appointment.cancelled",
  "escalation.raised",
  "queue_token.issued",
  "competitor.mentioned",
]);

/** Same check as components/whatsapp/FlowsPanel.tsx and app/campaigns/page.tsx's own usesLiveData. */
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
  "churn_risk.detected": "A customer signals they might churn",
  "demo.requested": "A customer asks for a demo",
  "pricing_question.asked": "A customer asks about pricing",
};

const ACTION_LABEL: Record<AutomationAction, string> = {
  whatsapp_followup: "Send a WhatsApp follow-up",
  create_escalation_task: "Create a task for the team",
  add_tag: "Tag the customer",
  send_flow: "Send a WhatsApp Flow",
  place_call: "Call the customer",
  send_sms: "Send an SMS",
  send_email: "Send an email",
};

// Human labels for the real, per-trigger_type condition fields
// (CONDITION_FIELDS, lib/api.ts - mirrors shared/care/post_call_actions.py's
// own allowlist). Only fields actually reachable from some trigger appear.
const FIELD_LABEL: Record<string, string> = {
  duration_seconds: "Call duration (seconds)",
  outcome: "Call outcome",
  sentiment: "Call sentiment",
  escalated: "Call was escalated",
  topic: "Call topic",
  campaign_objective: "Campaign objective",
  text: "Message text",
  flow_id: "Flow",
  starts_at: "Appointment time",
  intake_channel: "Booking channel",
  reason: "Reason",
  shift: "Shift",
  queue_number: "Queue number",
  severity: "Severity",
  title: "Signal title",
  body: "Signal detail",
};

// How to render/parse each field's value - most conditions compare plain
// text (contains/equals a string), a few are genuinely numeric or boolean.
const FIELD_TYPE: Record<string, "text" | "number" | "boolean"> = {
  duration_seconds: "number",
  queue_number: "number",
  escalated: "boolean",
};

const OPERATOR_LABEL: Record<AutomationOperator, string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  greater_than: "is greater than",
  less_than: "is less than",
  greater_than_or_equal: "is at least",
  less_than_or_equal: "is at most",
};

const TEXT_OPERATORS: AutomationOperator[] = ["equals", "not_equals", "contains"];
const NUMBER_OPERATORS: AutomationOperator[] = [
  "equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal",
];
const BOOLEAN_OPERATORS: AutomationOperator[] = ["equals"];

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [publishedFlows, setPublishedFlows] = useState<WhatsAppFlow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [trigger, setTrigger] = useState<AutomationTrigger>("message.received");
  const [action, setAction] = useState<AutomationAction>("whatsapp_followup");
  // "" = any channel (the default, unfiltered) - a real dropdown value,
  // not left implicit, since leaving it invisible is exactly what let a
  // WhatsApp-authored rule fire on every utterance of a live voice call.
  const [channel, setChannel] = useState<AutomationChannel | "">("");
  const [conditionEnabled, setConditionEnabled] = useState(false);
  const [conditionField, setConditionField] = useState("");
  const [conditionOperator, setConditionOperator] = useState<AutomationOperator>("equals");
  const [conditionValue, setConditionValue] = useState("");
  const [textConfig, setTextConfig] = useState(""); // message / reason / tag / sms message / call reason / email body
  const [emailSubject, setEmailSubject] = useState(""); // send_email only - the one action needing two fields
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
  // Best-effort guess at the entry screen id, same as FlowsPanel's own send modal.
  const flowScreen = (() => {
    const screens = (selectedFlow?.flow_json as { screens?: { id?: string }[] } | undefined)?.screens;
    return screens?.[0]?.id || "";
  })();

  const resetForm = () => {
    setTrigger("message.received");
    setAction("whatsapp_followup");
    setChannel("");
    setConditionEnabled(false);
    setConditionField("");
    setConditionOperator("equals");
    setConditionValue("");
    setTextConfig("");
    setEmailSubject("");
    setFlowId("");
    setFlowBody("Please fill this in:");
    setFlowCta("Open");
    setSaveError(null);
  };

  const availableFields = CONDITION_FIELDS[trigger] ?? [];
  const conditionFieldType = FIELD_TYPE[conditionField] ?? "text";
  const conditionOperators =
    conditionFieldType === "number" ? NUMBER_OPERATORS : conditionFieldType === "boolean" ? BOOLEAN_OPERATORS : TEXT_OPERATORS;

  const buildCondition = (): AutomationCondition | null | undefined => {
    // undefined = invalid state (enabled but incomplete) -> block save,
    // same contract as buildConfig() returning null.
    if (!conditionEnabled) return null;
    if (!conditionField || !conditionValue.trim()) return undefined;
    if (conditionFieldType === "number") {
      const n = Number(conditionValue);
      if (Number.isNaN(n)) return undefined;
      return { field: conditionField, operator: conditionOperator, value: n };
    }
    if (conditionFieldType === "boolean") {
      return { field: conditionField, operator: conditionOperator, value: conditionValue === "true" };
    }
    return { field: conditionField, operator: conditionOperator, value: conditionValue.trim() };
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
    if (action === "place_call") {
      return textConfig.trim() ? { reason: textConfig.trim() } : null;
    }
    if (action === "send_sms") {
      return textConfig.trim() ? { message: textConfig.trim() } : null;
    }
    if (action === "send_email") {
      return emailSubject.trim() && textConfig.trim()
        ? { subject: emailSubject.trim(), body: textConfig.trim() }
        : null;
    }
    return null;
  };

  const handleCreate = async () => {
    const config = buildConfig();
    const condition = buildCondition();
    if (!config || condition === undefined) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await postCallRules.create({
        trigger_type: trigger, action_type: action, action_config: config,
        channel: channel || null, condition,
      });
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
    // PATCH replaces the whole rule server-side, not a partial merge - omitting
    // channel or condition here would silently reset either back to "any"/none
    // every time a rule is toggled on/off.
    const updated = await postCallRules.update(rule.id, {
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      action_config: rule.action_config,
      is_active: !rule.is_active,
      channel: rule.channel ?? null,
      condition: rule.condition ?? null,
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
    if (rule.action_type === "send_email") {
      return rule.action_config.subject || "";
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
                    onChange={(e) => {
                      const next = e.target.value as AutomationTrigger;
                      setTrigger(next);
                      // A channel chosen for an ambiguous trigger is meaningless
                      // once switched to one that's only ever one channel anyway
                      // (the picker disappears too) - don't silently carry it over.
                      if (!CHANNEL_AMBIGUOUS_TRIGGERS.has(next)) setChannel("");
                      // A condition field belongs to the OLD trigger's own
                      // allowlist (CONDITION_FIELDS) - carrying it over to a
                      // different trigger could silently point at a field
                      // that trigger never even provides.
                      setConditionField("");
                      setConditionValue("");
                    }}
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
                      setEmailSubject("");
                    }}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    {(Object.keys(ACTION_LABEL) as AutomationAction[]).map((a) => (
                      <option key={a} value={a}>{ACTION_LABEL[a]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {CHANNEL_AMBIGUOUS_TRIGGERS.has(trigger) && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">From channel</label>
                  <p className="text-[11px] text-os-text-dim mb-2">
                    This can happen on more than one channel - choose one, or leave it as any so the rule fires everywhere.
                  </p>
                  <select
                    value={channel}
                    onChange={(e) => setChannel(e.target.value as AutomationChannel | "")}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="">Any channel</option>
                    {(Object.keys(CHANNEL_LABEL) as AutomationChannel[]).map((c) => (
                      <option key={c} value={c}>{CHANNEL_LABEL[c]}</option>
                    ))}
                  </select>
                </div>
              )}

              {availableFields.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={conditionEnabled}
                      onChange={(e) => {
                        setConditionEnabled(e.target.checked);
                        if (!e.target.checked) { setConditionField(""); setConditionValue(""); }
                      }}
                      className="cursor-pointer"
                    />
                    Only when...
                  </label>
                  {conditionEnabled && (
                    <div className="grid grid-cols-3 gap-2">
                      <select
                        value={conditionField}
                        onChange={(e) => {
                          setConditionField(e.target.value);
                          setConditionOperator("equals");
                          setConditionValue("");
                        }}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="">Choose a field...</option>
                        {availableFields.map((f) => (
                          <option key={f} value={f}>{FIELD_LABEL[f] ?? f}</option>
                        ))}
                      </select>
                      <select
                        value={conditionOperator}
                        onChange={(e) => setConditionOperator(e.target.value as AutomationOperator)}
                        disabled={!conditionField}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                      >
                        {conditionOperators.map((op) => (
                          <option key={op} value={op}>{OPERATOR_LABEL[op]}</option>
                        ))}
                      </select>
                      {conditionFieldType === "boolean" ? (
                        <select
                          value={conditionValue}
                          onChange={(e) => setConditionValue(e.target.value)}
                          disabled={!conditionField}
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                        >
                          <option value="">Choose...</option>
                          <option value="true">Yes</option>
                          <option value="false">No</option>
                        </select>
                      ) : (
                        <input
                          type={conditionFieldType === "number" ? "number" : "text"}
                          value={conditionValue}
                          onChange={(e) => setConditionValue(e.target.value)}
                          disabled={!conditionField}
                          placeholder="value"
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none disabled:opacity-40"
                        />
                      )}
                    </div>
                  )}
                </div>
              )}

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

              {action === "place_call" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Reason for the call</label>
                  <p className="text-[11px] text-os-text-dim mb-2">
                    A brief, not a script - the AI drafts the actual opening line from this once the call connects.
                  </p>
                  <textarea
                    value={textConfig}
                    onChange={(e) => setTextConfig(e.target.value)}
                    rows={2}
                    placeholder="Remind them about their outstanding balance and offer to help them pay."
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
                  />
                  <p className="text-[11px] text-os-text-dim mt-1.5">
                    Only works once a voice number is connected (Voice Agent page) - a rule can&apos;t place a call
                    for a business with no number.
                  </p>
                </div>
              )}

              {action === "send_sms" && (
                <div>
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Message to send</label>
                  <textarea
                    value={textConfig}
                    onChange={(e) => setTextConfig(e.target.value)}
                    rows={2}
                    placeholder="Just checking in - let us know if you need anything."
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
                  />
                  <p className="text-[11px] text-os-text-dim mt-1.5">
                    Sent from your connected voice number (Voice Agent page) - needs one connected.
                  </p>
                </div>
              )}

              {action === "send_email" && (
                <div className="space-y-2.5">
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="Following up on your visit"
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">Body</label>
                    <textarea
                      value={textConfig}
                      onChange={(e) => setTextConfig(e.target.value)}
                      rows={3}
                      placeholder="Thanks for reaching out - we'll get right back to you."
                      className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
                    />
                  </div>
                  <p className="text-[11px] text-os-text-dim">
                    Needs a verified sending email connected (Settings page) and the customer&apos;s own email on file -
                    a rule can&apos;t reach someone with no email address recorded.
                  </p>
                </div>
              )}

              {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isSaving || !buildConfig() || buildCondition() === undefined}
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
                    {rule.condition && (
                      <p className="text-[11px] text-cyan-400/80 mt-0.5 truncate">
                        Only when {FIELD_LABEL[rule.condition.field] ?? rule.condition.field}{" "}
                        {OPERATOR_LABEL[rule.condition.operator] ?? rule.condition.operator}{" "}
                        &quot;{String(rule.condition.value)}&quot;
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="default">
                      {rule.channel ? CHANNEL_LABEL[rule.channel] : "Any channel"}
                    </Badge>
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
