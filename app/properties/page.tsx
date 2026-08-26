"use client";

import React, { useEffect, useState } from "react";
import { Building2, Plus, MapPin, BedDouble, Ruler, ShieldCheck } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  properties as propertiesApi,
  formatPaise,
  type Property,
  type ListingType,
  type PropertyStatus,
} from "@/lib/api";

const STATUS_BADGE: Record<PropertyStatus, "emerald" | "amber" | "default" | "rose" | "indigo"> = {
  available: "emerald",
  under_offer: "amber",
  sold: "default",
  rented: "default",
  withdrawn: "rose",
};

const STATUS_LABEL: Record<PropertyStatus, string> = {
  available: "Available",
  under_offer: "Under Offer",
  sold: "Sold",
  rented: "Rented",
  withdrawn: "Withdrawn",
};

export default function PropertiesPage() {
  const [allProperties, setAllProperties] = useState<Property[]>([]);
  const [statusFilter, setStatusFilter] = useState<PropertyStatus | "all">("all");
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editing, setEditing] = useState<Property | null>(null);
  const [title, setTitle] = useState("");
  const [listingType, setListingType] = useState<ListingType>("rent");
  const [propertyType, setPropertyType] = useState("");
  const [locality, setLocality] = useState("");
  const [address, setAddress] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [areaSqft, setAreaSqft] = useState("");
  const [price, setPrice] = useState("");
  const [pricePeriod, setPricePeriod] = useState("monthly");
  const [rera, setRera] = useState("");
  const [status, setStatus] = useState<PropertyStatus>("available");
  const [isSaving, setIsSaving] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setAllProperties(await propertiesApi.list({ include_inactive: false }));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load properties.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filtered = statusFilter === "all" ? allProperties : allProperties.filter((p) => p.status === statusFilter);

  const openCreateModal = () => {
    setEditing(null);
    setTitle("");
    setListingType("rent");
    setPropertyType("");
    setLocality("");
    setAddress("");
    setBedrooms("");
    setAreaSqft("");
    setPrice("");
    setPricePeriod("monthly");
    setRera("");
    setStatus("available");
    setIsModalOpen(true);
  };

  const openEditModal = (p: Property) => {
    setEditing(p);
    setTitle(p.title);
    setListingType(p.listing_type);
    setPropertyType(p.property_type || "");
    setLocality(p.locality || "");
    setAddress(p.address || "");
    setBedrooms(p.bedrooms?.toString() || "");
    setAreaSqft(p.area_sqft?.toString() || "");
    setPrice(p.price_paise ? (p.price_paise / 100).toString() : "");
    setPricePeriod(p.price_period || (p.listing_type === "rent" ? "monthly" : "one_time"));
    setRera(p.rera_registration_number || "");
    setStatus(p.status);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError(null);
    try {
      const payload = {
        title,
        listing_type: listingType,
        property_type: propertyType || undefined,
        locality: locality || undefined,
        address: address || undefined,
        bedrooms: bedrooms ? parseInt(bedrooms, 10) : undefined,
        area_sqft: areaSqft ? parseInt(areaSqft, 10) : undefined,
        price_paise: price ? Math.round(parseFloat(price) * 100) : undefined,
        price_period: pricePeriod || undefined,
        rera_registration_number: rera || undefined,
      };
      if (editing) {
        const updated = await propertiesApi.update(editing.id, { ...payload, status });
        setAllProperties((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        const created = await propertiesApi.create(payload);
        setAllProperties((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save this listing.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleWithdraw = async (id: string) => {
    setActionError(null);
    try {
      await propertiesApi.delete(id);
      setAllProperties((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not withdraw this listing.");
    }
  };

  return (
    <AppLayout
      title="Properties"
      subtitle="Your listings - the only source of truth the AI ever quotes a price or status from."
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Listing
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

        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] pb-3">
          <button
            type="button"
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${statusFilter === "all" ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"}`}
          >
            All ({allProperties.length})
          </button>
          {(Object.keys(STATUS_LABEL) as PropertyStatus[]).map((s) => (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No listings yet"
            description="Add a property so the AI can honestly quote its price, status, and availability - never a guess."
            action={{ label: "Add Listing", onClick: openCreateModal }}
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((p) => (
              <GlassCard key={p.id} className="p-5 cursor-pointer hover:border-white/[0.16]" onClick={() => openEditModal(p)}>
                <div className="flex items-start justify-between mb-2">
                  <span className="text-sm font-bold text-white leading-tight">{p.title}</span>
                  <Badge variant={STATUS_BADGE[p.status]} size="sm">{STATUS_LABEL[p.status]}</Badge>
                </div>
                {p.locality && (
                  <p className="text-xs text-os-text-dim flex items-center gap-1 mb-3">
                    <MapPin className="w-3 h-3" /> {p.locality}
                  </p>
                )}
                <div className="flex items-center gap-3 text-xs text-white/70 mb-3">
                  {p.bedrooms !== null && (
                    <span className="flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" /> {p.bedrooms} BHK</span>
                  )}
                  {p.area_sqft !== null && (
                    <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {p.area_sqft} sqft</span>
                  )}
                </div>
                <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                  <span className="text-sm font-bold text-brass-bright">
                    {p.price_paise ? formatPaise(p.price_paise, true) : "Price on request"}
                    {p.price_period === "monthly" && <span className="text-[10px] text-os-text-dim">/mo</span>}
                  </span>
                  {p.rera_registration_number ? (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-seal-bright" title={p.rera_registration_number}>
                      <ShieldCheck className="w-3 h-3" /> RERA
                    </span>
                  ) : (
                    <span className="text-[10px] font-mono text-os-text-dim">No RERA on file</span>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editing ? "Edit Listing" : "Add Listing"}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Title</label>
              <input type="text" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. 3BHK Sea View, Bandra West" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Listing type</label>
                <select value={listingType} onChange={(e) => { const v = e.target.value as ListingType; setListingType(v); setPricePeriod(v === "rent" ? "monthly" : "one_time"); }} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  <option value="rent">For Rent</option>
                  <option value="sale">For Sale</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Property type</label>
                <input type="text" value={propertyType} onChange={(e) => setPropertyType(e.target.value)} placeholder="apartment, villa..." className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Locality</label>
                <input type="text" value={locality} onChange={(e) => setLocality(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Address</label>
                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Bedrooms</label>
                <input type="number" min="0" value={bedrooms} onChange={(e) => setBedrooms(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Area (sqft)</label>
                <input type="number" min="0" value={areaSqft} onChange={(e) => setAreaSqft(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Price (₹)</label>
                <input type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">RERA registration number (optional)</label>
              <input type="text" value={rera} onChange={(e) => setRera(e.target.value)} placeholder="Leave blank if not registered - the AI will say so honestly rather than guess" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            {editing && (
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Status</label>
                <select value={status} onChange={(e) => setStatus(e.target.value as PropertyStatus)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  {(Object.keys(STATUS_LABEL) as PropertyStatus[]).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            )}
            <div className="flex justify-between items-center pt-2">
              {editing && (
                <button type="button" onClick={() => { handleWithdraw(editing.id); setIsModalOpen(false); }} className="text-xs text-thread-bright hover:text-thread font-semibold">
                  Withdraw listing
                </button>
              )}
              <div className="flex gap-3 ml-auto">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                  Cancel
                </button>
                <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                  {isSaving ? "Saving..." : editing ? "Save Changes" : "Add Listing"}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
