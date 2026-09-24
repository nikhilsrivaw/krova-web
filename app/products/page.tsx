"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Boxes, Upload, RefreshCw, Plus, Trash2, Search, AlertTriangle } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  products as productsApi,
  formatPaise,
  type Product,
  type ProductVariant,
} from "@/lib/api";

// Where a row came from, in the owner's language rather than ours.
const SOURCE_LABEL: Record<string, string> = {
  shopify: "Shopify",
  meta_catalog: "WhatsApp catalogue",
  csv: "Imported file",
  manual: "Added by hand",
};

/**
 * Stock, stated honestly.
 *
 * `available === null` means the source never told us - a store that
 * doesn't track inventory, or a catalogue field Meta left blank. Showing
 * that as "Out of stock" would be inventing a fact, and the whole
 * catalogue exists to stop exactly that.
 */
function StockBadge({ variant }: { variant: ProductVariant }) {
  if (variant.available === null) {
    return <Badge variant="outline">Stock unknown</Badge>;
  }
  if (!variant.available) {
    return <Badge variant="rose">Out of stock</Badge>;
  }
  return (
    <Badge variant="emerald" dot>
      {variant.inventory_quantity != null ? `${variant.inventory_quantity} in stock` : "In stock"}
    </Badge>
  );
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSku, setNewSku] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (term?: string) => {
    try {
      setItems(await productsApi.list(term ? { search: term } : undefined));
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load your catalogue.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // One place to run an action, so every button gets the same busy state
  // and the same error handling - same shape as /voice's own run().
  const run = async (key: string, fn: () => Promise<string | null>) => {
    setBusy(key);
    setError(null);
    setMessage(null);
    setWarnings([]);
    try {
      const note = await fn();
      if (note) setMessage(note);
      await load(search);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const handleSyncMeta = () =>
    run("meta", async () => (await productsApi.syncMeta()).note);

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    run("csv", async () => {
      const result = await productsApi.importCsv(file);
      setWarnings(result.warnings);
      return result.note;
    });
    // Let the same file be picked again after a failed import.
    event.target.value = "";
  };

  const handleAdd = () =>
    run("add", async () => {
      const paise = newPrice.trim() ? Math.round(Number(newPrice) * 100) : null;
      await productsApi.create({
        title: newTitle.trim(),
        variants: [{ sku: newSku.trim() || null, price_paise: Number.isFinite(paise) ? paise : null }],
      });
      setIsAddOpen(false);
      setNewTitle("");
      setNewSku("");
      setNewPrice("");
      return "Product added.";
    });

  const handleDelete = (id: string) => run(`del-${id}`, async () => {
    await productsApi.remove(id);
    return "Product removed.";
  });

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Catalogue</h1>
            <p className="text-sm text-os-text-dim mt-1">
              What you sell. Krova uses this to tell you what customers asked
              for that you don&apos;t stock.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleSyncMeta}
              disabled={busy !== null}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white disabled:opacity-50 flex items-center gap-2"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${busy === "meta" ? "animate-spin" : ""}`} />
              Import from WhatsApp
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={busy !== null}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-white disabled:opacity-50 flex items-center gap-2"
            >
              <Upload className={`w-3.5 h-3.5 ${busy === "csv" ? "animate-pulse" : ""}`} />
              Upload CSV
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFile}
              className="hidden"
            />
            <button
              onClick={() => setIsAddOpen(true)}
              disabled={busy !== null}
              className="px-3 py-2 rounded-xl text-xs font-medium bg-brass/20 hover:bg-brass/30 border border-brass/30 text-brass-bright disabled:opacity-50 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              Add product
            </button>
          </div>
        </div>

        {message && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-mono">
            {message}
          </div>
        )}
        {warnings.length > 0 && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 space-y-1">
            {warnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300 font-mono flex items-start gap-2">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
                {w}
              </p>
            ))}
          </div>
        )}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-xs font-mono">
            {error}
          </div>
        )}

        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load(search)}
            placeholder="Search your products…"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40"
          />
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Boxes}
            title="No products yet"
            description="Import from your WhatsApp catalogue, upload a CSV exported from your website, or add a product by hand."
          />
        ) : (
          <div className="space-y-2">
            {items.map((product) => (
              <GlassCard key={product.id} className="p-4">
                <div className="flex items-start gap-4">
                  {product.image_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={product.image_url}
                      alt=""
                      className="w-14 h-14 rounded-xl object-cover border border-white/[0.08] shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center justify-center shrink-0">
                      <Boxes className="w-5 h-5 text-os-text-dim" />
                    </div>
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="text-sm font-semibold text-white truncate">
                          {product.title}
                        </h3>
                        <p className="text-[11px] text-os-text-dim mt-0.5">
                          {[product.product_type, product.vendor].filter(Boolean).join(" · ") ||
                            "No category"}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline">
                          {SOURCE_LABEL[product.source_platform] ?? product.source_platform}
                        </Badge>
                        {product.source_platform === "manual" && (
                          <button
                            onClick={() => handleDelete(product.id)}
                            disabled={busy !== null}
                            aria-label="Remove product"
                            className="p-1.5 rounded-lg text-os-text-dim hover:text-red-400 hover:bg-red-500/10 disabled:opacity-50"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-2.5 space-y-1">
                      {product.variants.map((variant) => (
                        <div
                          key={variant.id}
                          className="flex items-center justify-between gap-3 p-2 rounded-lg bg-black/20 border border-white/[0.05]"
                        >
                          <div className="min-w-0 flex items-center gap-2">
                            <span className="text-[11px] text-white/80 truncate">
                              {variant.title || "Default"}
                            </span>
                            {variant.sku && (
                              <span className="text-[10px] font-mono text-os-text-dim shrink-0">
                                {variant.sku}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[11px] font-mono text-white">
                              {variant.price_paise != null ? formatPaise(variant.price_paise) : "—"}
                            </span>
                            <StockBadge variant={variant} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add a product">
          <div className="space-y-3">
            <div>
              <label className="text-xs text-os-text-dim block mb-1.5">Product name</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Cotton Kurta"
                className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-os-text-dim block mb-1.5">Code (optional)</label>
                <input
                  value={newSku}
                  onChange={(e) => setNewSku(e.target.value)}
                  placeholder="KUR-BLU-XL"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40"
                />
              </div>
              <div>
                <label className="text-xs text-os-text-dim block mb-1.5">Price ₹ (optional)</label>
                <input
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  inputMode="decimal"
                  placeholder="499"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.08] text-sm text-white placeholder:text-os-text-dim focus:outline-none focus:border-brass/40"
                />
              </div>
            </div>
            <button
              onClick={handleAdd}
              disabled={!newTitle.trim() || busy !== null}
              className="w-full px-4 py-2.5 rounded-xl text-sm font-medium bg-brass/20 hover:bg-brass/30 border border-brass/30 text-brass-bright disabled:opacity-40"
            >
              Add product
            </button>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
