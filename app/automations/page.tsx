"use client";

import React, { useEffect, useState } from "react";
import {
  Zap, Trash2, Plus, Pencil, Check, X, ChevronUp, ChevronDown,
  MessageSquare, AlertTriangle, Tag, Workflow, Phone, MessageCircle, Mail,
  Filter, Clock,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  postCallRules,
  flows as flowsApi,
  CONDITION_FIELDS,
  type AutomationRule,
  type AutomationStepConfig,
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

const ACTION_ICON: Record<AutomationAction, LucideIcon> = {
  whatsapp_followup: MessageSquare,
  create_escalation_task: AlertTriangle,
  add_tag: Tag,
  send_flow: Workflow,
  place_call: Phone,
  send_sms: MessageCircle,
  send_email: Mail,
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

// Best-effort human phrasing of a step's stored delay_seconds - picks the
// coarsest unit that divides evenly, otherwise falls back to seconds so a
// value entered oddly (e.g. via the API directly) still displays honestly.
function formatDelay(seconds: number): string {
  if (seconds % 86400 === 0) return `${seconds / 86400} day${seconds / 86400 === 1 ? "" : "s"}`;
  if (seconds % 3600 === 0) return `${seconds / 3600} hour${seconds / 3600 === 1 ? "" : "s"}`;
  if (seconds % 60 === 0) return `${seconds / 60} minute${seconds / 60 === 1 ? "" : "s"}`;
  return `${seconds} second${seconds === 1 ? "" : "s"}`;
}

const TEXT_OPERATORS: AutomationOperator[] = ["equals", "not_equals", "contains"];
const NUMBER_OPERATORS: AutomationOperator[] = [
  "equals", "not_equals", "greater_than", "less_than", "greater_than_or_equal", "less_than_or_equal",
];
const BOOLEAN_OPERATORS: AutomationOperator[] = ["equals"];

const DELAY_UNIT_SECONDS: Record<"minutes" | "hours" | "days", number> = {
  minutes: 60, hours: 3600, days: 86400,
};

const stepSummary = (step: AutomationStepConfig, publishedFlows: WhatsAppFlow[]): string => {
  if (step.action_type === "send_flow") {
    const flow = publishedFlows.find((f) => f.id === step.action_config.flow_id);
    return `Flow: ${flow?.name || step.action_config.flow_id}`;
  }
  if (step.action_type === "send_email") {
    return step.action_config.subject || "";
  }
  return step.action_config.message || step.action_config.reason || step.action_config.tag || "";
};

export default function AutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [publishedFlows, setPublishedFlows] = useState<WhatsAppFlow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // The builder: used both for "New rule" (editingRuleId null) and
  // "Edit" on an existing one (editingRuleId set) - same card-stack UI
  // either way, only what Save does at the end differs.
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [trigger, setTrigger] = useState<AutomationTrigger>("message.received");
  const [channel, setChannel] = useState<AutomationChannel | "">("");
  // Steps already committed into the stack (position order) - each is a
  // complete, valid AutomationStepConfig. The one being actively edited
  // lives in the draft fields below instead, keyed by `openIndex`.
  const [steps, setSteps] = useState<AutomationStepConfig[]>([]);
  // Which position on the flow is expanded for editing - an index into
  // `steps`. null = every node collapsed, nothing being edited. Two
  // meanings depending on `isNewStep`: editing the existing step at that
  // index (isNewStep false), or composing a brand new step to be
  // inserted AT that index - any gap in the chain, not only the end
  // (isNewStep true) - matching the "+" sits on the connecting line
  // itself" pattern Zapier/n8n/Make all use for inserting mid-chain.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [isNewStep, setIsNewStep] = useState(false);

  // The currently-open card's own fields.
  const [action, setAction] = useState<AutomationAction>("whatsapp_followup");
  const [conditionEnabled, setConditionEnabled] = useState(false);
  const [conditionField, setConditionField] = useState("");
  const [conditionOperator, setConditionOperator] = useState<AutomationOperator>("equals");
  const [conditionValue, setConditionValue] = useState("");
  const [delayEnabled, setDelayEnabled] = useState(false);
  const [delayValue, setDelayValue] = useState("5");
  const [delayUnit, setDelayUnit] = useState<"minutes" | "hours" | "days">("minutes");
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

  // Loads a step's saved fields into the draft inputs for editing, or
  // resets to blank defaults for composing a brand new step.
  const loadDraft = (step: AutomationStepConfig | undefined) => {
    const config = step?.action_config ?? {};
    setAction(step?.action_type ?? "whatsapp_followup");
    setTextConfig(config.message || config.reason || config.tag || config.body || "");
    setEmailSubject(config.subject || "");
    setFlowId(step?.action_type === "send_flow" ? config.flow_id || "" : "");
    setFlowBody(step?.action_type === "send_flow" ? config.body || "Please fill this in:" : "Please fill this in:");
    setFlowCta(step?.action_type === "send_flow" ? config.cta || "Open" : "Open");
    setConditionEnabled(!!step?.condition);
    setConditionField(step?.condition?.field ?? "");
    setConditionOperator(step?.condition?.operator ?? "equals");
    setConditionValue(step?.condition ? String(step.condition.value) : "");
    setDelayEnabled(!!step?.delay_seconds);
    if (step?.delay_seconds) {
      // Coarsest unit that divides evenly, matching formatDelay's own logic.
      const s = step.delay_seconds;
      if (s % 86400 === 0) { setDelayValue(String(s / 86400)); setDelayUnit("days"); }
      else if (s % 3600 === 0) { setDelayValue(String(s / 3600)); setDelayUnit("hours"); }
      else { setDelayValue(String(Math.max(1, Math.round(s / 60)))); setDelayUnit("minutes"); }
    } else {
      setDelayValue("5");
      setDelayUnit("minutes");
    }
  };

  const closeBuilder = () => {
    setBuilderOpen(false);
    setEditingRuleId(null);
    setTrigger("message.received");
    setChannel("");
    setSteps([]);
    setOpenIndex(null);
    setIsNewStep(false);
    loadDraft(undefined);
    setSaveError(null);
  };

  const openForCreate = () => {
    closeBuilder();
    setBuilderOpen(true);
  };

  const openForEdit = (rule: AutomationRule) => {
    setEditingRuleId(rule.id);
    setTrigger(rule.trigger_type);
    setChannel(rule.channel ?? "");
    setSteps(rule.steps);
    setOpenIndex(null);
    setIsNewStep(false);
    loadDraft(undefined);
    setSaveError(null);
    setBuilderOpen(true);
  };

  const availableFields = CONDITION_FIELDS[trigger] ?? [];
  const conditionFieldType = FIELD_TYPE[conditionField] ?? "text";
  const conditionOperators =
    conditionFieldType === "number" ? NUMBER_OPERATORS : conditionFieldType === "boolean" ? BOOLEAN_OPERATORS : TEXT_OPERATORS;

  const buildDelaySeconds = (): number | null | undefined => {
    // undefined = invalid state (enabled but incomplete/non-positive) ->
    // block save, same contract as buildConfig()/buildCondition().
    if (!delayEnabled) return null;
    const n = Number(delayValue);
    if (!Number.isFinite(n) || n <= 0) return undefined;
    return Math.round(n * DELAY_UNIT_SECONDS[delayUnit]);
  };

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

  // Combines the current card's fields into one step object. null = this
  // card is empty (no action config filled) - not an error on its own,
  // but a card must be complete to close via "Done". undefined = actively
  // invalid (a condition or delay was started but left incomplete).
  const buildStep = (): AutomationStepConfig | null | undefined => {
    const condition = buildCondition();
    const delaySeconds = buildDelaySeconds();
    if (condition === undefined || delaySeconds === undefined) return undefined;
    const config = buildConfig();
    if (!config) return null;
    return { action_type: action, action_config: config, condition, delay_seconds: delaySeconds };
  };

  // Opens a blank card to compose a brand new step, inserted at `at`
  // (0..steps.length) once "Done" is clicked - any gap in the chain, not
  // only the end, mirroring the "+ sits on the connecting line" pattern
  // every real linear/flow builder (Zapier, n8n, Make) uses for this.
  const handleInsertAt = (at: number) => {
    if (openIndex !== null) return; // one card open at a time
    setOpenIndex(at);
    setIsNewStep(true);
    loadDraft(undefined);
  };

  const handleOpenStep = (i: number) => {
    if (openIndex !== null) return;
    setOpenIndex(i);
    setIsNewStep(false);
    loadDraft(steps[i]);
  };

  const handleDoneStep = () => {
    const built = buildStep();
    if (!built || openIndex === null) return;
    setSteps((prev) => {
      if (isNewStep) {
        const next = [...prev];
        next.splice(openIndex, 0, built);
        return next;
      }
      return prev.map((s, i) => (i === openIndex ? built : s));
    });
    setOpenIndex(null);
    setIsNewStep(false);
    loadDraft(undefined);
  };

  const handleCancelStepEdit = () => {
    setOpenIndex(null);
    setIsNewStep(false);
    loadDraft(undefined);
  };

  const removeStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
    if (openIndex === index) { setOpenIndex(null); setIsNewStep(false); loadDraft(undefined); }
    else if (openIndex !== null && openIndex > index) setOpenIndex(openIndex - 1);
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    setSteps((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const handleSave = async () => {
    if (steps.length === 0 || openIndex !== null) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      if (editingRuleId) {
        // Preserve the rule's own active/paused state - this save is about
        // its trigger/channel/steps, not a silent reactivation of a paused rule.
        const original = rules.find((r) => r.id === editingRuleId);
        const updated = await postCallRules.update(editingRuleId, {
          trigger_type: trigger, channel: channel || null, steps,
          is_active: original?.is_active ?? true,
        });
        setRules((prev) => prev.map((r) => (r.id === editingRuleId ? updated : r)));
      } else {
        const created = await postCallRules.create({ trigger_type: trigger, channel: channel || null, steps });
        setRules((prev) => [...prev, created]);
      }
      closeBuilder();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this automation.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (rule: AutomationRule) => {
    // PATCH replaces the whole rule server-side, not a partial merge -
    // resend the rule's own steps/channel unchanged so toggling active/
    // inactive doesn't silently wipe either.
    const updated = await postCallRules.update(rule.id, {
      trigger_type: rule.trigger_type,
      is_active: !rule.is_active,
      channel: rule.channel ?? null,
      steps: rule.steps,
    });
    setRules((prev) => prev.map((r) => (r.id === rule.id ? updated : r)));
  };

  const handleDelete = async (id: string) => {
    await postCallRules.remove(id);
    setRules((prev) => prev.filter((r) => r.id !== id));
    if (editingRuleId === id) closeBuilder();
  };

  // The step-config form shared by every open card, whether editing an
  // existing step or composing a new one - identical fields either way.
  const renderStepForm = () => (
    <div className="space-y-3">
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
            <Filter className="w-3 h-3" /> Only when...
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

      <div>
        <label className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={delayEnabled}
            onChange={(e) => setDelayEnabled(e.target.checked)}
            className="cursor-pointer"
          />
          <Clock className="w-3 h-3" /> Wait before doing this
        </label>
        {delayEnabled && (
          <div className="grid grid-cols-2 gap-2">
            <input
              type="number"
              min="1"
              value={delayValue}
              onChange={(e) => setDelayValue(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <select
              value={delayUnit}
              onChange={(e) => setDelayUnit(e.target.value as "minutes" | "hours" | "days")}
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
            >
              <option value="minutes">Minutes</option>
              <option value="hours">Hours</option>
              <option value="days">Days</option>
            </select>
          </div>
        )}
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

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDoneStep}
          disabled={!buildStep()}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer flex items-center gap-1.5"
        >
          <Check className="w-3.5 h-3.5" /> Done
        </button>
        <button
          type="button"
          onClick={handleCancelStepEdit}
          className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer flex items-center gap-1.5"
        >
          <X className="w-3.5 h-3.5" /> Cancel
        </button>
      </div>
    </div>
  );

  // One row of the flow: a node icon sitting on the connecting line (left
  // rail) plus its content to the right. The rail column is what makes
  // the whole stack read as one continuous line threading through every
  // node, Zapier-editor style, rather than a bordered list.
  const renderRailRow = (icon: React.ReactNode, iconTone: string, content: React.ReactNode, key: React.Key) => (
    <div key={key} className="relative z-10 flex items-start gap-3">
      <div className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center ${iconTone}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1 pt-0.5">{content}</div>
    </div>
  );

  // Renders gap position `at` (before the first step, between two
  // steps, or after the last one) - either the "+" that sits directly on
  // the connecting line to insert a new step exactly there (the one
  // visual detail every real linear/flow builder shares in common:
  // Zapier's own Zap editor, n8n, Make - confirmed by research before
  // building this), or, if a new step is actively being composed for
  // this exact gap, the open form in its place. Uniform for every gap,
  // including before the very first step.
  const renderGap = (at: number) => {
    if (openIndex === at && isNewStep) {
      return renderRailRow(
        <Plus className="w-3 h-3" />,
        "bg-cyan-500/15 border-cyan-500/40 text-cyan-400",
        <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20">
          <p className="text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">New step</p>
          {renderStepForm()}
        </div>,
        `insert-form-${at}`,
      );
    }
    if (openIndex !== null) return <div key={`gap-${at}`} className="h-3" />;
    return (
      <div key={`gap-${at}`} className="relative z-10 flex items-center h-6 -my-1">
        <button
          type="button"
          onClick={() => handleInsertAt(at)}
          title="Insert a step here"
          className="shrink-0 w-5 h-5 ml-1 rounded-full bg-black/60 border border-white/20 hover:border-cyan-500 hover:bg-cyan-500/20 text-os-text-dim hover:text-cyan-400 flex items-center justify-center transition-all cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
    );
  };

  // The label + condition/delay badges shared by every rendering of a
  // step's content - the interactive collapsed card (builder) and the
  // read-only one (saved-rules list below) both build on this so the two
  // views never visually drift apart.
  const renderStepBody = (step: AutomationStepConfig, index: number, total: number) => {
    const summary = stepSummary(step, publishedFlows);
    return (
      <div className="min-w-0 flex-1">
        <p className="text-xs text-white truncate">
          {total > 1 && <span className="text-os-text-dim">Step {index + 1}: </span>}
          {ACTION_LABEL[step.action_type] ?? step.action_type}
          {summary && <span className="text-os-text-dim"> - {summary}</span>}
        </p>
        {(step.condition || step.delay_seconds) && (
          <div className="flex flex-wrap gap-1 mt-1">
            {step.condition && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 text-[10px]">
                <Filter className="w-2.5 h-2.5" />
                {FIELD_LABEL[step.condition.field] ?? step.condition.field} {OPERATOR_LABEL[step.condition.operator]} &quot;{String(step.condition.value)}&quot;
              </span>
            )}
            {!!step.delay_seconds && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px]">
                <Clock className="w-2.5 h-2.5" /> waits {formatDelay(step.delay_seconds)}
              </span>
            )}
          </div>
        )}
      </div>
    );
  };

  // A collapsed step card in the builder - the shared body plus its own
  // edit/reorder/delete controls. Disabled (greyed, inert) whenever a
  // different node is open, so only one is ever edited at once.
  const renderCollapsedCard = (step: AutomationStepConfig, index: number, total: number) => {
    const locked = openIndex !== null;
    return (
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/30 border border-white/[0.08]">
        {renderStepBody(step, index, total)}
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => moveStep(index, -1)}
            disabled={locked || index === 0}
            className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-white transition-all cursor-pointer"
          >
            <ChevronUp className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => moveStep(index, 1)}
            disabled={locked || index === total - 1}
            className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-white transition-all cursor-pointer"
          >
            <ChevronDown className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => handleOpenStep(index)}
            disabled={locked}
            className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-white transition-all cursor-pointer"
          >
            <Pencil className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => removeStep(index)}
            disabled={locked}
            className="p-1 rounded-lg bg-white/[0.04] hover:bg-red-500/10 disabled:opacity-30 disabled:cursor-not-allowed text-os-text-dim hover:text-red-400 transition-all cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  // A read-only version of the rail row used by a saved rule below - no
  // insert/edit affordances, just the trigger and step nodes threaded by
  // the same connecting line, so a saved rule reads as the same flow it
  // was built as, not a fallback plain-text summary.
  const renderStaticRailRow = (icon: React.ReactNode, iconTone: string, content: React.ReactNode, key: React.Key) => (
    <div key={key} className="relative z-10 flex items-start gap-2.5">
      <div className={`shrink-0 w-6 h-6 rounded-full border flex items-center justify-center ${iconTone}`}>
        {icon}
      </div>
      <div className="min-w-0 flex-1">{content}</div>
    </div>
  );

  // A saved rule's own trigger-and-steps flow - same visual language as
  // the builder (icon nodes threaded by one line), just non-interactive.
  const renderRuleFlow = (rule: AutomationRule) => (
    <div className="relative mt-2">
      <div className="absolute left-3 top-3 bottom-3 w-0.5 bg-white/10" />
      <div className="space-y-1.5">
        {renderStaticRailRow(
          <Zap className="w-3 h-3" />,
          "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
          <p className="text-xs text-white pt-0.5">
            <span className="text-os-text-dim">When </span>
            {(TRIGGER_LABEL[rule.trigger_type] ?? rule.trigger_type).toLowerCase()}
          </p>,
          "trigger",
        )}
        {rule.steps.map((step, i) => {
          const Icon = ACTION_ICON[step.action_type] ?? Zap;
          return renderStaticRailRow(
            <Icon className="w-3 h-3" />,
            "bg-white/[0.06] border-white/[0.1] text-os-text-dim",
            <div className="flex items-start px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.08]">
              {renderStepBody(step, i, rule.steps.length)}
            </div>,
            i,
          );
        })}
      </div>
    </div>
  );

  return (
    <AppLayout
      title="Automations"
      subtitle="When something real happens in a conversation, do something about it automatically - build a step at a time."
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
                  Pick a trigger, then stack as many steps as you need - each with its own condition and wait.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => (builderOpen ? closeBuilder() : openForCreate())}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> New rule
            </button>
          </div>

          {builderOpen && (
            <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
              {editingRuleId && (
                <p className="text-[11px] text-cyan-400/80">Editing an existing rule</p>
              )}

              {/*
                The flow itself: one continuous vertical line (positioned
                to pass through every node's center) with the trigger and
                each step's icon sitting on top of it, breaking it into
                segments - the same visual vocabulary Zapier's own Zap
                editor, n8n, and Make all use for this, confirmed by
                research before building this rather than guessed at.
              */}
              <div className="relative">
                <div className="absolute left-[13px] top-3 bottom-3 w-0.5 bg-white/10" />
                <div className="space-y-1">
                  {renderRailRow(
                    <Zap className="w-3 h-3" />,
                    "bg-cyan-500/15 border-cyan-500/30 text-cyan-400",
                    <div className="space-y-2 pb-1">
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
                          }}
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                        >
                          {(Object.keys(TRIGGER_LABEL) as AutomationTrigger[]).map((t) => (
                            <option key={t} value={t}>{TRIGGER_LABEL[t]}</option>
                          ))}
                        </select>
                      </div>
                      {CHANNEL_AMBIGUOUS_TRIGGERS.has(trigger) && (
                        <div>
                          <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">From channel</label>
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
                    </div>,
                    "trigger",
                  )}

                  {/* Every gap (before step 1, between any two steps, after
                      the last one) shows either the "+" insert point, or -
                      if a new step is being composed for exactly this gap -
                      the open form in its place. Uniform for every position,
                      including before the very first step. */}
                  {renderGap(0)}

                  {steps.map((step, i) => {
                    const Icon = ACTION_ICON[step.action_type] ?? Zap;
                    const isOpenHere = openIndex === i && !isNewStep;
                    return (
                      <React.Fragment key={i}>
                        {isOpenHere
                          ? renderRailRow(
                              <Icon className="w-3 h-3" />,
                              "bg-cyan-500/15 border-cyan-500/40 text-cyan-400",
                              <div className="p-3 rounded-lg bg-black/40 border border-cyan-500/20">
                                {renderStepForm()}
                              </div>,
                              `step-${i}`,
                            )
                          : renderRailRow(
                              <Icon className="w-3 h-3" />,
                              "bg-white/[0.06] border-white/[0.1] text-os-text-dim",
                              renderCollapsedCard(step, i, steps.length),
                              `step-${i}`,
                            )}
                        {renderGap(i + 1)}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>

              {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving || steps.length === 0 || openIndex !== null}
                  className="px-4 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
                >
                  {isSaving ? "Saving…" : editingRuleId ? "Save changes" : "Save rule"}
                </button>
                <button
                  type="button"
                  onClick={closeBuilder}
                  className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : rules.length === 0 && !builderOpen ? (
            <EmptyState
              icon={Zap}
              title="No automations yet"
              description="Set up a rule for a message arriving, a Flow completing, an appointment booked, and more."
            />
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div key={rule.id} className="p-3.5 rounded-xl bg-black/20 border border-white/[0.06]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">
                        {rule.channel ? CHANNEL_LABEL[rule.channel] : "Any channel"}
                      </Badge>
                      <Badge variant={rule.is_active ? "emerald" : "amber"} dot>
                        {rule.is_active ? "Active" : "Paused"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openForEdit(rule)}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white border border-white/[0.08] transition-all cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
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
                  {renderRuleFlow(rule)}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}
