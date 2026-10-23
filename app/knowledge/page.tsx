"use client";

import React, { useEffect, useState } from "react";
import {
  BookOpen,
  Plus,
  Sparkles,
  CheckCircle2,
  Trash2,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { BusinessCard } from "@/components/knowledge/BusinessCard";
import { TeamCard } from "@/components/knowledge/TeamCard";
import { GapAnswer } from "@/components/knowledge/GapAnswer";
import { FileReader } from "@/components/knowledge/FileReader";
import { Catalogue } from "@/components/knowledge/Catalogue";
import { FeeList } from "@/components/knowledge/FeeList";
import { useRole } from "@/lib/useRole";
import { QuestionBank } from "@/components/knowledge/QuestionBank";
import { ResetKnowledge } from "@/components/knowledge/ResetKnowledge";
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

// Matches knowledge_card.OTHER_CHARS_LIMIT on the backend.
const OTHER_CHARS_LIMIT = 4000;

const KIND_OPTIONS: { value: KnowledgeKind; label: string }[] = [
  { value: "price_list", label: "Price List" },
  { value: "faq", label: "FAQ" },
  { value: "policy", label: "Policy" },
  { value: "hours", label: "Hours" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

export default function KnowledgePage() {
  const { capabilities, role } = useRole();
  // Bumped after a reset so every tab loads again from the (now empty) server.
  const [version, setVersion] = useState(0);
  const [activeTab, setActiveTab] = useState<"card" | "team" | "catalogue" | "fees" | "bank" | "gaps" | "items" | "upload">("card");
  const [editingItem, setEditingItem] = useState<KnowledgeItem | null>(null);
  const [fileSuggestionsWaiting, setFileSuggestionsWaiting] = useState(false);
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

  const isModalOpen = !!answeringGap || isAddModalOpen || !!editingItem;

  const closeModal = () => {
    setAnsweringGap(null);
    setEditingItem(null);
    setIsAddModalOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewKind("other");
  };

  const openEditModal = (item: KnowledgeItem) => {
    setEditingItem(item);
    setNewTitle(item.title);
    setNewContent(item.content);
    setNewKind(item.kind);
  };

  const handleToggleActive = async (item: KnowledgeItem) => {
    setActionError(null);
    try {
      const updated = await knowledge.update(item.id, { active: !item.active });
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not change this item.");
    }
  };

  const handleDismissGap = async (gap: KnowledgeGap) => {
    setActionError(null);
    try {
      await knowledge.dismissGap(gap.gap);
      setGaps((prev) => prev.filter((g) => g.gap !== gap.gap));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not dismiss this gap.");
    }
  };

  const openGapModal = (gap: KnowledgeGap) => {
    setAnsweringGap(gap);
  };

  // Card fields live on the Business card and Team tabs; this list is everything else.
  const otherItems = items.filter((i) => !i.topic && !i.card);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionError(null);
    try {
      if (editingItem) {
        await knowledge.update(editingItem.id, { title: newTitle, content: newContent, kind: newKind });
        closeModal();
        loadData();
        return;
      }
      await knowledge.create({ title: newTitle, content: newContent, kind: newKind });
      closeModal();
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save this knowledge item.");
    } finally {
      setIsSubmitting(false);
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
      <div className="workspace-knowledge space-y-6">
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
          <GlassCard className="p-5 border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
        <div className="workspace-tabs border-b border-white/[0.08]">
          {[
            { key: "card", label: "Business card" },
            { key: "team", label: "Team" },
            { key: "catalogue", label: "Catalogue" },
            ...(capabilities.includes("price_list_payments") ? [{ key: "fees", label: "Fees / Price list" }] : []),
            { key: "bank", label: "Question bank" },
            { key: "gaps", label: `Unanswered Gaps Queue (${gaps.length})` },
            { key: "items", label: `Other entries (${otherItems.length})` },
            { key: "upload", label: "Fill from a file" },
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

        {/* TAB 0: THE CARDS - short, same fields for every business type, read by the AI on every message */}
        {activeTab !== "upload" && fileSuggestionsWaiting && (
          <button
            type="button"
            onClick={() => setActiveTab("upload")}
            className="w-full text-left px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 cursor-pointer"
          >
            Suggestions from your file are waiting. They are not on your card yet - open <strong>Fill from a file</strong>, tick them and press Save.
          </button>
        )}
        {activeTab === "card" && <BusinessCard key={version} onChanged={loadData} />}
        {activeTab === "team" && <TeamCard key={version} onChanged={loadData} />}
        {activeTab === "catalogue" && <Catalogue key={version} onChanged={loadData} />}
        {activeTab === "fees" && capabilities.includes("price_list_payments") && <FeeList key={version} onChanged={loadData} />}
        {activeTab === "bank" && <QuestionBank key={version} onChanged={loadData} />}

        {/* TAB 1: GAPS QUEUE (THE DIFFERENTIATING QUEUE) */}
        {activeTab === "gaps" && (
          <div className="space-y-4">
            <div className="workspace-card-heading justify-between p-5 rounded-xl bg-teal/[0.05] border border-teal/20 text-xs text-os-text-dim">
              <span>
                <strong>The Gaps Queue</strong> lists real questions asked by your customers that the AI didn't have answers for. Add the answer to your card, keep it as a top question, or tell the AI to always hand it to you.
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">
                          {gap.gap}
                        </span>
                        <Badge variant="amber" size="sm">
                          Asked {gap.times_asked} times
                        </Badge>
                        {gap.suggested_field && (
                          <Badge variant="outline" size="sm">Fits: {gap.suggested_field.replace("_", " ")}</Badge>
                        )}
                      </div>
                      {gap.example_question && (
                        <p className="text-xs text-white/80 italic font-mono">
                          "{gap.example_question}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleDismissGap(gap)}
                        className="px-3 py-2 rounded-xl text-xs text-os-text-dim hover:text-white cursor-pointer"
                        title="Not a real gap, or already covered"
                      >
                        Dismiss
                      </button>
                      <button
                        type="button"
                        onClick={() => openGapModal(gap)}
                        className="px-4 py-2 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Answer
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: KNOWLEDGE ITEMS */}
        {activeTab === "items" && (
          <div className="space-y-4">
            {status && (
              <div className="flex flex-wrap items-center justify-between gap-2 p-4 rounded-xl bg-white/[0.03] border border-white/[0.08] text-xs text-os-text-dim">
                <span>
                  Short notes for what fits nowhere on the Business card. The AI reads every entry that is on, on every message, so they are kept small.
                </span>
                <span className={`font-mono ${status.other_items > status.other_items_limit || status.other_tokens > status.other_tokens_limit ? "text-amber-300" : ""}`}>
                  {status.other_items}/{status.other_items_limit} on · {status.other_tokens}/{status.other_tokens_limit} tokens
                </span>
              </div>
            )}
            {status && (status.other_items > status.other_items_limit || status.other_tokens > status.other_tokens_limit) && (
              <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                These entries are over the limit from before. Move what matters to the Business card, then switch the long ones off.
              </div>
            )}
            {otherItems.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="Nothing extra here"
                description="Most things belong on the Business card. Add an entry here only for something that fits nowhere else - keep it short, the AI reads it on every message."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {otherItems.map((item) => (
                  <GlassCard key={item.id} className={`p-5 flex flex-col justify-between ${item.active ? "" : "opacity-60"}`}>
                    <div>
                      <div className="flex items-center justify-between mb-2 gap-2">
                        <span className="text-xs font-bold text-white">{item.title}</span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!item.active && <Badge variant="outline" size="sm">Off</Badge>}
                          {item.valid_until && (
                            <Badge variant={new Date(item.valid_until).getTime() < Date.now() ? "rose" : "amber"} size="sm">
                              {new Date(item.valid_until).getTime() < Date.now() ? "Ended" : "Until"} {new Date(item.valid_until).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                            </Badge>
                          )}
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-os-text-dim">
                            {item.kind}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-white/90 font-mono whitespace-pre-wrap leading-relaxed mb-4">
                        {item.content}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[10px] font-mono text-os-text-dim">
                      <span>{item.token_estimate} Tokens · {item.source}</span>
                      <div className="flex items-center gap-3">
                        <button type="button" onClick={() => openEditModal(item)} className="text-os-text-dim hover:text-white transition-colors cursor-pointer">
                          Edit
                        </button>
                        <button type="button" onClick={() => handleToggleActive(item)} className="text-os-text-dim hover:text-white transition-colors cursor-pointer">
                          {item.active ? "Switch off" : "Switch on"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-os-text-dim hover:text-thread-bright transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </button>
                      </div>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: READ A FILE ONCE INTO THE CARD */}
        {/* Kept mounted on every tab: a read costs an AI call, so its suggestions must survive a look at another tab. */}
        <div className={activeTab === "upload" ? "" : "hidden"}>
          <FileReader key={version} onSaved={loadData} onPending={setFileSuggestionsWaiting} />
        </div>

        {role === "owner" && <ResetKnowledge onDone={() => { setVersion((v) => v + 1); setFileSuggestionsWaiting(false); loadData(); }} />}

        {/* Answer Gap / Create Modal */}
        <Modal
          isOpen={isModalOpen}
          onClose={closeModal}
          title={editingItem ? "Edit Knowledge Entry" : answeringGap ? answeringGap.gap : "Add Knowledge Entry"}
          subtitle="This information will immediately feed the AI agent's reasoning across WhatsApp and Voice."
          maxWidth="lg"
        >
          {answeringGap ? (
            <GapAnswer
              gap={answeringGap}
              onDone={() => {
                setGaps((prev) => prev.filter((g) => g.gap !== answeringGap.gap));
                closeModal();
                loadData();
              }}
            />
          ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
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
                maxLength={OTHER_CHARS_LIMIT}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="State details clearly (e.g. We partner with Hotel Orchid across the street offering 20% discount with promo code MED2026...)"
                className="w-full p-3 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
              />
              <span className="text-[10px] font-mono text-os-text-dim">{newContent.length}/{OTHER_CHARS_LIMIT}</span>
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
                {isSubmitting ? "Saving..." : editingItem ? "Save changes" : "Save"}
              </button>
            </div>
          </form>
          )}
        </Modal>
      </div>
    </AppLayout>
  );
}
