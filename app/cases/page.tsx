"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Scale, Plus, Gavel, Clock } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  cases as casesApi,
  ledger,
  type Case,
  type CaseStatus,
  type CustomerSummary,
} from "@/lib/api";

const STATUS_BADGE: Record<CaseStatus, "emerald" | "amber" | "default" | "rose"> = {
  intake: "amber",
  active: "emerald",
  on_hold: "default",
  closed: "rose",
};

const STATUS_LABEL: Record<CaseStatus, string> = {
  intake: "Intake",
  active: "Active",
  on_hold: "On Hold",
  closed: "Closed",
};

export default function CasesPage() {
  const [allCases, setAllCases] = useState<Case[]>([]);
  const [upcoming, setUpcoming] = useState<Case[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [statusFilter, setStatusFilter] = useState<CaseStatus | "all">("all");

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCase, setEditingCase] = useState<Case | null>(null);
  const [formCustomerId, setFormCustomerId] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formCaseNumber, setFormCaseNumber] = useState("");
  const [formOpposingParty, setFormOpposingParty] = useState("");
  const [formCourt, setFormCourt] = useState("");
  const [formStatus, setFormStatus] = useState<CaseStatus>("intake");
  const [formHearing, setFormHearing] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed client"]));
    return (id: string) => map.get(id) || id.slice(0, 8);
  }, [customers]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const results = await Promise.allSettled([
      casesApi.list(),
      casesApi.upcomingHearings(14),
      ledger.customers(),
    ]);
    const [casesRes, upcomingRes, customersRes] = results;
    if (casesRes.status === "fulfilled") setAllCases(casesRes.value);
    if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value);
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value);

    const failed = results.find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(failed.reason instanceof Error ? failed.reason.message : "Could not load cases.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredCases = statusFilter === "all" ? allCases : allCases.filter((c) => c.status === statusFilter);

  const openCreateModal = () => {
    setEditingCase(null);
    setFormCustomerId("");
    setFormTitle("");
    setFormCaseNumber("");
    setFormOpposingParty("");
    setFormCourt("");
    setFormStatus("intake");
    setFormHearing("");
    setFormNotes("");
    setIsModalOpen(true);
  };

  const openEditModal = (c: Case) => {
    setEditingCase(c);
    setFormCustomerId(c.customer_id);
    setFormTitle(c.title);
    setFormCaseNumber(c.case_number || "");
    setFormOpposingParty(c.opposing_party || "");
    setFormCourt(c.court || "");
    setFormStatus(c.status);
    setFormHearing(c.next_hearing_at ? c.next_hearing_at.slice(0, 16) : "");
    setFormNotes(c.notes || "");
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setActionError(null);
    try {
      const hearingIso = formHearing ? new Date(formHearing).toISOString() : undefined;
      if (editingCase) {
        const updated = await casesApi.update(editingCase.id, {
          title: formTitle,
          case_number: formCaseNumber || undefined,
          opposing_party: formOpposingParty || undefined,
          court: formCourt || undefined,
          status: formStatus,
          next_hearing_at: hearingIso,
          notes: formNotes || undefined,
        });
        setAllCases((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      } else {
        const created = await casesApi.create({
          customer_id: formCustomerId,
          title: formTitle,
          case_number: formCaseNumber || undefined,
          opposing_party: formOpposingParty || undefined,
          court: formCourt || undefined,
          next_hearing_at: hearingIso,
          notes: formNotes || undefined,
        });
        setAllCases((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not save this case.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <AppLayout
      title="Cases"
      subtitle="Every matter, its status, and what's coming up on the docket."
      actions={
        <button
          type="button"
          onClick={openCreateModal}
          className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Open Case
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

        {upcoming.length > 0 && (
          <GlassCard className="p-4 bg-gradient-to-r from-[#0B0F17] to-brass/10 border-brass/20">
            <div className="flex items-center gap-2 mb-3">
              <Gavel className="w-4 h-4 text-brass" />
              <h4 className="text-xs font-bold text-white">Hearings in the next 14 days</h4>
            </div>
            <div className="space-y-2">
              {upcoming.map((c) => (
                <div key={c.id} className="flex items-center justify-between text-xs">
                  <span className="text-white/90">
                    {c.title}
                    {c.case_number && <span className="text-os-text-dim font-mono"> ({c.case_number})</span>}
                  </span>
                  <span className="font-mono text-brass-bright flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {c.next_hearing_at &&
                      new Date(c.next_hearing_at).toLocaleString("en-IN", {
                        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                      })}
                  </span>
                </div>
              ))}
            </div>
          </GlassCard>
        )}

        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          {(["all", "intake", "active", "on_hold", "closed"] as const).map((s) => (
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
              {s === "all" ? `All (${allCases.length})` : STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : filteredCases.length === 0 ? (
          <EmptyState
            icon={Scale}
            title="No cases yet"
            description="Open a case for a client so hearing dates and status become something the AI can honestly answer questions about."
            action={{ label: "Open Case", onClick: openCreateModal }}
          />
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <GlassCard
                key={c.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:border-white/[0.16]"
                onClick={() => openEditModal(c)}
              >
                <div className="space-y-1 overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{c.title}</span>
                    {c.case_number && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-os-text-dim">
                        {c.case_number}
                      </span>
                    )}
                    <Badge variant={STATUS_BADGE[c.status]} size="sm">{STATUS_LABEL[c.status]}</Badge>
                  </div>
                  <p className="text-xs text-os-text-dim">
                    {customerName(c.customer_id)}
                    {c.opposing_party && ` vs. ${c.opposing_party}`}
                    {c.court && ` · ${c.court}`}
                  </p>
                </div>
                {c.next_hearing_at && (
                  <div className="text-xs font-mono text-brass-bright shrink-0 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    {new Date(c.next_hearing_at).toLocaleString("en-IN", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </div>
                )}
              </GlassCard>
            ))}
          </div>
        )}

        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title={editingCase ? "Edit Case" : "Open Case"}
          maxWidth="lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {!editingCase && (
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Client</label>
                <select required value={formCustomerId} onChange={(e) => setFormCustomerId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  <option value="">Select a client...</option>
                  {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.id.slice(0, 8)}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Title</label>
              <input type="text" required value={formTitle} onChange={(e) => setFormTitle(e.target.value)} placeholder="e.g. Property dispute - 12 MG Road" className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Case number</label>
                <input type="text" value={formCaseNumber} onChange={(e) => setFormCaseNumber(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Court</label>
                <input type="text" value={formCourt} onChange={(e) => setFormCourt(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Opposing party</label>
              <input type="text" value={formOpposingParty} onChange={(e) => setFormOpposingParty(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            {editingCase && (
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Status</label>
                <select value={formStatus} onChange={(e) => setFormStatus(e.target.value as CaseStatus)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  {(["intake", "active", "on_hold", "closed"] as const).map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Next hearing</label>
              <input type="datetime-local" value={formHearing} onChange={(e) => setFormHearing(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Notes</label>
              <textarea rows={3} value={formNotes} onChange={(e) => setFormNotes(e.target.value)} className="w-full p-3 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={isSaving} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                {isSaving ? "Saving..." : editingCase ? "Save Changes" : "Open Case"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
