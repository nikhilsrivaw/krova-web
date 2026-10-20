"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Package, Search } from "lucide-react";
import { formatPaise, orderTakesLink, orders, type Order, type OrderStatus } from "@/lib/api";
import { PaymentLinkButton } from "@/components/payments/PaymentLinkButton";
import { appPath } from "@/lib/app-nav";

const STATUS: Record<OrderStatus, string> = {
  pending: "Pending", paid: "Paid", fulfilled: "Shipped", out_for_delivery: "Out for delivery", delivered: "Delivered",
  cancelled: "Cancelled", return_requested: "Return requested", refunded: "Refunded",
};
const FILTERS: (OrderStatus | "")[] = ["", "pending", "paid", "fulfilled", "delivered", "return_requested"];

/**
 * Orders from the connected store on the phone: find one by number, see its state (COD confirmed or declined,
 * missed delivery), change the status, open the customer's chat.
 */
export default function AppOrdersPage() {
  const [rows, setRows] = useState<Order[] | null>(null);
  const [status, setStatus] = useState<OrderStatus | "">("");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRows(null);
    orders.list({ status: status || undefined, limit: 100 })
      .then(setRows)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load orders."));
  }, [status]);

  const term = q.trim().toLowerCase().replace(/^#/, "");
  const shown = (rows ?? []).filter((o) => !term || (o.order_number || "").toLowerCase().includes(term) || (o.tracking_number || "").toLowerCase().includes(term));

  const setOrderStatus = async (o: Order, next: OrderStatus) => {
    setBusy(o.id); setError(null);
    try {
      const updated = await orders.update(o.id, { status: next });
      setRows((prev) => prev?.map((x) => (x.id === o.id ? updated : x)) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change the status.");
    } finally { setBusy(null); }
  };

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><Package className="w-4 h-4 text-teal" /> Orders</h1>
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-os-card border border-os-border">
        <Search className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Order or tracking number"
          className="w-full bg-transparent text-xs text-os-ink placeholder:text-os-text-dim outline-none" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f || "all"} type="button" onClick={() => setStatus(f)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold border ${status === f ? "bg-teal/15 border-teal/30 text-teal" : "bg-os-card border-os-border text-os-text-dim"}`}>
            {f ? STATUS[f] : "All"}
          </button>
        ))}
      </div>

      {error && <p className="text-xs text-rose-400">{error}</p>}
      {rows === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-os-card animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-10">No orders here.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((o) => {
            const isOpen = open === o.id;
            const cod = o.is_cod ? (o.cod_confirmed_at ? "COD confirmed" : o.cod_declined_at ? "COD declined" : "COD - not confirmed") : null;
            return (
              <div key={o.id} className="rounded-2xl bg-os-card border border-os-border overflow-hidden">
                <button type="button" onClick={() => setOpen(isOpen ? null : o.id)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-os-ink">#{o.order_number || o.id.slice(0, 6)}</p>
                    <p className="text-[10px] text-os-text-dim truncate">
                      {new Date(o.placed_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                      {cod ? ` · ${cod}` : ""}{o.ndr_at ? " · missed delivery" : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-mono text-os-ink">{o.total_paise != null ? formatPaise(o.total_paise) : "—"}</p>
                    <p className="text-[10px] text-teal-bright">{STATUS[o.status]}</p>
                  </div>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-os-border space-y-2.5">
                    {o.items.length > 0 && (
                      <ul className="pt-2 space-y-0.5">
                        {o.items.map((it, i) => (
                          <li key={i} className="text-xs text-os-ink">{it.quantity ?? 1} × {it.title || "Item"}</li>
                        ))}
                      </ul>
                    )}
                    {o.tracking_number && <p className="text-[11px] text-os-text-dim font-mono">{o.carrier ? `${o.carrier} · ` : ""}{o.tracking_number}</p>}
                    <label className="block">
                      <span className="block text-[10px] font-mono uppercase text-os-text-dim mb-1">Status</span>
                      <select value={o.status} disabled={busy === o.id} onChange={(e) => setOrderStatus(o, e.target.value as OrderStatus)}
                        className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none">
                        {(Object.keys(STATUS) as OrderStatus[]).map((s) => <option key={s} value={s}>{STATUS[s]}</option>)}
                      </select>
                    </label>
                    {orderTakesLink(o) && (
                      <PaymentLinkButton target={{ kind: "order", id: o.id }} compact
                        onPaid={() => setRows((prev) => prev?.map((x) => (x.id === o.id ? { ...x, status: "paid" } : x)) ?? prev)} />
                    )}
                    {o.customer_id && (
                      <a href={appPath(`/inbox/${o.customer_id}`)} className="w-full py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-os-ink flex items-center justify-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Open chat
                      </a>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
