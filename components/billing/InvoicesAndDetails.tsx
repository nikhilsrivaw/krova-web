"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { billing, type BillingDetails, type InvoiceRow } from "@/lib/api";

const inr = (rupees: string | number) =>
  `₹${Number(rupees).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * Who the invoice is made out to. Saved details go on the NEXT invoice; an invoice already issued never changes,
 * so this asks for them before the first payment.
 */
export function BillingDetailsCard() {
  const [details, setDetails] = useState<BillingDetails | null>(null);
  const [form, setForm] = useState({ legal_name: "", address: "", state_code: "", gstin: "" });
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const apply = (d: BillingDetails) => {
    setDetails(d);
    setForm({ legal_name: d.legal_name, address: d.address, state_code: d.state_code, gstin: d.gstin });
  };

  useEffect(() => {
    billing.details().then((d) => { apply(d); setOpen(!d.complete); }).catch(() => setDetails(null));
  }, []);

  if (!details) return null;

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      apply(await billing.saveDetails(form));
      setOpen(false);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const input = "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none";
  const label = "block text-[10px] font-mono uppercase tracking-wide text-os-text-dim mb-1";

  return (
    <GlassCard className="p-5 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-white">Billing details</h2>
          <p className="text-[11px] text-os-text-dim">
            Printed on your GST invoices. {details.complete ? "" : "Add them before your first payment so the invoice is right."}
          </p>
        </div>
        {!open && (
          <button type="button" onClick={() => { setOpen(true); setSaved(false); }} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] text-os-text-dim hover:text-white cursor-pointer">
            Edit
          </button>
        )}
      </div>

      {!open ? (
        <div className="text-xs text-os-text-dim space-y-0.5">
          <p className="text-white font-semibold">{details.legal_name}</p>
          <p>{details.address || "No address yet"}</p>
          <p>{details.state_name ? `${details.state_name} (${details.state_code})` : "No state yet"}{details.gstin ? ` · GSTIN ${details.gstin}` : ""}</p>
          {saved && <p className="text-emerald-300 pt-1">Saved. It will appear on your next invoice.</p>}
        </div>
      ) : (
        <form onSubmit={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="md:col-span-2">
            <label className={label} htmlFor="bd-name">Business name on the invoice</label>
            <input id="bd-name" className={input} required maxLength={200} value={form.legal_name} onChange={(e) => setForm({ ...form, legal_name: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className={label} htmlFor="bd-address">Address</label>
            <textarea id="bd-address" className={input} rows={2} maxLength={400} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="bd-gstin">GSTIN (optional)</label>
            <input id="bd-gstin" className={`${input} font-mono uppercase`} maxLength={15} placeholder="Only if your business is GST registered" value={form.gstin}
              onChange={(e) => setForm({ ...form, gstin: e.target.value.toUpperCase() })} />
          </div>
          <div>
            <label className={label} htmlFor="bd-state">State</label>
            <select id="bd-state" className={input} value={form.gstin.length === 15 ? form.gstin.slice(0, 2) : form.state_code}
              disabled={form.gstin.length === 15} onChange={(e) => setForm({ ...form, state_code: e.target.value })}>
              <option value="">Choose your state</option>
              {details.states.map((s) => (<option key={s.code} value={s.code}>{s.name} ({s.code})</option>))}
            </select>
            {form.gstin.length === 15 && <p className="text-[10px] text-os-text-dim mt-1">Taken from your GSTIN.</p>}
          </div>
          {error && <p className="md:col-span-2 text-xs text-red-400">{error}</p>}
          <div className="md:col-span-2 flex gap-2">
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-teal hover:bg-teal-dim text-os-bg text-xs font-bold cursor-pointer disabled:opacity-50">
              {saving ? "Saving..." : "Save details"}
            </button>
            {details.complete && (
              <button type="button" onClick={() => { apply(details); setOpen(false); setError(null); }} className="px-3 py-2 text-xs text-os-text-dim hover:text-white cursor-pointer">
                Cancel
              </button>
            )}
          </div>
        </form>
      )}
    </GlassCard>
  );
}

/** Every invoice and receipt, with a download button. */
export function InvoicesSection({ refreshKey }: { refreshKey?: unknown }) {
  const [rows, setRows] = useState<InvoiceRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    billing.invoices().then(setRows).catch(() => setRows([]));
  }, []);

  useEffect(() => { load(); }, [load, refreshKey]);

  const download = async (row: InvoiceRow) => {
    setBusy(row.id);
    setError(null);
    try {
      const blob = await billing.downloadInvoice(row.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${row.number.replace(/\//g, "-")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not download.");
    } finally {
      setBusy(null);
    }
  };

  if (rows === null) return null;

  return (
    <section aria-label="Invoices" className="space-y-3">
      <h2 className="text-sm font-bold text-white">Invoices and receipts</h2>
      {error && <p className="text-xs text-red-400">{error}</p>}
      <GlassCard className="divide-y divide-white/[0.05]">
        {rows.length === 0 ? (
          <p className="px-4 py-4 text-xs text-os-text-dim">Your GST invoice appears here after each successful plan payment, and a receipt after each wallet top-up.</p>
        ) : rows.map((r) => (
          <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-3 min-w-0">
              <FileText className="w-4 h-4 text-os-text-dim shrink-0" />
              <div className="min-w-0">
                <p className="text-white truncate">{r.description}</p>
                <p className="text-[10px] text-os-text-dim font-mono">
                  {r.number} · {new Date(r.issued_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <p className="text-white">{inr(r.total)}</p>
                <Badge variant={r.kind === "invoice" ? "emerald" : "default"} size="sm">{r.kind === "invoice" ? "Tax invoice" : "Receipt"}</Badge>
              </div>
              <button
                type="button" disabled={busy === r.id} onClick={() => download(r)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold cursor-pointer disabled:opacity-50"
              >
                <Download className="w-3.5 h-3.5" /> {busy === r.id ? "..." : "Download"}
              </button>
            </div>
          </div>
        ))}
      </GlassCard>
    </section>
  );
}
