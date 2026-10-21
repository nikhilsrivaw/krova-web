"use client";

import React, { useEffect, useState } from "react";
import { Plus, Printer, Search, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/EmptyState";
import { account, knowledge, type FeeRow } from "@/lib/api";

const input = "w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";

// Rows are edited with the amount as typed rupees; saved as whole paise.
type Draft = { id?: string; name: string; rupees: string; details: string };

const toDraft = (r: FeeRow): Draft => ({ id: r.id, name: r.name, rupees: String(r.amount_paise / 100), details: r.details });
const paise = (rupees: string) => Math.round(Number(rupees.replace(/[₹,\s]/g, "").replace(/^rs\.?/i, "")) * 100);
const valid = (d: Draft) => d.name.trim() && paise(d.rupees) >= 100;

const escape = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c] as string);

/**
 * The saved fee list as an A4 rate board to print and put up at reception - clinics and labs are asked to show
 * their charges for each service where patients can see them (Clinical Establishments Rules, rule 9, in the states
 * that adopted the Act). Opens in a new window and asks the browser to print.
 */
async function printRateList(rows: FeeRow[]) {
  const win = window.open("", "_blank");
  if (!win) return;
  let business = "";
  try { business = (await account.profile()).business_name ?? ""; } catch { /* print without the name */ }
  const body = rows.map((r) => `<tr><td>${escape(r.name)}${r.details ? `<div class="d">${escape(r.details)}</div>` : ""}</td>`
    + `<td class="a">₹${(r.amount_paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}</td></tr>`).join("");
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  win.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>Rate list</title><style>
    body{font-family:system-ui,-apple-system,"Segoe UI",sans-serif;margin:32px;color:#111}
    h1{font-size:24px;margin:0}h2{font-size:15px;font-weight:600;color:#444;margin:4px 0 20px}
    table{width:100%;border-collapse:collapse;font-size:14px}th,td{border-bottom:1px solid #ccc;padding:8px 6px;text-align:left;vertical-align:top}
    th{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#555}.a{text-align:right;white-space:nowrap;font-weight:600}
    .d{font-size:11px;color:#666;margin-top:2px}p{font-size:11px;color:#666;margin-top:16px}@page{size:A4;margin:16mm}
  </style></head><body><h1>${escape(business || "Rate list")}</h1><h2>Rate list / शुल्क सूची</h2>
  <table><thead><tr><th>Service</th><th class="a">Charge</th></tr></thead><tbody>${body}</tbody></table>
  <p>Rates as on ${date}.</p></body></html>`);
  win.document.close();
  win.focus();
  win.print();
}

/** "Name - Amount - Details" per line (also tab- or comma-separated, as pasted from a sheet) into rows. */
function parseLines(text: string): Draft[] {
  return text.split("\n").map((line) => {
    const parts = line.includes("\t") ? line.split("\t") : line.includes(" - ") ? line.split(" - ") : line.split(",");
    const [name = "", rupees = "", ...rest] = parts.map((p) => p.trim());
    return { name: name.slice(0, 80), rupees: rupees.replace(/[^\d.]/g, ""), details: rest.join(", ").slice(0, 150) };
  }).filter((r) => r.name);
}

/**
 * Fees / Price list: each test, service or visit and what it costs - a lab's CT scan, X-ray and blood tests. Staff
 * tick from it when making a token or a booking, and the payment link asks for the total. The AI quotes a fee when a
 * customer names it, without reading the whole list.
 */
export function FeeList({ onChanged }: { onChanged: () => void }) {
  const [rows, setRows] = useState<Draft[] | null>(null);
  const [limit, setLimit] = useState(300);
  const [filter, setFilter] = useState("");
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    knowledge.fees()
      .then((f) => { setRows(f.rows.map(toDraft)); setLimit(f.limit); })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load the fee list."));
  }, []);

  if (!rows) return error ? <p className="text-xs text-red-400">{error}</p> : <Skeleton className="h-40 w-full" />;

  const change = (next: Draft[]) => { setRows(next.slice(0, limit)); setDirty(true); setNote(null); };
  const update = (i: number, patch: Partial<Draft>) => change(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const shown = rows.map((r, i) => ({ r, i })).filter(({ r }) => !filter || `${r.name} ${r.details}`.toLowerCase().includes(filter.toLowerCase()));
  const filled = rows.filter((r) => r.name.trim() || r.rupees.trim());
  const broken = filled.filter((r) => !valid(r)).length;

  const save = async () => {
    if (broken) { setError(`${broken} row${broken === 1 ? " needs" : "s need"} a name and an amount of at least ₹1.`); return; }
    setBusy(true); setError(null);
    try {
      const out = await knowledge.saveFees(filled.map((r) => ({ id: r.id, name: r.name.trim(), amount_paise: paise(r.rupees), details: r.details.trim() })));
      setRows(out.rows.map(toDraft)); setDirty(false); setNote(`Saved ${out.rows.length} fees.`);
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
          <h4 className="text-sm font-bold text-white">Fees / Price list</h4>
          <span className="text-[10px] font-mono text-os-text-dim">{rows.length} of {limit} fees</span>
        </div>
        <p className="text-[11px] text-os-text-dim">
          Each test, service or visit with its fee - for example CT scan, X-ray, blood test. When your team makes a token
          or a booking they tick what the person came for, and the payment link asks for the total. The AI also tells
          customers these fees when they ask. A token or booking already made keeps the fee it was made with.
        </p>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-3.5 h-3.5 text-os-text-dim" />
          <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Find a fee" className={input} />
        </div>
        <div className="hidden md:grid grid-cols-[2fr_1fr_2fr_auto] gap-2 text-[10px] font-mono uppercase text-os-text-dim px-1">
          <span>Name</span><span>Fee (₹)</span><span>Details</span><span />
        </div>
        {shown.map(({ r, i }) => (
          <div key={r.id ?? `new-${i}`} className="grid grid-cols-1 md:grid-cols-[2fr_1fr_2fr_auto] gap-2">
            <input value={r.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} placeholder="Name, e.g. CT scan (head)" className={input} />
            <input value={r.rupees} inputMode="decimal" onChange={(e) => update(i, { rupees: e.target.value.replace(/[^\d.]/g, "") })}
              placeholder="2500" aria-label="Fee in rupees"
              className={`${input} ${r.name.trim() && !valid(r) ? "border-red-500/60" : ""}`} />
            <input value={r.details} maxLength={150} onChange={(e) => update(i, { details: e.target.value })} placeholder="Optional: preparation, report time" className={input} />
            <button type="button" onClick={() => change(rows.filter((_, j) => j !== i))}
              className="p-2 text-os-text-dim hover:text-thread-bright cursor-pointer" aria-label="Remove fee">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {rows.length === 0 && <p className="text-xs text-os-text-dim">No fees yet. Add one or paste your rate list below.</p>}
        {rows.length < limit && (
          <button type="button" onClick={() => change([...rows, { name: "", rupees: "", details: "" }])}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs flex items-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add a fee
          </button>
        )}
      </GlassCard>

      <GlassCard className="p-5 space-y-2">
        <span className="text-xs font-bold text-white">Paste a rate list</span>
        <p className="text-[11px] text-os-text-dim">One fee per line: <span className="font-mono">Name - Amount - Details</span>, or copied straight from a spreadsheet.</p>
        <textarea rows={4} value={paste} onChange={(e) => setPaste(e.target.value)} className={`${input} font-mono`}
          placeholder={"CT scan (head) - 2500 - report in 2 hours\nX-ray chest - 400\nCBC - 300 - fasting not needed"} />
        <button type="button" disabled={!paste.trim()} onClick={() => { change([...rows, ...parseLines(paste)]); setPaste(""); }}
          className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold cursor-pointer disabled:opacity-40">
          Add these lines
        </button>
      </GlassCard>

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" disabled={busy || !dirty} onClick={save}
          className="px-5 py-2 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold cursor-pointer disabled:opacity-40">
          {busy ? "Saving..." : "Save fees"}
        </button>
        <button type="button" disabled={dirty || filled.length === 0}
          title={dirty ? "Save first - the printed list is the saved one" : "Print a rate list to put up at reception"}
          onClick={() => printRateList(filled.map((r) => ({ id: r.id, name: r.name.trim(), amount_paise: paise(r.rupees), details: r.details.trim() })))}
          className="px-4 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-40">
          <Printer className="w-3.5 h-3.5" /> Print rate list
        </button>
        {dirty && <span className="text-xs text-amber-300">Unsaved changes</span>}
        {note && <span className="text-xs text-emerald-300">{note}</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
