"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import { knowledge, type KnowledgeFaq } from "@/lib/api";

const QUESTION_LIMIT = 150;
const ANSWER_LIMIT = 400;
const input = "w-full p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";

/**
 * The Question bank: more saved answers beyond the top 10. The AI sees one only when a customer asks something like
 * it, so the bank can hold many without adding to every reply.
 */
export function QuestionBank({ onChanged }: { onChanged: () => void }) {
  const [items, setItems] = useState<KnowledgeFaq[] | null>(null);
  const [limit, setLimit] = useState(50);
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = () => knowledge.bank()
    .then((b) => { setItems(b.items); setLimit(b.limit); })
    .catch((e) => setError(e instanceof Error ? e.message : "Could not load the question bank."));
  useEffect(() => { load(); }, []);

  if (!items) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton className="h-40 w-full" />;
  const full = items.length >= limit;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      await knowledge.addToBank({ question: q, answer: a });
      setQ(""); setA("");
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setError(null);
    try {
      await knowledge.delete(id);
      setItems((prev) => (prev ?? []).filter((i) => i.id !== id));
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove.");
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">Question bank</h4>
          <Badge variant={full ? "amber" : "default"} size="sm">{items.length} of {limit}</Badge>
        </div>
        <p className="text-[11px] text-os-text-dim">
          More answers, beyond your top 10 questions. The AI sees an answer here only when a customer asks something like
          it, so you can keep many without making every reply dearer. Write the question the way customers ask it.
        </p>
      </GlassCard>

      {!full && (
        <GlassCard className="p-5">
          <form onSubmit={add} className="space-y-2">
            <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={QUESTION_LIMIT} required
              placeholder="Question, e.g. Do you offer EMI?" className={input} />
            <textarea value={a} onChange={(e) => setA(e.target.value)} maxLength={ANSWER_LIMIT} required rows={3}
              placeholder="Answer" className={input} />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-os-text-dim">{a.length}/{ANSWER_LIMIT}</span>
              <button type="submit" disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> {busy ? "Adding..." : "Add to the bank"}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="space-y-2">
        {items.map((f) => (
          <GlassCard key={f.id} className="p-4 flex items-start justify-between gap-3">
            <div className="min-w-0 text-xs">
              <p className="text-white font-semibold">{f.question}</p>
              <p className="text-os-text-dim whitespace-pre-wrap">{f.answer}</p>
            </div>
            <button type="button" onClick={() => remove(f.id)} className="text-os-text-dim hover:text-thread-bright cursor-pointer shrink-0" aria-label="Remove">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </GlassCard>
        ))}
        {items.length === 0 && <p className="text-xs text-os-text-dim">No saved answers yet. The Gaps tab can add them from real questions.</p>}
      </div>
    </div>
  );
}
