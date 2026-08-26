"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Upload,
  Sparkles,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  knowledge,
  type KnowledgeItem,
  type KnowledgeGap,
  type KnowledgeStatus,
  type KnowledgeKind,
} from "@/lib/api";

// Matches the backend's own RETRIEVAL_THRESHOLD_TOKENS - the point past
// which it recommends retrieval instead of whole-document injection. Not a
// hard ceiling, just what the progress bar is measured against.
const TOKEN_BUDGET_REFERENCE = 12_000;

const KIND_OPTIONS: { value: KnowledgeKind; label: string }[] = [
  { value: "price_list", label: "Price List" },
  { value: "faq", label: "FAQ" },
  { value: "policy", label: "Policy" },
  { value: "hours", label: "Hours" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

export default function KnowledgePage() {
  const [activeTab, setActiveTab] = useState<"gaps" | "items" | "upload">("gaps");
  const [gaps, setGaps] = useState<KnowledgeGap[]>([]);
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [status, setStatus] = useState<KnowledgeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // "Answer Gap" / "Add Item" Modal State
  const [answeringGap, setAnsweringGap] = useState<KnowledgeGap | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState<KnowledgeKind>("other");
  const [newContent, setNewContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Direct Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadKind, setUploadKind] = useState<KnowledgeKind>("other");
  const [isUploading, setIsUploading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [gapsRes, itemsRes, statRes] = await Promise.allSettled([
      knowledge.gaps(),
      knowledge.list(),
      knowledge.status(),
    ]);

    if (gapsRes.status === "fulfilled") setGaps(gapsRes.value);
    if (itemsRes.status === "fulfilled") setItems(itemsRes.value);
    if (statRes.status === "fulfilled") setStatus(statRes.value);

    const failed = [gapsRes, itemsRes, statRes].find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(
        failed.reason instanceof Error ? failed.reason.message : "Could not load the knowledge base.",
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const isModalOpen = !!answeringGap || isAddModalOpen;

  const closeModal = () => {
    setAnsweringGap(null);
    setIsAddModalOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewKind("other");
  };

  const openGapModal = (gap: KnowledgeGap) => {
    setAnsweringGap(gap);
    setNewTitle(gap.gap);
    setNewContent("");
    setNewKind("other");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    try {
      await knowledge.create({
        title: newTitle,
        content: newContent,
        kind: newKind,
        resolves_gap: answeringGap?.gap,
      });
      if (answeringGap) {
        setGaps((prev) => prev.filter((g) => g.gap !== answeringGap.gap));
      }
      closeModal();
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save this knowledge item.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile || !uploadTitle.trim()) return;
    setIsUploading(true);
    setActionError(null);
    try {
      await knowledge.upload({ file: selectedFile, title: uploadTitle, kind: uploadKind });
      setSelectedFile(null);
      setUploadTitle("");
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not upload this document.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    setActionError(null);
    try {
      await knowledge.delete(id);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not delete this item.");
    }
  };

  return (
    <AppLayout
      title="Knowledge Base & Gaps Queue"
      subtitle="Teach the AI agent business details & resolve unanswered customer questions"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Knowledge Item</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
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

        {/* Token Budget Telemetry Card */}
        {status && (
          <GlassCard className="p-4 bg-gradient-to-r from-[#0B0F17] to-brass/10 border-brass/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-brass/10 border border-brass/20 text-brass">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white">AI Context Token Budget</h4>
                <p className="text-xs text-os-text-dim">{status.advice}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 font-mono text-xs">
              <div className="w-28 h-2 rounded-full bg-white/[0.08] overflow-hidden">
                <div
                  className={`h-full rounded-full ${status.fits_in_context ? "bg-brass" : "bg-amber-400"}`}
                  style={{
                    width: `${Math.min(100, (status.total_tokens / TOKEN_BUDGET_REFERENCE) * 100)}%`,
                  }}
                />
              </div>
              <span className="text-white font-bold">{status.total_tokens} tokens</span>
            </div>
          </GlassCard>
        )}

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          {[
            { key: "gaps", label: `Unanswered Gaps Queue (${gaps.length})` },
            { key: "items", label: `Knowledge Entries (${items.length})` },
            { key: "upload", label: "Upload Documents (TXT / MD / CSV)" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-inner font-bold"
                  : "text-os-text-dim hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: GAPS QUEUE (THE DIFFERENTIATING QUEUE) */}
        {activeTab === "gaps" && (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-brass/10 border border-brass/20 text-xs text-os-text-dim flex items-center justify-between">
              <span>
                <strong>The Gaps Queue</strong> lists real questions asked by your customers that the AI didn't have answers for. Click <strong>Answer This</strong> to instantly add knowledge and close the loop.
              </span>
              <Badge variant="indigo">{gaps.length} Gaps Open</Badge>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
              </div>
            ) : gaps.length === 0 ? (
              <EmptyState
                icon={CheckCircle2}
                title="Zero Unanswered Gaps!"
                description="Your AI agent has sufficient knowledge context for all recently asked customer questions."
              />
            ) : (
              <div className="space-y-3">
                {gaps.map((gap) => (
                  <GlassCard key={gap.gap} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1 overflow-hidden">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {gap.gap}
                        </span>
                        <Badge variant="amber" size="sm">
                          Asked {gap.times_asked} times
                        </Badge>
                      </div>
                      {gap.example_question && (
                        <p className="text-xs text-white/80 italic font-mono">
                          "{gap.example_question}"
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => openGapModal(gap)}
                      className="px-4 py-2 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold transition-all shadow-md shrink-0 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Answer This & Close Gap
                    </button>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KNOWLEDGE ITEMS */}
        {activeTab === "items" && (
          <div className="space-y-4">
            {items.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="No knowledge added yet"
                description="Add a price list, FAQ, or policy so the agent can answer from it."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {items.map((item) => (
                  <GlassCard key={item.id} className="p-5 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-os-text-dim">
                          {item.kind}
                        </span>
                      </div>

                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-white/90 font-mono whitespace-pre-wrap leading-relaxed mb-4">
                        {item.content}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[10px] font-mono text-os-text-dim">
                      <span>{item.token_estimate} Tokens · {item.source}</span>
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item.id)}
                        className="text-os-text-dim hover:text-thread-bright transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: DOCUMENT UPLOADER */}
        {activeTab === "upload" && (
          <div className="max-w-xl mx-auto space-y-6">
            <GlassCard className="p-6 space-y-4">
              <div>
                <h4 className="text-sm font-bold text-white mb-1">
                  Upload Business Documents
                </h4>
                <p className="text-xs text-os-text-dim">
                  Only plain text is read today (.txt, .md, .csv) — for anything else, copy the text into an entry instead.
                </p>
              </div>

              <form onSubmit={handleFileUpload} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                    Title:
                  </label>
                  <input
                    type="text"
                    required
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                    Kind:
                  </label>
                  <select
                    value={uploadKind}
                    onChange={(e) => setUploadKind(e.target.value as KnowledgeKind)}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  >
                    {KIND_OPTIONS.map((k) => (
                      <option key={k.value} value={k.value}>{k.label}</option>
                    ))}
                  </select>
                </div>

                <div className="border-2 border-dashed border-white/[0.12] rounded-2xl p-8 text-center bg-black/30 hover:border-brass/50 transition-colors">
                  <Upload className="w-8 h-8 mx-auto text-os-text-dim mb-3" />
                  <input
                    type="file"
                    accept=".txt,.md,.csv"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="block w-full text-xs text-os-text-dim file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/[0.08] file:text-white hover:file:bg-white/[0.12] cursor-pointer"
                  />
                  <p className="text-[10px] text-os-text-dim mt-2 font-mono">
                    Supported: TXT, MD, CSV (Max 2MB)
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!selectedFile || !uploadTitle.trim() || isUploading}
                  className="w-full py-2.5 rounded-xl bg-brass hover:bg-brass-dim disabled:opacity-50 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {isUploading ? "Extracting & Ingesting..." : "Ingest Document into AI"}
                </button>
              </form>
            </GlassCard>
          </div>
        )}

        {/* Answer Gap / Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={answeringGap ? answeringGap.gap : "Add Knowledge Entry"}
          subtitle="This information will immediately feed the AI agent's reasoning across WhatsApp and Voice."
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {answeringGap?.example_question && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <span className="text-[10px] uppercase font-mono block mb-0.5">
                  Customer Inquiry Example:
                </span>
                "{answeringGap.example_question}"
              </div>
            )}

            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Title:
              </label>
              <input
                type="text"
                required
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Accommodation Policies & Nearby Hotels"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Kind:
              </label>
              <select
                value={newKind}
                onChange={(e) => setNewKind(e.target.value as KnowledgeKind)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              >
                {KIND_OPTIONS.map((k) => (
                  <option key={k.value} value={k.value}>{k.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Knowledge Body (How AI should answer):
              </label>
              <textarea
                rows={5}
                required
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="State details clearly (e.g. We partner with Hotel Orchid across the street offering 20% discount with promo code MED2026...)"
                className="w-full p-3 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={closeModal}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md shadow-brass/20 cursor-pointer"
              >
                {isSubmitting ? "Saving..." : answeringGap ? "Save & Close Gap" : "Save"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
