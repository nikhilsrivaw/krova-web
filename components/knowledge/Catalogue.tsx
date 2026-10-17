"use client";

import React, { useEffect, useState } from "react";
import { Plus, Search, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/EmptyState";
import { knowledge, type KnowledgeCatalogueRow } from "@/lib/api";

const input = "w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";
const blank: KnowledgeCatalogueRow = { name: "", price: "", details: "" };

/** "Name - price - details" per line (also tab- or comma-separated, as pasted from a sheet) into rows. */
function parseLines(text: string): KnowledgeCatalogueRow[] {
  return text.split("\n").map((line) => {
    const parts = line.includes("\t") ? line.split("\t") : line.includes(" - ") ? line.split(" - ") : line.split(",");
    const [name = "", price = "", ...rest] = parts.map((p) => p.trim());
    return { name: name.slice(0, 80), price: price.slice(0, 40), details: rest.join(", ").slice(0, 150) };
  }).filter((r) => r.name);
}

/**
 * The Catalogue: every product, service, plan or dish with its price. The AI never reads it whole - only the rows a
 * customer's message names are shown to it - so it can be long without making every reply dearer.
 */
export function Catalogue({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<KnowledgeCatalogueRow[] | null>(null);
  const [limit, setLimit] = useState(300);
  const [filter, setFilter] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    knowledge.catalogue()
      .then((c) => { setRows(c.rows); setLimit(c.limit); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the catalogue."));
  }, []);

  if (!rows) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton className="h-40 w-full" />;

  const change = (next: KnowledgeCatalogueRow[]) => { setRows(next.slice(0, limit)); setDirty(true); setNote(null); };
  const update = (i: number, patch: Partial<KnowledgeCatalogueRow>) => change(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => !filter || `${r.name} ${r.details}`.toLowerCase().includes(filter.toLowerCase()));

  const save = async () => {
    setBusy(true); setError(null);
    try {
      const out = await knowledge.saveCatalogue(rows.filter((r) => r.name.trim()));
      setRows(out.rows); setDirty(false); setNote(`Saved ${out.rows.length} items.`);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <GlassCard className="p-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-bold text-white">Catalogue</h4>
          <span className="text-[10px] font-mono text-os-text-dim">{rows.length} of {limit} items</span>
        </div>
        <p className="text-[11px] text-os-text-dim">
          Every product, service, plan or dish with its price. The AI does not read this whole list on each message - when a
          customer names something, only those few items are shown to it. So list everything; it costs nothing extra.
          The &quot;Fill from a file&quot; tab can fill this from your price list.
        </p>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-os-text-dim" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find an item" className={input} />
        </div>
        <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_auto] gap-2 text-[10px] font-mono uppercase text-os-text-dim px-1">
          <span>Name</span><span>Price</span><span>Details</span><span />
        </div>
        {shown.map(({ r, i }) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-2">
            <input value={r.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} placeholder="Name" className={input} />
            <input value={r.price} maxLength={40} onChange={(e) => update(i, { price: e.target.value })} placeholder="Rs ... per ..." className={input} />
            <input value={r.details} maxLength={150} onChange={(e) => update(i, { details: e.target.value })} placeholder="Size, variant, what is included" className={input} />
            <button type="button" onClick={() => change(rows.filter((_, j) => j !== i))}
              className="p-2 text-os-text-dim hover:text-thread-bright cursor-pointer" aria-label="Remove item">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-os-text-dim">No items yet. Add one, paste a list below, or fill it from a file.</p>}
        {rows.length < limit && (
          <button type="button" onClick={() => change([...rows, { ...blank }])}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs flex items-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add an item
          </button>
        )}
      </GlassCard>

      <GlassCard className="p-5 space-y-2">
        <span className="text-xs font-bold text-white">Paste a list</span>
        <p className="text-[11px] text-os-text-dim">One item per line: <span className="font-mono">Name - Price - Details</span>, or copied straight from a spreadsheet.</p>
        <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} className={`${input} font-mono`}
          placeholder={"Cotton shirt - Rs 899 - sizes S to XXL\nDenim jeans - Rs 1,999 - slim fit"} />
        <button type="button" disabled={!paste.trim()} onClick={() => { change([...rows, ...parseLines(paste)]); setPaste(""); }}
          className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold cursor-pointer disabled:opacity-40">
          Add these lines
        </button>
      </GlassCard>

      <div className="flex items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="px-5 py-2 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold cursor-pointer disabled:opacity-40">
          {busy ? "Saving..." : "Save catalogue"}
        </button>
        {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
        {note && <span className="text-xs text-emerald-300">{note}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
