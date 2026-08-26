"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Package, Plus, Truck, Trash2, Store } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  orders as ordersApi,
  ledger,
  formatPaise,
  type Order,
  type OrderStatus,
  type StoreConnection,
  type CustomerSummary,
} from "@/lib/api";

const STATUS_BADGE: Record<OrderStatus, "emerald" | "amber" | "rose" | "default" | "indigo"> = {
  pending: "amber",
  paid: "indigo",
  fulfilled: "emerald",
  out_for_delivery: "emerald",
  delivered: "emerald",
  cancelled: "rose",
  return_requested: "amber",
  refunded: "rose",
};

const STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  paid: "Paid",
  fulfilled: "Fulfilled",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  refunded: "Refunded",
};

export default function OrdersPage() {
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [connections, setConnections] = useState<StoreConnection[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [platform, setPlatform] = useState("shopify");
  const [storeIdentifier, setStoreIdentifier] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [isConnecting, setIsConnecting] = useState(false);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed customer"]));
    return (id: string | null) => (id ? map.get(id) || id.slice(0, 8) : "Unresolved");
  }, [customers]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const results = await Promise.allSettled([ordersApi.list(), ordersApi.listConnections(), ledger.customers()]);
    const [ordersRes, connRes, customersRes] = results;
    if (ordersRes.status === "fulfilled") setAllOrders(ordersRes.value);
    if (connRes.status === "fulfilled") setConnections(connRes.value);
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value);

    const failed = results.find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(failed.reason instanceof Error ? failed.reason.message : "Could not load orders.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredOrders = statusFilter === "all" ? allOrders : allOrders.filter((o) => o.status === statusFilter);

  const openConnectModal = () => {
    setPlatform("shopify");
    setStoreIdentifier("");
    setWebhookSecret("");
    setIsConnectModalOpen(true);
  };

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setActionError(null);
    try {
      const created = await ordersApi.connectStore({ platform, store_identifier: storeIdentifier, webhook_secret: webhookSecret });
      setConnections((prev) => [...prev, created]);
      setIsConnectModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not connect this store.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async (id: string) => {
    setActionError(null);
    try {
      await ordersApi.disconnectStore(id);
      setConnections((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not disconnect this store.");
    }
  };

  return (
    <AppLayout
      title="Orders"
      subtitle="Orders synced from your connected store - the one source of truth behind every 'where is my order' reply."
      actions={
        <button
          type="button"
          onClick={openConnectModal}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Connect Store
        </button>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {actionError}
          </div>
        )}

        {connections.length === 0 ? (
          <GlassCard className="p-5 border-amber-500/25 bg-amber-500/5">
            <div className="flex items-center gap-3">
              <Store className="w-5 h-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-xs font-bold text-white">No store connected yet</p>
                <p className="text-xs text-os-text-dim">
                  Connect Shopify to start syncing orders in. In your Shopify Admin, add a webhook (Settings → Notifications → Webhooks) pointed at your KROVA webhook URL for the <code className="font-mono">orders/create</code>, <code className="font-mono">orders/updated</code>, and <code className="font-mono">orders/cancelled</code> topics, then paste the secret it gives you here.
                </p>
              </div>
            </div>
          </GlassCard>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {connections.map((c) => (
              <GlassCard key={c.id} className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-white capitalize">{c.platform}</p>
                  <p className="text-xs text-os-text-dim font-mono">{c.store_identifier}</p>
                </div>
                <button type="button" onClick={() => handleDisconnect(c.id)} className="text-os-text-dim hover:text-thread-bright">
                  <Trash2 className="w-4 h-4" />
                </button>
              </GlassCard>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === "all" ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"}`}
          >
            All ({allOrders.length})
          </button>
          {(Object.keys(STATUS_LABEL) as OrderStatus[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === s ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="Once a store is connected and a real webhook arrives, orders will show up here - and the AI can honestly answer where they stand."
          />
        ) : (
          <div className="rounded-2xl border border-os-border overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.03] text-os-text-dim uppercase font-mono text-[10px]">
                <tr>
                  <th className="text-left px-4 py-2.5">Order</th>
                  <th className="text-left px-4 py-2.5">Customer</th>
                  <th className="text-left px-4 py-2.5">Total</th>
                  <th className="text-left px-4 py-2.5">Tracking</th>
                  <th className="text-left px-4 py-2.5">Placed</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr key={o.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                    <td className="px-4 py-3 text-white font-mono">{o.order_number ? `#${o.order_number}` : o.id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-white/90">{customerName(o.customer_id)}</td>
                    <td className="px-4 py-3 text-white/90">{formatPaise(o.total_paise)}</td>
                    <td className="px-4 py-3 text-os-text-dim">
                      {o.tracking_number ? (
                        <span className="flex items-center gap-1">
                          <Truck className="w-3 h-3" /> {o.tracking_number} {o.carrier && `(${o.carrier})`}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-os-text-dim font-mono">
                      {new Date(o.placed_at).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_BADGE[o.status]} size="sm">{STATUS_LABEL[o.status]}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          title="Connect Store"
          subtitle="The webhook secret is encrypted at rest and never shown again after this."
        >
          <form onSubmit={handleConnect} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Platform</label>
              <select value={platform} onChange={(e) => setPlatform(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                <option value="shopify">Shopify</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Store domain</label>
              <input type="text" required value={storeIdentifier} onChange={(e) => setStoreIdentifier(e.target.value)} placeholder="yourstore.myshopify.com" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none font-mono" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Webhook secret</label>
              <input type="password" required value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none font-mono" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsConnectModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={isConnecting} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
