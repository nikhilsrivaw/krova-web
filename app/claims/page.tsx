"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FileCheck2, Plus, IndianRupee } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  claims as claimsApi,
  ledger,
  type InsuranceClaim,
  type ClaimStatus,
  type CustomerSummary,
} from "@/lib/api";

const STATUS_BADGE: Record<ClaimStatus, "emerald" | "amber" | "default" | "rose"> = {
  submitted: "default",
  under_review: "amber",
  query_raised: "amber",
  approved: "emerald",
  rejected: "rose",
  settled: "emerald",
};

const STATUS_LABEL: Record<ClaimStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  query_raised: "Query Raised",
  approved: "Approved",
  rejected: "Rejected",
  settled: "Settled",
};

const rupees = (paise: number | null) => (paise == null ? null : `₹${(paise / 100).toLocaleString("en-IN")}`);

export default function ClaimsPage() {
  const [allClaims, setAllClaims] = useState<InsuranceClaim[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<ClaimStatus | "all">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClaim, setEditingClaim] = useState<InsuranceClaim | null>(null);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formInsurer, setFormInsurer] = useState("");
  const [formPolicyNumber, setFormPolicyNumber] = useState("");
  const [formClaimNumber, setFormClaimNumber] = useState("");
  const [formStatus, setFormStatus] = useState<ClaimStatus>("submitted");
  const [formAmount, setFormAmount] = useState("");
  const [formApprovedAmount, setFormApprovedAmount] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed patient"]));
    return (id: string) => map.get(id) || id.slice(0, 8);
  }, [customers]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const results = await Promise.allSettled([claimsApi.list(), ledger.customers()]);
    const [claimsRes, customersRes] = results;
    if (claimsRes.status === "fulfilled") setAllClaims(claimsRes.value);
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value);

    const failed = results.find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(failed.reason instanceof Error ? failed.reason.message : "Could not load claims.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredClaims = statusFilter === "all" ? allClaims : allClaims.filter((c) => c.status === statusFilter);

  const openCreateModal = () => {
    setEditingClaim(null);
    setFormCustomerId("");
    setFormInsurer("");
    setFormPolicyNumber("");
    setFormClaimNumber("");
    setFormStatus("submitted");
    setFormAmount("");
    setFormApprovedAmount("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (c: InsuranceClaim) => {
    setEditingClaim(c);
    setFormCustomerId(c.customer_id);
    setFormInsurer(c.insurer_or_tpa_name || "");
    setFormPolicyNumber(c.policy_number || "");
    setFormClaimNumber(c.claim_number || "");
    setFormStatus(c.status);
    setFormAmount(c.claim_amount_paise != null ? String(c.claim_amount_paise / 100) : "");
    setFormApprovedAmount(c.approved_amount_paise != null ? String(c.approved_amount_paise / 100) : "");
    setFormNotes(c.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError(null);
    try {
      const claimPaise = formAmount ? Math.round(parseFloat(formAmount) * 100) : undefined;
      const approvedPaise = formApprovedAmount ? Math.round(parseFloat(formApprovedAmount) * 100) : undefined;
      if (editingClaim) {
        const updated = await claimsApi.update(editingClaim.id, {
          insurer_or_tpa_name: formInsurer || undefined,
          policy_number: formPolicyNumber || undefined,
          claim_number: formClaimNumber || undefined,
          status: formStatus,
          claim_amount_paise: claimPaise,
          approved_amount_paise: approvedPaise,
          notes: formNotes || undefined,
        });
        setAllClaims((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await claimsApi.create({
          customer_id: formCustomerId,
          insurer_or_tpa_name: formInsurer || undefined,
          policy_number: formPolicyNumber || undefined,
          claim_number: formClaimNumber || undefined,
          claim_amount_paise: claimPaise,
          submitted_at: new Date().toISOString(),
          notes: formNotes || undefined,
        });
        setAllClaims((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save this claim.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout
      title="Claims"
      subtitle="Every insurance/TPA claim, and where it actually stands - never a predicted outcome."
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Log Claim
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
          {(["all", "submitted", "under_review", "query_raised", "approved", "rejected", "settled"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                statusFilter === s
                  ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-inner font-bold"
                  : "text-os-text-dim hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {s === "all" ? `All (${allClaims.length})` : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredClaims.length === 0 ? (
          <EmptyState
            icon={FileCheck2}
            title="No claims yet"
            description="Log a claim so its status becomes something the AI can honestly answer, instead of escalating every time a patient asks."
            action={{ label: "Log Claim", onClick: openCreateModal }}
          />
        ) : (
          <div className="space-y-3">
            {filteredClaims.map((c) => (
              <GlassCard
                key={c.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-white/[0.16]"
                onClick={() => openEditModal(c)}
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{c.insurer_or_tpa_name || "Insurer/TPA not set"}</span>
                    {c.claim_number && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-os-text-dim">
                        {c.claim_number}
                      </span>
                    )}
                    <Badge variant={STATUS_BADGE[c.status]} size="sm">{STATUS_LABEL[c.status]}</Badge>
                  </div>
                  <p className="text-xs text-os-text-dim">
                    {customerName(c.customer_id)}
                    {c.policy_number && ` · Policy ${c.policy_number}`}
                  </p>
                </div>
                {(c.claim_amount_paise != null || c.approved_amount_paise != null) && (
                  <div className="text-xs font-mono text-brass-bright shrink-0 flex items-center gap-1.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {rupees(c.approved_amount_paise) || rupees(c.claim_amount_paise)}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingClaim ? "Edit Claim" : "Log Claim"}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingClaim && (
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Patient</label>
                <select required value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  <option value="">Select a patient...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.id.slice(0, 8)}</option>)}
                </select>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Insurer / TPA</label>
                <input type="text" value={formInsurer} onChange={(e) => setFormInsurer(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Policy number</label>
                <input type="text" value={formPolicyNumber} onChange={(e) => setFormPolicyNumber(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Claim number</label>
              <input type="text" value={formClaimNumber} onChange={(e) => setFormClaimNumber(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Claim amount (₹)</label>
                <input type="number" min="0" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              {editingClaim && (
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Approved amount (₹)</label>
                  <input type="number" min="0" step="0.01" value={formApprovedAmount} onChange={(e) => setFormApprovedAmount(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
                </div>
              )}
            </div>
            {editingClaim && (
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as ClaimStatus)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  {(["submitted", "under_review", "query_raised", "approved", "rejected", "settled"] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Notes</label>
              <textarea rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full p-3 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                {isSaving ? "Saving..." : editingClaim ? "Save Changes" : "Log Claim"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
