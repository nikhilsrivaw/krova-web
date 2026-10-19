"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { ledger, type CustomerSummary } from "@/lib/api";

/** Find a customer by name or phone (searched on the server, so anyone - not only recent ones) and pick one. */
export function CustomerPicker({
  value, onChange, optional = false,
}: {
  value: { id: string; name: string } | null;
  onChange: (c: { id: string; name: string } | null) => void;
  // A walk-in can be checked in with no customer at all.
  optional?: boolean;
}) {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<CustomerSummary[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setRows([]); return; }
    let live = true;
    const t = setTimeout(() => {
      ledger.customers({ q: term, limit: 8 }).then((r) => { if (live) setRows(r); }).catch(() => {});
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);

  if (value) {
    return (
      <div className="flex items-center justify-between px-3 py-2.5 rounded-xl bg-teal/[0.08] border border-teal/25">
        <span className="text-sm text-os-ink truncate">{value.name}</span>
        <button type="button" onClick={() => onChange(null)} className="text-[11px] text-os-text-dim">Change</button>
      </div>
    );
  }
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-black/40 border border-os-border">
        <Search className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={optional ? "Customer name or phone (optional)" : "Customer name or phone"}
          className="w-full bg-transparent text-sm text-os-ink placeholder:text-os-text-dim outline-none"
        />
      </div>
      {rows.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => { onChange({ id: c.id, name: c.name || c.identities[0]?.value || "Customer" }); setQ(""); }}
          className="w-full text-left px-3 py-2 rounded-lg bg-black/20 border border-os-border text-xs text-os-ink"
        >
          {c.name || "Unnamed"} <span className="text-os-text-dim">{c.identities.find((i) => i.kind === "phone")?.value ?? ""}</span>
        </button>
      ))}
      {q.trim().length >= 2 && rows.length === 0 && (
        <p className="text-[11px] text-os-text-dim">No one matches. Add them from Customers first.</p>
      )}
    </div>
  );
}
