"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Check, Copy, Minus, Plus, Search, ShoppingBag } from "lucide-react";
import {
  orders, products as productsApi, templates as templatesApi,
  type Order, type PaymentLink, type Product, type ProductVariant,
} from "@/lib/api";
import { useRole } from "@/lib/useRole";

const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const PLAIN = new Set(["default title", "default"]);
const lineName = (p: Product, v: ProductVariant) =>
  v.title && !PLAIN.has(v.title.trim().toLowerCase()) && v.title.trim() !== p.title ? `${p.title} - ${v.title}` : p.title;

type Line = { variant: ProductVariant; name: string; quantity: number };

/**
 * Take an order in a chat: find products from the Catalogue page, set how many, and either send a payment link for
 * the total or take it as cash on delivery. Prices are the product list's - the server prices the order, the total
 * here is only a preview. Without permission to take payments (Team page), only COD is offered.
 */
export function ChatOrder({ customerId, onDone, onClose }: {
  customerId: string; onDone?: (order: Order) => void; onClose?: () => void;
}) {
  const { allowed, ready } = useRole();
  const [list, setList] = useState<Product[] | null>(null);
  const [find, setFind] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [payment, setPayment] = useState<"link" | "cod">("link");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [needsTemplate, setNeedsTemplate] = useState(false);
  const [templateNames, setTemplateNames] = useState<string[]>([]);
  const [template, setTemplate] = useState("");
  const [done, setDone] = useState<{ order: Order; link: PaymentLink | null; sent: boolean; reason: string | null } | null>(null);
  const [copied, setCopied] = useState(false);

  // Search on the server as they type (the list can be long), with a short pause between keystrokes.
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => {
      productsApi.list({ search: find.trim() || undefined, limit: 50 })
        .then((rows) => { if (live) setList(rows); })
        .catch((e) => { if (live) { setList([]); setError(e instanceof Error ? e.message : "Could not load products."); } });
    }, find ? 250 : 0);
    return () => { live = false; clearTimeout(t); };
  }, [find]);

  useEffect(() => { if (ready && !allowed.take_payments) setPayment("cod"); }, [ready, allowed.take_payments]);

  useEffect(() => {
    if (!needsTemplate) return;
    templatesApi.list().then((all) => {
      const names = all.filter((t) => t.status === "approved").map((t) => t.name);
      setTemplateNames(names);
      if (names.length) setTemplate(names[0]);
    }).catch(() => setTemplateNames([]));
  }, [needsTemplate]);

  const total = useMemo(() => lines.reduce((sum, l) => sum + (l.variant.price_paise ?? 0) * l.quantity, 0), [lines]);
  const qty = (id: string) => lines.find((l) => l.variant.id === id)?.quantity ?? 0;
  const setQty = (p: Product, v: ProductVariant, n: number) => {
    setLines((prev) => {
      const rest = prev.filter((l) => l.variant.id !== v.id);
      if (n <= 0) return rest;
      const existing = prev.find((l) => l.variant.id === v.id);
      const line = { variant: v, name: lineName(p, v), quantity: Math.min(n, 99) };
      return existing ? prev.map((l) => (l.variant.id === v.id ? line : l)) : [...prev, line];
    });
  };

  const submit = async () => {
    setBusy(true); setError(null);
    try {
      const out = await orders.takeInChat({
        customer_id: customerId, payment, note: note.trim() || undefined,
        lines: lines.map((l) => ({ variant_id: l.variant.id, quantity: l.quantity })),
        ...(needsTemplate && template ? { template_name: template } : {}),
      });
      setDone(out);
      onDone?.(out.order);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not take this order.";
      if (message.includes("24 hours")) setNeedsTemplate(true);
      setError(message);
    } finally {
      setBusy(false);
    }
  };

  const copy = async (url: string) => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* clipboard blocked */ }
  };

  if (done) {
    const { order, link, sent, reason } = done;
    return (
      <div className="space-y-3 text-xs">
        <div className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-3 space-y-1">
          <p className="text-sm font-semibold text-emerald-200">Order {order.order_number} · {rupees(order.total_paise ?? 0)}</p>
          <p className="text-emerald-100/80">
            {order.is_cod
              ? `Cash on delivery - it is on the Orders page as confirmed.${sent ? " The order summary went to the customer on WhatsApp." : ""}`
              : sent ? "Payment link sent on WhatsApp with the order summary. The order turns paid by itself once Razorpay confirms." : "Order made."}
          </p>
        </div>
        {link && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-os-text-dim truncate max-w-[220px]">{link.short_url}</span>
            <button type="button" onClick={() => copy(link.short_url)} className="text-os-text-dim hover:text-white flex items-center gap-1 cursor-pointer">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
        {link && !sent && reason && <p className="text-[11px] text-amber-300">Not sent on WhatsApp: {reason} Copy the link and share it.</p>}
        {order.is_cod && !sent && reason && <p className="text-[11px] text-amber-300">Summary not sent: {reason}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={() => { setDone(null); setLines([]); setNote(""); setNeedsTemplate(false); }}
            className="px-3 py-2 rounded-lg bg-white/[0.06] text-white font-semibold cursor-pointer">New order</button>
          {onClose && <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg text-os-text-dim hover:text-white cursor-pointer">Close</button>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center gap-2 px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.12]">
        <Search className="w-3.5 h-3.5 text-os-text-dim" aria-hidden="true" />
        <input value={find} onChange={(e) => setFind(e.target.value)} placeholder="Find a product"
          className="flex-1 bg-transparent text-xs text-white placeholder:text-os-text-dim focus:outline-none" />
      </div>

      <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
        {list === null && <div className="h-12 rounded-lg bg-white/[0.04] animate-pulse" />}
        {list?.length === 0 && (
          <p className="text-[11px] text-os-text-dim py-2">
            {find ? "Nothing matches." : "No products yet. Add them on the Catalogue page (or sync your Shopify / Meta catalogue)."}
          </p>
        )}
        {list?.flatMap((p) => p.variants.map((v) => {
          const n = qty(v.id);
          const priced = v.price_paise != null && v.price_paise > 0;
          const off = v.available === false;
          return (
            <div key={v.id} className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 ${n ? "border-teal/40 bg-teal/[0.08]" : "border-white/[0.08] bg-white/[0.02]"}`}>
              <div className="min-w-0 flex-1">
                <p className="text-white truncate">{lineName(p, v)}</p>
                <p className="text-[10px] text-os-text-dim">
                  {priced ? rupees(v.price_paise as number) : "No price set"}{off ? " · unavailable" : ""}{v.sku ? ` · ${v.sku}` : ""}
                </p>
              </div>
              {priced && !off && (n ? (
                <div className="flex items-center gap-1">
                  <button type="button" aria-label="One less" onClick={() => setQty(p, v, n - 1)} className="p-1.5 rounded-md bg-white/[0.06] text-white cursor-pointer"><Minus className="w-3 h-3" /></button>
                  <span className="w-6 text-center text-white font-semibold">{n}</span>
                  <button type="button" aria-label="One more" onClick={() => setQty(p, v, n + 1)} className="p-1.5 rounded-md bg-white/[0.06] text-white cursor-pointer"><Plus className="w-3 h-3" /></button>
                </div>
              ) : (
                <button type="button" onClick={() => setQty(p, v, 1)} className="px-2.5 py-1.5 rounded-md bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold cursor-pointer">Add</button>
              ))}
            </div>
          );
        }))}
      </div>

      {lines.length > 0 && (
        <div className="rounded-xl border border-white/[0.1] bg-black/30 p-3 space-y-2">
          {lines.map((l) => (
            <div key={l.variant.id} className="flex items-center justify-between gap-2">
              <span className="text-white/90 truncate">{l.quantity} × {l.name}</span>
              <span className="text-os-text-dim shrink-0">{rupees((l.variant.price_paise ?? 0) * l.quantity)}</span>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-white/[0.08] pt-2">
            <span className="font-semibold text-white">Total</span>
            <span className="font-bold text-teal-bright">{rupees(total)}</span>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {allowed.take_payments && (
          <button type="button" onClick={() => setPayment("link")} aria-pressed={payment === "link"}
            className={`py-2 rounded-lg border font-semibold cursor-pointer ${payment === "link" ? "border-teal/40 bg-teal/15 text-teal-bright" : "border-white/[0.1] text-os-text-dim"}`}>
            Send payment link
          </button>
        )}
        <button type="button" onClick={() => setPayment("cod")} aria-pressed={payment === "cod"}
          className={`py-2 rounded-lg border font-semibold cursor-pointer ${payment === "cod" ? "border-teal/40 bg-teal/15 text-teal-bright" : "border-white/[0.1] text-os-text-dim"} ${allowed.take_payments ? "" : "col-span-2"}`}>
          Cash on delivery
        </button>
      </div>
      <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={500} placeholder="Note (optional) - size, address, gift wrap"
        className="w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:outline-none" />

      {needsTemplate && payment === "link" && (
        <div className="space-y-1">
          {templateNames.length ? (
            <select value={template} onChange={(e) => setTemplate(e.target.value)}
              className="w-full px-2.5 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white">
              {templateNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          ) : <p className="text-[11px] text-amber-300">No approved template yet.</p>}
          <p className="text-[11px] text-os-text-dim">Pick an approved template whose two variables are the amount and the link.</p>
        </div>
      )}
      {error && <p className="text-[11px] text-rose-400">{error}</p>}

      <button type="button" onClick={submit} disabled={busy || lines.length === 0 || (needsTemplate && payment === "link" && !template)}
        className="w-full py-2.5 rounded-lg bg-teal text-[#04110e] font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40">
        <ShoppingBag className="w-3.5 h-3.5" />
        {busy ? "Placing…" : lines.length === 0 ? "Add products first" : payment === "link" ? `Place order & send link · ${rupees(total)}` : `Place COD order · ${rupees(total)}`}
      </button>
    </div>
  );
}
