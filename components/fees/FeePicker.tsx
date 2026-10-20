"use client";

import React, { useEffect, useState } from "react";
import { Check, Pencil, Search } from "lucide-react";
import { feeTotal, knowledge, queue, scheduling, type FeeItem, type FeeRow } from "@/lib/api";

export const formatRupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

/**
 * The fee list (Knowledge -> Fees / Price list), for ticking tests on a token or a booking. Loaded once per page.
 * Null while loading; an empty list when the business keeps none - the picker then shows nothing at all.
 */
export function useFeeRows(): FeeRow[] | null {
  const [rows, setRows] = useState<FeeRow[] | null>(null);
  useEffect(() => {
    let live = true;
    knowledge.fees().then((f) => { if (live) setRows(f.rows); }).catch(() => { if (live) setRows([]); });
    return () => { live = false; };
  }, []);
  return rows;
}

/** Tick what the person came for. The total is what the payment link will ask for. */
export function FeePicker({ rows, value, onChange, label = "What for (from your fee list)" }: {
  rows: FeeRow[] | null; value: string[]; onChange: (ids: string[]) => void; label?: string;
}) {
  const [find, setFind] = useState("");
  if (!rows || rows.length === 0) return null;
  const picked = rows.filter((r) => r.id && value.includes(r.id));
  const total = picked.reduce((sum, r) => sum + r.amount_paise, 0);
  const shown = rows.filter((r) => !find || r.name.toLowerCase().includes(find.toLowerCase()) || value.includes(r.id ?? ""));
  const toggle = (id: string) => onChange(value.includes(id) ? value.filter((v) => v !== id) : [...value, id]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-white/80">{label}</p>
        {picked.length > 0 && (
          <p className="text-[11px] text-teal-bright font-semibold">{picked.length} · {formatRupees(total)}</p>
        )}
      </div>
      {rows.length > 8 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12]">
          <Search className="w-3.5 h-3.5 text-os-text-dim" aria-hidden="true" />
          <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a test or service"
            className="flex-1 bg-transparent text-xs text-white placeholder:text-os-text-dim focus:outline-none" />
        </div>
      )}
      <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
        {shown.map((r) => {
          const on = value.includes(r.id ?? "");
          return (
            <button key={r.id} type="button" onClick={() => r.id && toggle(r.id)} aria-pressed={on}
              className={`px-2.5 py-1.5 rounded-lg border text-[11px] flex items-center gap-1 cursor-pointer ${
                on ? "bg-teal/15 border-teal/40 text-teal-bright" : "bg-white/[0.04] border-white/[0.1] text-white/80 hover:bg-white/[0.08]"
              }`}>
              {on && <Check className="w-3 h-3" aria-hidden="true" />}
              {r.name} <span className="opacity-70">{formatRupees(r.amount_paise)}</span>
            </button>
          );
        })}
        {shown.length === 0 && <p className="text-[11px] text-os-text-dim">Nothing matches.</p>}
      </div>
    </div>
  );
}

/** "CT scan + X-ray · ₹2,900" under a token or booking. */
export function FeeItemsLine({ items, className = "" }: { items?: FeeItem[] | null; className?: string }) {
  if (!items || items.length === 0) return null;
  return (
    <p className={`text-[10px] text-teal-bright ${className}`}>
      {items.map((i) => i.name).join(" + ")} · {formatRupees(feeTotal(items))}
    </p>
  );
}

/**
 * What a token or booking is for, with an Edit that ticks from the fee list again. The server refuses once a payment
 * link for it has gone out, and says so.
 */
export function EditFees<T extends { id: string; fee_items?: FeeItem[] }>({ kind, booking, rows, onSaved }: {
  kind: "token" | "appointment"; booking: T; rows: FeeRow[] | null; onSaved: (updated: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ids, setIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!rows || rows.length === 0) return <FeeItemsLine items={booking.fee_items} />;

  const start = () => { setIds((booking.fee_items ?? []).map((i) => i.id)); setError(null); setOpen(true); };
  const save = async () => {
    setBusy(true); setError(null);
    try {
      const updated = kind === "token" ? await queue.setFees(booking.id, ids) : await scheduling.setFees(booking.id, ids);
      onSaved({ ...booking, fee_items: updated.fee_items ?? [] });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the tests.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <div className="flex items-center gap-2">
        <FeeItemsLine items={booking.fee_items} />
        <button type="button" onClick={start}
          className="text-[10px] text-os-text-dim hover:text-white flex items-center gap-1 cursor-pointer">
          <Pencil className="w-3 h-3" aria-hidden="true" /> {booking.fee_items?.length ? "Change" : "Add tests"}
        </button>
      </div>
    );
  }
  return (
    <div className="w-full space-y-2 rounded-xl border border-white/[0.1] bg-black/30 p-3">
      <FeePicker rows={rows} value={ids} onChange={setIds} />
      {error && <p className="text-[11px] text-rose-400">{error}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={busy} onClick={save}
          className="px-3 py-1.5 rounded-lg bg-teal/20 border border-teal/40 text-teal-bright text-[11px] font-semibold cursor-pointer disabled:opacity-40">
          {busy ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-3 py-1.5 rounded-lg text-[11px] text-os-text-dim hover:text-white cursor-pointer">
          Cancel
        </button>
      </div>
    </div>
  );
}
