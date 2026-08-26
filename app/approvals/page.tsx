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
} from "@/lib/api";

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  voice: Phone,
  email: Mail,
  instagram: MessageSquare,
};

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
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Status Bar & Info Callout */}
        <div className="p-4 rounded-xl border border-brass/20 bg-brass/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brass/20 border border-brass/30 text-brass">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                Draft Mode Safeguard Active
              </h3>
              <p className="text-xs text-os-text-dim">
                No WhatsApp messages are sent automatically. Each reply is held here with stated AI reasoning for your sign-off.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {["pending", "approved", "rejected"].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all ${
                  statusFilter === s
                    ? "bg-white text-black font-bold shadow-md"
                    : "bg-white/[0.04] text-os-text-dim hover:text-white hover:bg-white/[0.08]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

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
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">
                            {draft.customer_name || "Customer"}
                          </h4>
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
    </AppLayout>
  );
}
