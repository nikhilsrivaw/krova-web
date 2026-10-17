"use client";

import React, { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/EmptyState";
import { knowledge, type KnowledgeCard, type KnowledgeGap } from "@/lib/api";

const input = "w-full p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";
const TEAM = "team";

/**
 * One gap, four ways out: add the answer to a card field (suggested, owner picks), add it as a top question,
 * "always hand this to me", or dismiss. Nothing here writes long free text the AI would read on every message.
 */
export function GapAnswer({ gap, onDone }: { gap: KnowledgeGap; onDone: () => void }) {
  const [card, setCard] = useState<KnowledgeCard | null>(null);
  const [mode, setMode] = useState<"field" | "faq" | "bank">("field");
  const [fieldKey, setFieldKey] = useState<string>("");
  const [text, setText] = useState("");
  const [question, setQuestion] = useState(gap.example_question?.slice(0, 150) || gap.gap.slice(0, 150));
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    knowledge.card().then((c) => {
      setCard(c);
      const key = gap.suggested_field && (gap.suggested_field === TEAM || c.fields.some((f) => f.key === gap.suggested_field))
        ? gap.suggested_field : c.fields[0]?.key ?? "";
      pick(c, key);
      if (c.faqs.length < c.coverage.faq_limit && !gap.suggested_field) setMode("faq");
    }).catch((e) => setError(e instanceof Error ? e.message : "Could not load the card."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gap.gap]);

  // Start from what the field already says, so the owner adds to it instead of replacing it.
  const pick = (c: KnowledgeCard, key: string) => {
    setFieldKey(key);
    setText(key === TEAM ? c.team.contact : c.fields.find((f) => f.key === key)?.value ?? "");
  };

  const field = card?.fields.find((f) => f.key === fieldKey);
  const limit = fieldKey === TEAM ? 250 : field?.limit ?? 300;
  const faqFull = !!card && card.faqs.length >= card.coverage.faq_limit;

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!card) return;
    if (mode === "faq") {
      run(() => knowledge.addFaq({ question, answer, resolves_gap: gap.gap }));
    } else if (mode === "bank") {
      run(() => knowledge.addToBank({ question, answer, resolves_gap: gap.gap }));
    } else if (fieldKey === TEAM) {
      run(() => knowledge.saveTeamCard({ ...card.team, contact: text, resolves_gap: gap.gap }));
    } else {
      run(() => knowledge.saveCardField(fieldKey, { content: text, resolves_gap: gap.gap, valid_until: field?.valid_until ?? undefined }));
    }
  };

  if (!card) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton className="h-40 w-full" />;

  return (
    <form onSubmit={save} className="space-y-4">
      {gap.example_question && (
        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
          <span className="text-[10px] uppercase font-mono block mb-0.5">A customer asked</span>
          "{gap.example_question}"
        </div>
      )}

      <div className="flex gap-2">
        {([["field", "Add to the business card"], ["faq", "Add as a top question"], ["bank", "Add to the question bank"]] as const).map(([m, label]) => (
          <button key={m} type="button" onClick={() => setMode(m)} disabled={m === "faq" && faqFull}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-40 ${
              mode === m ? "bg-white/[0.1] text-white border border-white/[0.12]" : "text-os-text-dim hover:text-white"}`}>
            {label}
          </button>
        ))}
      </div>

      {mode === "field" ? (
        <div className="space-y-2">
          <select value={fieldKey} onChange={(e) => pick(card, e.target.value)} className={input}>
            {card.fields.filter((f) => !f.link).map((f) => (
              <option key={f.key} value={f.key}>{f.title}{f.key === gap.suggested_field ? " (suggested)" : ""}</option>
            ))}
            <option value={TEAM}>Team card: how to reach us{gap.suggested_field === TEAM ? " (suggested)" : ""}</option>
          </select>
          <p className="text-[11px] text-os-text-dim">
            {fieldKey === TEAM ? "Who and how customers can reach you. Edit the people on the Team tab." : field?.question}
            {" "}Add the answer to what is already there.
          </p>
          <textarea rows={5} required value={text} maxLength={limit} onChange={(e) => setText(e.target.value)} className={`${input} font-mono`} />
          <span className={`text-[10px] font-mono ${text.length > limit * 0.9 ? "text-amber-300" : "text-os-text-dim"}`}>{text.length}/{limit}</span>
        </div>
      ) : (
        <div className="space-y-2">
          <input value={question} onChange={(e) => setQuestion(e.target.value)} maxLength={150} required className={input} />
          <textarea rows={3} value={answer} onChange={(e) => setAnswer(e.target.value)} maxLength={mode === "bank" ? 400 : 250} required placeholder="Short answer" className={input} />
          <span className="text-[10px] font-mono text-os-text-dim">
            {mode === "bank"
              ? `${answer.length}/400 · shown to the AI only when a customer asks something like this`
              : `${answer.length}/250 · ${card.faqs.length} of ${card.coverage.faq_limit} top questions used`}
          </span>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <button type="button" disabled={busy} onClick={() => run(() => knowledge.handoverGap(gap.gap))}
            className="text-xs text-os-text-dim hover:text-white cursor-pointer" title="The AI will pass this kind of question to a person from now on">
            Always hand this to me
          </button>
          <button type="button" disabled={busy} onClick={() => run(() => knowledge.dismissGap(gap.gap))}
            className="text-xs text-os-text-dim hover:text-white cursor-pointer" title="Not a real gap, or already covered">
            Dismiss
          </button>
        </div>
        <button type="submit" disabled={busy}
          className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim cursor-pointer disabled:opacity-50">
          {busy ? "Saving..." : "Save & close gap"}
        </button>
      </div>
    </form>
  );
}
