"use client";

import React, { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import { knowledge, type KnowledgeCard, type KnowledgeCardField } from "@/lib/api";

const FAQ_QUESTION_LIMIT = 150;
const FAQ_ANSWER_LIMIT = 250;
const input = "w-full p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";

function FieldCard({ field, onSaved }: { field: KnowledgeCardField; onSaved: () => void }) {
  const [text, setText] = useState(field.value ?? "");
  const [until, setUntil] = useState(field.valid_until ? field.valid_until.slice(0, 10) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answered = !!field.value?.trim();
  const changed = text.trim() !== (field.value ?? "").trim() || until !== (field.valid_until ? field.valid_until.slice(0, 10) : "");
  const expired = !!field.valid_until && new Date(field.valid_until).getTime() < Date.now();

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      await knowledge.saveCardField(field.key, {
        content: text,
        valid_until: field.expires && until ? new Date(`${until}T23:59:59`).toISOString() : undefined,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <GlassCard className="p-4 space-y-2">
      <div className="flex items-center gap-2">
        {answered ? <CheckCircle2 className="w-4 h-4 text-emerald-300 shrink-0" /> : <Circle className="w-4 h-4 text-os-text-dim shrink-0" />}
        <span className="text-xs font-bold text-white">{field.title}</span>
        {field.required && !answered && <Badge variant="amber" size="sm">Needed</Badge>}
        {expired && <Badge variant="rose" size="sm">Ended</Badge>}
      </div>
      <p className="text-[11px] text-os-text-dim">{field.question}</p>
      {field.link ? (
        <input type="url" value={text} onChange={(e) => setText(e.target.value)} placeholder={field.placeholder} className={input} />
      ) : (
        <textarea
          rows={field.limit > 500 ? 5 : 3} value={text} maxLength={field.limit} onChange={(e) => setText(e.target.value)}
          placeholder={`Example: ${field.placeholder}`} className={`${input} font-mono`}
        />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!field.link && (
          <span className={`text-[10px] font-mono ${text.length > field.limit * 0.9 ? "text-amber-300" : "text-os-text-dim"}`}>
            {text.length}/{field.limit}
          </span>
        )}
        {field.expires && (
          <label className="flex items-center gap-1.5 text-[11px] text-os-text-dim">
            Use until
            <input type="date" value={until} onChange={(e) => setUntil(e.target.value)}
              className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
          </label>
        )}
        <div className="ml-auto flex items-center gap-2">
          {answered && (
            <button type="button" disabled={busy} onClick={() => { setText(""); }}
              className="text-[11px] text-os-text-dim hover:text-white cursor-pointer">Clear</button>
          )}
          <button
            type="button" disabled={busy || !changed} onClick={save}
            className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold cursor-pointer disabled:opacity-40"
          >
            {busy ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </GlassCard>
  );
}

function TopQuestions({ card, onSaved }: { card: KnowledgeCard; onSaved: () => void }) {
  const [q, setQ] = useState("");
  const [a, setA] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const full = card.faqs.length >= card.coverage.faq_limit;

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await knowledge.addFaq({ question: q, answer: a });
      setQ(""); setA("");
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await knowledge.delete(id);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove.");
    }
  };

  return (
    <GlassCard className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-white">Top questions</span>
        <Badge variant={full ? "amber" : "default"} size="sm">{card.faqs.length} of {card.coverage.faq_limit}</Badge>
      </div>
      <p className="text-[11px] text-os-text-dim">
        Short answers to the questions your customers ask most. The Gaps tab fills this from real chats; keep the best {card.coverage.faq_limit}.
      </p>
      {card.faqs.map((f) => (
        <div key={f.id} className="flex items-start justify-between gap-3 p-3 rounded-lg bg-black/30 border border-white/[0.06]">
          <div className="min-w-0 text-xs">
            <p className="text-white font-semibold">{f.question}</p>
            <p className="text-os-text-dim">{f.answer}</p>
          </div>
          <button type="button" onClick={() => remove(f.id)} className="text-os-text-dim hover:text-thread-bright cursor-pointer shrink-0" aria-label="Remove">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {!full && (
        <form onSubmit={add} className="space-y-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} maxLength={FAQ_QUESTION_LIMIT} required placeholder="Question, e.g. Do you have parking?" className={input} />
          <textarea value={a} onChange={(e) => setA(e.target.value)} maxLength={FAQ_ANSWER_LIMIT} required rows={2} placeholder="Short answer" className={input} />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-os-text-dim">{a.length}/{FAQ_ANSWER_LIMIT}</span>
            <button type="submit" disabled={busy} className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50">
              <Plus className="w-3.5 h-3.5" /> {busy ? "Adding..." : "Add question"}
            </button>
          </div>
        </form>
      )}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </GlassCard>
  );
}

/** The Business Card: ten short fields every type shares, worded for this business's type, plus the top questions. */
export function BusinessCard({ onChanged }: { onChanged: () => void }) {
  const [card, setCard] = useState<KnowledgeCard | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    knowledge.card().then(setCard).catch((e) => setError(e instanceof Error ? e.message : "Could not load the card."));
  }, []);
  useEffect(() => { load(); }, [load]);

  if (error) return <p className="text-xs text-red-400">{error}</p>;
  if (!card) return <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-16 w-full" /></div>;

  const { coverage } = card;
  const pct = coverage.required_total ? Math.round((coverage.required_done / coverage.required_total) * 100) : 100;
  const refresh = () => { load(); onChanged(); };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 space-y-3 border-teal/20">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-white">Business card</h4>
            <p className="text-[11px] text-os-text-dim">
              Only what customers ask again and again ({card.vertical_label}). Short on purpose: the AI reads it before every reply.
              Put long lists behind the link field.
            </p>
          </div>
          <Badge variant={pct === 100 ? "emerald" : "amber"}>{coverage.required_done} of {coverage.required_total} needed filled</Badge>
        </div>
        <div className="h-2 rounded-full bg-white/[0.08] overflow-hidden">
          <div className={`h-full rounded-full ${pct === 100 ? "bg-emerald-400" : "bg-brass"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-os-text-dim font-mono">The AI reads about {card.tokens} tokens of your cards on each message.</p>
      </GlassCard>
      {card.fields.map((f) => (
        <FieldCard key={f.key + (f.item_id ?? "") + (f.value ?? "")} field={f} onSaved={refresh} />
      ))}
      <TopQuestions card={card} onSaved={refresh} />
    </div>
  );
}
