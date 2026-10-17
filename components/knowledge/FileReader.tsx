"use client";

import React, { useEffect, useRef, useState } from "react";
import { FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { knowledge, type KnowledgeFileReading } from "@/lib/api";

const input = "w-full p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none";

type FieldPick = { key: string; title: string; limit: number; current: string | null; text: string; use: boolean };
type FaqPick = { question: string; answer: string; use: boolean };

/**
 * Read a price list, menu, brochure or FAQ sheet ONCE and fill the Business Card from it. The owner checks every
 * suggestion before it is saved; the file itself is not kept, so the AI never reads the whole file on each message.
 */
export function FileReader({ onSaved, onPending }: { onSaved: () => void; onPending?: (waiting: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<KnowledgeFileReading | null>(null);
  const [fields, setFields] = useState<FieldPick[]>([]);
  const [faqs, setFaqs] = useState<FaqPick[]>([]);
  const [useCatalogue, setUseCatalogue] = useState(true);
  const [catalogueMode, setCatalogueMode] = useState<"add" | "replace">("add");
  const [bank, setBank] = useState<FaqPick[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  // Tell the page while suggestions sit unsaved, and bring them into view when they arrive.
  useEffect(() => {
    onPending?.(!!result);
    if (result) resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [result, onPending]);

  const read = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setReading(true); setError(null); setDone(null); setResult(null);
    try {
      const r = await knowledge.readFile(file);
      setResult(r);
      setFields(r.fields.map((f) => ({ ...f, text: f.suggested, use: !f.current })));
      setFaqs(r.faqs.map((q) => ({ ...q, use: true })));
      setBank((r.bank ?? []).map((q) => ({ ...q, use: true })));
      setUseCatalogue((r.catalogue ?? []).length > 0);
      setCatalogueMode(r.catalogue_now ? "add" : "replace");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not read the file.");
    } finally {
      setReading(false);
    }
  };

  const save = async () => {
    setSaving(true); setError(null);
    let saved = 0;
    const problems: string[] = [];
    for (const f of fields.filter((x) => x.use && x.text.trim())) {
      try { await knowledge.saveCardField(f.key, { content: f.text }); saved++; }
      catch (err) { problems.push(`${f.title}: ${err instanceof Error ? err.message : "not saved"}`); }
    }
    for (const q of faqs.filter((x) => x.use)) {
      try { await knowledge.addFaq({ question: q.question, answer: q.answer }); saved++; }
      catch (err) { problems.push(`${q.question}: ${err instanceof Error ? err.message : "not saved"}`); }
    }
    if (result && useCatalogue && result.catalogue.length) {
      try {
        const current = catalogueMode === "add" ? (await knowledge.catalogue()).rows : [];
        const seen = new Set(current.map((r) => r.name.trim().toLowerCase()));
        const merged = [...current, ...result.catalogue.filter((r) => !seen.has(r.name.trim().toLowerCase()))];
        const out = await knowledge.saveCatalogue(merged);
        saved += Math.max(0, out.rows.length - current.length);
      } catch (err) { problems.push(`Catalogue: ${err instanceof Error ? err.message : "not saved"}`); }
    }
    for (const q of bank.filter((x) => x.use)) {
      try { await knowledge.addToBank({ question: q.question, answer: q.answer }); saved++; }
      catch (err) { problems.push(`${q.question}: ${err instanceof Error ? err.message : "not saved"}`); }
    }
    setSaving(false);
    if (problems.length) setError(problems.join(" · "));
    setDone(`${saved} saved to your knowledge.`);
    setResult(null); setFile(null);
    onSaved();
  };

  const setField = (i: number, patch: Partial<FieldPick>) => setFields((p) => p.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const setFaq = (i: number, patch: Partial<FaqPick>) => setFaqs((p) => p.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const setBankPick = (i: number, patch: Partial<FaqPick>) => setBank((p) => p.map((f, j) => (j === i ? { ...f, ...patch } : f)));
  const rowsFound = result?.catalogue?.length ?? 0;
  const anything = fields.length > 0 || faqs.length > 0 || rowsFound > 0 || bank.length > 0;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <GlassCard className="p-6 space-y-4">
        <div>
          <h4 className="text-sm font-bold text-white mb-1">Fill your card from a file</h4>
          <p className="text-xs text-os-text-dim">
            Upload your price list, menu, brochure or FAQ sheet - a PDF, a photo of it, or a text file. We read it once and
            suggest what goes on your Business card; you check it and save. The file is not kept, so the AI reads only
            your short card on each message, never the whole file.
          </p>
        </div>
        <form onSubmit={read} className="space-y-3">
          <div className="border-2 border-dashed border-white/[0.12] rounded-2xl p-6 text-center bg-black/30 hover:border-brass/50 transition-colors">
            <FileText className="w-7 h-7 mx-auto text-os-text-dim mb-3" />
            <input
              type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.txt,.md,.csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-os-text-dim file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-white/[0.08] file:text-white hover:file:bg-white/[0.12] cursor-pointer"
            />
            <p className="text-[10px] text-os-text-dim mt-2 font-mono">PDF, JPG, PNG, WebP, TXT, MD, CSV · up to 5 MB · 5 files a day</p>
          </div>
          <button type="submit" disabled={!file || reading}
            className="w-full py-2.5 rounded-xl bg-brass hover:bg-brass-dim disabled:opacity-50 text-white text-xs font-bold cursor-pointer">
            {reading ? "Reading..." : "Read it"}
          </button>
          {reading && (
            <p className="text-[11px] text-os-text-dim">Reading your file - this can take up to a minute. Your suggestions will appear below.</p>
          )}
        </form>
        {done && <p className="text-xs text-emerald-300">{done}</p>}
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">{error}</div>
        )}
      </GlassCard>

      {result && (
        <div ref={resultRef}>
        <GlassCard className="p-6 space-y-4 border-brass/30">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-bold text-white">Check before saving</h4>
              <p className="text-[11px] text-os-text-dim">Nothing is on your card yet. Tick what is right, edit it if needed, then press Save at the bottom.</p>
            </div>
            <span className="text-[10px] font-mono text-os-text-dim">{result.reads_left_today} reads left today</span>
          </div>
          {result.truncated && (
            <p className="text-[11px] text-amber-300">The file was long, so only its first part was read.</p>
          )}
          {!anything && (
            <p className="text-xs text-os-text-dim">Nothing in this file answers the card&apos;s questions. Try another file, or type it in.</p>
          )}
          {fields.map((f, i) => (
            <div key={f.key} className="space-y-1.5">
              <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                <input type="checkbox" checked={f.use} onChange={(e) => setField(i, { use: e.target.checked })} />
                {f.title}
                {f.current && <span className="text-[10px] font-normal text-amber-300">replaces what you have</span>}
              </label>
              {f.current && <p className="text-[11px] text-os-text-dim whitespace-pre-wrap">Now: {f.current}</p>}
              <textarea rows={3} value={f.text} maxLength={f.limit} onChange={(e) => setField(i, { text: e.target.value })} className={input} />
              <span className="text-[10px] font-mono text-os-text-dim">{f.text.length}/{f.limit}</span>
            </div>
          ))}
          {faqs.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <span className="text-xs font-bold text-white">Top questions</span>
              {faqs.map((q, i) => (
                <label key={i} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={q.use} onChange={(e) => setFaq(i, { use: e.target.checked })} />
                  <span><span className="text-white font-semibold">{q.question}</span><br /><span className="text-os-text-dim">{q.answer}</span></span>
                </label>
              ))}
            </div>
          )}
          {rowsFound > 0 && result && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <label className="flex items-center gap-2 text-xs font-bold text-white cursor-pointer">
                <input type="checkbox" checked={useCatalogue} onChange={(e) => setUseCatalogue(e.target.checked)} />
                Catalogue: {rowsFound} items found
              </label>
              <p className="text-[11px] text-os-text-dim">
                The AI is shown only the items a customer names, so the whole list costs nothing extra.
              </p>
              {result.catalogue_now > 0 && (
                <div className="flex gap-3 text-[11px] text-os-text-dim">
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={catalogueMode === "add"} onChange={() => setCatalogueMode("add")} />
                    Add to my {result.catalogue_now} items
                  </label>
                  <label className="flex items-center gap-1 cursor-pointer">
                    <input type="radio" checked={catalogueMode === "replace"} onChange={() => setCatalogueMode("replace")} />
                    Replace them
                  </label>
                </div>
              )}
              <div className="max-h-48 overflow-y-auto rounded-lg bg-black/30 border border-white/[0.06] p-2 text-[11px] font-mono text-white/80 space-y-0.5">
                {result.catalogue.map((r, i) => (
                  <div key={i}>{r.name}{r.price ? ` - ${r.price}` : ""}{r.details ? ` (${r.details})` : ""}</div>
                ))}
              </div>
            </div>
          )}
          {bank.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-white/[0.06]">
              <span className="text-xs font-bold text-white">More answers for the question bank</span>
              {bank.map((q, i) => (
                <label key={i} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input type="checkbox" className="mt-0.5" checked={q.use} onChange={(e) => setBankPick(i, { use: e.target.checked })} />
                  <span><span className="text-white font-semibold">{q.question}</span><br /><span className="text-os-text-dim">{q.answer}</span></span>
                </label>
              ))}
            </div>
          )}
          {anything && (
            <button type="button" onClick={save} disabled={saving}
              className="px-5 py-2 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold cursor-pointer disabled:opacity-50">
              {saving ? "Saving..." : "Save the ticked ones"}
            </button>
          )}
        </GlassCard>
        </div>
      )}
    </div>
  );
}
