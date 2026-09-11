"use client";

import React, { useEffect, useState } from "react";
import { Zap, Trash2, Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  postCallRules,
  type PostCallRule,
} from "@/lib/api";

// Narrower than the full AutomationTrigger/AutomationAction vocabulary
// (lib/api.ts) on purpose - this tab is the /voice page's own call-only
// view. The broader cross-channel set lives on the /automations page;
// creating a rule from either place hits the same backend endpoint.
type VoiceTrigger = "call.completed" | "call.voicemail" | "call.no_answer";
type VoiceAction = "whatsapp_followup" | "create_escalation_task";

const TRIGGER_LABEL: Record<VoiceTrigger, string> = {
  "call.completed": "A call finishes",
  "call.voicemail": "A call goes to voicemail",
  "call.no_answer": "A call goes unanswered",
};

const ACTION_LABEL: Record<VoiceAction, string> = {
  whatsapp_followup: "Send a WhatsApp follow-up",
  create_escalation_task: "Create a task for the team",
};

export function PostCallRulesTab() {
  const [rules, setRules] = useState<PostCallRule[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [isCreating, setIsCreating] = useState(false);
  const [trigger, setTrigger] = useState<VoiceTrigger>("call.voicemail");
  const [action, setAction] = useState<VoiceAction>("whatsapp_followup");
  const [configText, setConfigText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
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

  useEffect(() => {
    loadData();
  }, []);

  const configKey = action === "whatsapp_followup" ? "message" : "reason";

  const handleCreate = async () => {
    if (!configText.trim()) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await postCallRules.create({
        trigger_type: trigger,
        action_type: action,
        action_config: { [configKey]: configText.trim() },
      });
      setRules((prev) => [...prev, created]);
      setConfigText("");
      setIsCreating(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not create rule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (rule: PostCallRule) => {
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

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Post-call Actions</h3>
              <p className="text-xs text-os-text-dim">
                When a call ends a certain way, do something about it automatically.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New rule
          </button>
        </div>

        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}

        {isCreating && (
          <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                  When
                </label>
                <select
                  value={trigger}
                  onChange={(e) => setTrigger(e.target.value as VoiceTrigger)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {(Object.keys(TRIGGER_LABEL) as VoiceTrigger[]).map((t) => (
                    <option key={t} value={t}>
                      {TRIGGER_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                  Then
                </label>
                <select
                  value={action}
                  onChange={(e) => {
                    setAction(e.target.value as VoiceAction);
                    setConfigText("");
                  }}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {(Object.keys(ACTION_LABEL) as VoiceAction[]).map((a) => (
                    <option key={a} value={a}>
                      {ACTION_LABEL[a]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                {action === "whatsapp_followup" ? "Message to send" : "Task description"}
              </label>
              {action === "whatsapp_followup" && (
                <p className="text-[11px] text-os-text-dim mb-2">
                  Sent via your approved &quot;post_call_followup&quot; WhatsApp template - set
                  that up in Meta&apos;s WhatsApp Manager first if you haven&apos;t already.
                </p>
              )}
              <textarea
                value={configText}
                onChange={(e) => setConfigText(e.target.value)}
                rows={2}
                placeholder={
                  action === "whatsapp_followup"
                    ? "Sorry we missed you - reply here anytime and we'll help right away."
                    : "Call back the customer about their missed call."
                }
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
              />
            </div>

            {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving || !configText.trim()}
                className="px-4 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
              >
                {isSaving ? "Saving…" : "Save rule"}
              </button>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {!isLoading && rules.length === 0 && !isCreating && (
          <EmptyState
            icon={Zap}
            title="No rules yet"
            description="Set up an automatic follow-up for a voicemail, a missed call, or how any call ends."
          />
        )}

        {rules.length > 0 && (
          <div className="space-y-2">
            {rules.map((rule) => (
              <div
                key={rule.id}
                className="p-3.5 rounded-xl bg-black/20 border border-white/[0.06] flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-xs text-white">
                    <span className="text-os-text-dim">When </span>
                    {TRIGGER_LABEL[rule.trigger_type]?.toLowerCase() ?? rule.trigger_type}
                    <span className="text-os-text-dim">, </span>
                    {ACTION_LABEL[rule.action_type]?.toLowerCase() ?? rule.action_type}
                  </p>
                  <p className="text-[11px] text-os-text-dim mt-0.5 truncate">
                    {rule.action_config.message || rule.action_config.reason}
                  </p>
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
  );
}
