"use client";

import React, { useEffect, useState } from "react";
import {
  CheckSquare,
  Check,
  X,
  Edit3,
  Sparkles,
  AlertCircle,
  Clock,
  ArrowRight,
  Shield,
  HelpCircle,
  MessageSquare,
  Phone,
  Mail,
  Send,
  CornerDownRight,
  Eye,
  Zap,
  Settings2,
  Plus,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import {
  approvals,
  type MessageDraft,
  type AutonomyLevel,
  type AutoSendRules,
} from "@/lib/api";

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  voice: Phone,
  email: Mail,
  instagram: MessageSquare,
};

/** This is the one screen an expiring draft's window actually gets acted
 * on from - `expires_at`/`expired` were already on MessageDraft and shown
 * on the dashboard's own preview list, but never here, the page where a
 * person can actually still do something about it. */
function expiryUrgency(draft: MessageDraft): { label: string; className: string } | null {
  if (draft.expired) {
    return { label: "Window closed - can't send", className: "bg-rose-500/20 text-rose-300 border-rose-500/40" };
  }
  if (!draft.expires_at) return null;
  const msLeft = new Date(draft.expires_at).getTime() - Date.now();
  if (msLeft <= 0) return null; // backend hasn't marked it expired yet, but it's over
  const hoursLeft = msLeft / 3_600_000;
  if (hoursLeft < 1) {
    const mins = Math.round(msLeft / 60_000);
    return { label: `Expires in ${mins}m`, className: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse" };
  }
  if (hoursLeft < 3) {
    return { label: `Expires in ${Math.round(hoursLeft)}h`, className: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
  }
  return null;
}

export default function ApprovalsPage() {
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Edit Modal State
  const [editingDraft, setEditingDraft] = useState<MessageDraft | null>(null);
  const [editedText, setEditedText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reject Modal State
  const [rejectingDraft, setRejectingDraft] = useState<MessageDraft | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Auto-Send Rules - a business's own configuration for `conditional`
  // autonomy, so it isn't every single draft landing here for review.
  const [rules, setRules] = useState<AutoSendRules | null>(null);
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isLoadingRules, setIsLoadingRules] = useState(true);
  const [isSavingRules, setIsSavingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);
  const [newKeyword, setNewKeyword] = useState("");

  const loadRules = async () => {
    setIsLoadingRules(true);
    try {
      setRules(await approvals.autoSendRules());
    } catch {
      // Panel just won't show a track record - the toggle below still works.
    } finally {
      setIsLoadingRules(false);
    }
  };

  useEffect(() => {
    loadRules();
  }, []);

  const saveRules = async (patch: Partial<{ enabled: boolean; min_confidence: number; blocked_keywords: string[] }>) => {
    setIsSavingRules(true);
    setRulesError(null);
    try {
      const updated = await approvals.updateAutoSendRules(patch);
      setRules(updated);
    } catch (err) {
      setRulesError(err instanceof Error ? err.message : "Could not save this rule.");
    } finally {
      setIsSavingRules(false);
    }
  };

  const handleAddKeyword = () => {
    const word = newKeyword.trim();
    if (!word || !rules || rules.blocked_keywords.includes(word)) return;
    setNewKeyword("");
    saveRules({ blocked_keywords: [...rules.blocked_keywords, word] });
  };

  const handleRemoveKeyword = (word: string) => {
    if (!rules) return;
    saveRules({ blocked_keywords: rules.blocked_keywords.filter((k) => k !== word) });
  };

  const loadDrafts = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await approvals.list(statusFilter);
      setDrafts(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load the approvals queue.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDrafts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const handleApprove = async (draftId: string, customBody?: string) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await approvals.approve(draftId, customBody);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setEditingDraft(null);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not send this reply.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async (draftId: string) => {
    setIsSubmitting(true);
    setActionError(null);
    try {
      await approvals.reject(draftId, rejectReason);
      setDrafts((prev) => prev.filter((d) => d.id !== draftId));
      setRejectingDraft(null);
      setRejectReason("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not reject this draft.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout
      title="Approvals Queue"
      subtitle="Human-in-the-loop: Review AI-drafted responses before sending"
    >
      {/* Same restrained glow-behind-glass treatment as Dashboard/Conversations,
          for consistency across the app rather than a flat page background. */}
      <div className="relative">
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-20 right-[10%] w-[440px] h-[440px] rounded-full bg-brass/[0.06] blur-[130px]" />
          <div className="absolute bottom-0 left-[8%] w-[380px] h-[380px] rounded-full bg-seal/[0.05] blur-[130px]" />
        </div>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Status Bar & Info Callout */}
        <div className="p-4 rounded-xl border border-brass/20 bg-brass/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brass/20 border border-brass/30 text-brass">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                {rules?.autonomy === "conditional"
                  ? "Conditional Auto-Send Active"
                  : rules?.autonomy === "act"
                  ? "Full Auto-Send Active"
                  : "Draft Mode Safeguard Active"}
              </h3>
              <p className="text-xs text-os-text-dim">
                {rules?.autonomy === "conditional"
                  ? "Replies that clear your own auto-send rules go out on their own. Everything else waits here."
                  : rules?.autonomy === "act"
                  ? "Every reply sends automatically - none reach this queue."
                  : "No WhatsApp messages are sent automatically. Each reply is held here with stated AI reasoning for your sign-off."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {["pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all border ${
                  statusFilter === s
                    ? "bg-black border-brass/50 text-brass-bright font-bold shadow-[0_0_0_1px_rgba(201,151,63,0.15)]"
                    : "bg-white/[0.04] border-transparent text-os-text-dim hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Auto-Send Rules - `conditional` autonomy configured here, not a
            separate settings page, since this is where the load it's
            solving is actually felt. */}
        <GlassCard className="overflow-hidden">
          <button
            type="button"
            onClick={() => setIsRulesOpen((v) => !v)}
            className="w-full p-4 flex items-center justify-between gap-3 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg border ${rules?.enabled ? "bg-seal/15 border-seal/30 text-seal-bright" : "bg-white/[0.04] border-white/[0.08] text-os-text-dim"}`}>
                <Settings2 className="w-4 h-4" />
              </div>
              <div className="text-left">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                  Auto-Send Rules
                </h3>
                <p className="text-xs text-os-text-dim">
                  {rules?.enabled
                    ? `On - replies at ${Math.round((rules.min_confidence ?? 0) * 100)}%+ confidence send without review, unless they touch a blocked topic.`
                    : "Off - every reply waits for you. Set rules here to let the safe ones send themselves."}
                </p>
              </div>
            </div>
            {isRulesOpen ? <ChevronUp className="w-4 h-4 text-os-text-dim shrink-0" /> : <ChevronDown className="w-4 h-4 text-os-text-dim shrink-0" />}
          </button>

          {isRulesOpen && (
            <div className="px-4 pb-4 space-y-4 border-t border-white/[0.06] pt-4">
              {isLoadingRules ? (
                <Skeleton className="h-24 w-full" />
              ) : !rules ? (
                <p className="text-xs text-os-text-dim">Could not load auto-send rules.</p>
              ) : (
                <>
                  {/* Enable toggle */}
                  <div className="flex items-center justify-between gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <div>
                      <p className="text-xs font-semibold text-white">Let safe replies send themselves</p>
                      <p className="text-[11px] text-os-text-dim mt-0.5">
                        A reply only auto-sends if it clears every rule below - anything uncertain still lands here.
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isSavingRules}
                      onClick={() => saveRules({ enabled: !rules.enabled })}
                      className={`shrink-0 w-11 h-6 rounded-full transition-all cursor-pointer disabled:opacity-50 relative ${
                        rules.enabled ? "bg-seal" : "bg-white/[0.12]"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                          rules.enabled ? "left-[22px]" : "left-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Track record, for context - not a hard gate */}
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center gap-4 text-xs">
                    <span className="text-os-text-dim">Last 30 days:</span>
                    <span className="text-white font-mono">{rules.drafted_last_30d} drafted</span>
                    {rules.approval_rate_last_30d != null && (
                      <span className="text-white font-mono">
                        {Math.round(rules.approval_rate_last_30d * 100)}% approved as-is
                      </span>
                    )}
                    {rules.drafted_last_30d < 20 && (
                      <span className="text-amber-300">- not much history yet, worth watching closely</span>
                    )}
                  </div>

                  {/* Minimum confidence */}
                  <div>
                    <label className="flex items-center justify-between text-xs font-mono uppercase text-os-text-dim mb-1.5">
                      <span>Minimum confidence to auto-send</span>
                      <span className="text-white">{Math.round(rules.min_confidence * 100)}%</span>
                    </label>
                    <input
                      type="range"
                      min={50}
                      max={99}
                      value={Math.round(rules.min_confidence * 100)}
                      onChange={(e) => setRules({ ...rules, min_confidence: Number(e.target.value) / 100 })}
                      onMouseUp={(e) => saveRules({ min_confidence: Number((e.target as HTMLInputElement).value) / 100 })}
                      onTouchEnd={(e) => saveRules({ min_confidence: Number((e.target as HTMLInputElement).value) / 100 })}
                      className="w-full accent-brass cursor-pointer"
                    />
                  </div>

                  {/* Blocked keywords */}
                  <div>
                    <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                      Never auto-send if the reply mentions
                    </label>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {rules.blocked_keywords.length === 0 ? (
                        <p className="text-[11px] text-os-text-dim italic">No blocked phrases yet.</p>
                      ) : (
                        rules.blocked_keywords.map((word) => (
                          <span
                            key={word}
                            className="px-2 py-1 rounded-md text-[11px] font-mono bg-thread/10 border border-thread/25 text-thread-bright flex items-center gap-1.5"
                          >
                            {word}
                            <button type="button" onClick={() => handleRemoveKeyword(word)} className="hover:text-white cursor-pointer">
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </span>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={newKeyword}
                        onChange={(e) => setNewKeyword(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddKeyword())}
                        placeholder="e.g. refund, cancel, price change..."
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleAddKeyword}
                        disabled={!newKeyword.trim() || isSavingRules}
                        className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim cursor-pointer disabled:opacity-50 flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-[10px] text-os-text-dim leading-relaxed pt-2 border-t border-white/[0.06]">
                    One rule you can't turn off: anything touching your vertical's always-escalate topics (like a medical
                    emergency for a clinic) holds for review no matter what's set above.
                  </p>

                  {rulesError && <p className="text-[11px] text-red-400">{rulesError}</p>}
                </>
              )}
            </div>
          )}
        </GlassCard>

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

        {/* Drafts List */}
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-44 w-full" />
            <Skeleton className="h-44 w-full" />
          </div>
        ) : drafts.length === 0 ? (
          <EmptyState
            icon={CheckSquare}
            title="All caught up!"
            description={`There are no ${statusFilter} drafts in your queue right now. New customer inquiries will automatically generate drafts here.`}
          />
        ) : (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const ChannelIcon = CHANNEL_ICONS[draft.channel] || MessageSquare;
              const confidencePct = Math.round(draft.confidence * 100);

              return (
                <GlassCard
                  key={draft.id}
                  isAiArtifact={true}
                  className="p-6 overflow-hidden transition-all hover:border-brass/50"
                >
                  {/* Top Bar: Customer Info + Confidence Meter */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-seal/10 border border-seal/20 text-seal-bright">
                        <ChannelIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-bold text-white">
                            {draft.customer_name || "Customer"}
                          </h4>
                          {(() => {
                            const urgency = expiryUrgency(draft);
                            return urgency ? (
                              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 ${urgency.className}`}>
                                <Clock className="w-2.5 h-2.5" />
                                {urgency.label}
                              </span>
                            ) : null;
                          })()}
                        </div>
                        <span className="text-[11px] text-os-text-dim">
                          Received {new Date(draft.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    {/* Confidence Meter Bar */}
                    <div className="flex items-center gap-3 bg-white/[0.02] px-3 py-1.5 rounded-lg border border-white/[0.04]">
                      <span className="text-[11px] font-mono text-os-text-dim">
                        Confidence:
                      </span>
                      <div className="w-20 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            confidencePct >= 90
                              ? "bg-seal-bright"
                              : confidencePct >= 75
                              ? "bg-brass"
                              : "bg-amber-400"
                          }`}
                          style={{ width: `${confidencePct}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono text-white">
                        {confidencePct}%
                      </span>
                    </div>
                  </div>

                  {/* Inbound Customer Inquiry */}
                  {draft.replying_to && (
                    <div className="my-4 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] text-xs">
                      <div className="text-[10px] uppercase font-mono text-os-text-dim mb-1 flex items-center gap-1">
                        <CornerDownRight className="w-3 h-3 text-os-text-dim" />
                        Inbound Customer Message:
                      </div>
                      <p className="text-white/90 italic font-sans">
                        "{draft.replying_to}"
                      </p>
                    </div>
                  )}

                  {/* AI Proposed Response Body */}
                  <div className="my-4 p-4 rounded-xl bg-brass/10 border border-brass/20 text-sm">
                    <div className="text-[10px] uppercase font-mono text-brass-bright font-bold mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-brass" />
                      AI Proposed Reply (Ready to Send):
                    </div>
                    <p className="text-white leading-relaxed whitespace-pre-wrap font-sans">
                      {draft.body}
                    </p>
                  </div>

                  {/* AI Stated Reasoning & Gaps (Critical for Trust) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6 text-xs">
                    {draft.reasoning && (
                      <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.04]">
                        <span className="text-[10px] uppercase font-mono text-brass-bright block mb-1 font-semibold">
                          💡 Why AI Proposed This:
                        </span>
                        <p className="text-os-text-dim leading-relaxed">
                          {draft.reasoning}
                        </p>
                      </div>
                    )}

                    {draft.gap && (
                      <div className="p-3 rounded-lg bg-amber-500/[0.04] border border-amber-500/20">
                        <span className="text-[10px] uppercase font-mono text-amber-300 block mb-1 font-semibold">
                          ⚠️ Uncertainty / Gap Noted:
                        </span>
                        <p className="text-os-text-dim leading-relaxed">
                          {draft.gap}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Bar (Approve, Edit, Reject) */}
                  {statusFilter === "pending" && (
                    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => {
                          setRejectingDraft(draft);
                        }}
                        className="px-3 py-2 rounded-lg text-xs font-semibold text-thread-bright hover:text-thread-bright hover:bg-thread/10 border border-thread/20 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject Draft
                      </button>

                      {draft.expired ? (
                        <p className="text-xs text-rose-300 italic">
                          This reply's window has closed - it can no longer be sent.
                        </p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingDraft(draft);
                              setEditedText(draft.body);
                            }}
                            className="px-3.5 py-2 rounded-lg text-xs font-semibold text-white bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Edit Before Send
                          </button>

                          <button
                            type="button"
                            onClick={() => handleApprove(draft.id)}
                            className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-seal hover:bg-seal-dim shadow-lg shadow-seal/20 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Check className="w-4 h-4" />
                            Approve & Send
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </GlassCard>
              );
            })}
          </div>
        )}

        {/* Edit & Approve Modal */}
        <Modal
          isOpen={!!editingDraft}
          onClose={() => setEditingDraft(null)}
          title={`Edit Reply for ${editingDraft?.customer_name || "Customer"}`}
          subtitle="Modify the response body. Once approved, your edited text will be dispatched immediately."
          maxWidth="lg"
        >
          <div className="space-y-4">
            <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs">
              <span className="text-[10px] uppercase font-mono text-os-text-dim block mb-1">
                Original Inbound:
              </span>
              <p className="text-white/90 italic">
                "{editingDraft?.replying_to}"
              </p>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                Reply Content:
              </label>
              <textarea
                rows={6}
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white focus:border-brass focus:outline-none leading-relaxed"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setEditingDraft(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white bg-white/[0.04]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (editingDraft) handleApprove(editingDraft.id, editedText);
                }}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim transition-all flex items-center gap-1.5 shadow-lg shadow-brass/20 cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? "Sending..." : "Approve Edited Reply"}
              </button>
            </div>
          </div>
        </Modal>

        {/* Reject Modal */}
        <Modal
          isOpen={!!rejectingDraft}
          onClose={() => setRejectingDraft(null)}
          title="Reject Proposed Draft"
          subtitle="Rejecting helps the AI learn what tone or details to avoid in future draft generation."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                Reason for Rejection (Optional):
              </label>
              <textarea
                rows={3}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Incorrect pricing tier, tone too casual, customer already called..."
                className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-thread focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectingDraft(null)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  if (rejectingDraft) handleReject(rejectingDraft.id);
                }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-thread hover:bg-thread-dim transition-all"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </Modal>
      </div>
      </div>
    </AppLayout>
  );
}
