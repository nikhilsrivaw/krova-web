"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Sparkles,
  DollarSign,
  Clock,
  Filter,
  CheckCircle2,
  Upload,
  Download,
  Tag as TagIcon,
  X,
  Plus,
  StickyNote,
  Check,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { PipelineBoard } from "@/components/crm/PipelineBoard";
import {
  ledger,
  crm,
  formatPaise,
  type CustomerSummary,
  type ContactImportResult,
  type CustomerTag,
  type CustomerNote,
} from "@/lib/api";

function parseContactsCsv(text: string): { phone: string; name?: string }[] {
  const lines = text.split(/\r\n|\n|\r/).map((l) => l.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const splitRow = (line: string) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, ""));

  const header = splitRow(lines[0]).map((h) => h.toLowerCase());
  const phoneIdx = header.indexOf("phone");
  const nameIdx = header.indexOf("name");
  // A header row is one that actually names its columns - if "phone" isn't
  // among them, treat every line (including the first) as data, column 0
  // phone / column 1 name, rather than silently dropping a real row.
  const hasHeader = phoneIdx !== -1;
  const dataLines = hasHeader ? lines.slice(1) : lines;
  const pIdx = hasHeader ? phoneIdx : 0;
  const nIdx = hasHeader ? nameIdx : 1;

  return dataLines
    .map((line) => splitRow(line))
    .filter((cells) => cells[pIdx])
    .map((cells) => ({ phone: cells[pIdx], name: nIdx >= 0 ? cells[nIdx] || undefined : undefined }));
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerSummary | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [healthFilter, setHealthFilter] = useState<"all" | "high" | "low">("all");
  const [isLoading, setIsLoading] = useState(true);

  // Contact import
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ContactImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // CRM: tags, notes, pipeline stage - loaded per-customer when the drawer opens
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [pipelineStages, setPipelineStages] = useState<string[]>([]);
  const [isLoadingCrm, setIsLoadingCrm] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [newNoteBody, setNewNoteBody] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [newDealValue, setNewDealValue] = useState("");

  // List vs. pipeline (kanban) view
  const [view, setView] = useState<"list" | "pipeline">("list");

  // Bulk tagging - select rows in list view, apply one tag to all of them
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTagLabel, setBulkTagLabel] = useState("");
  const [isBulkTagging, setIsBulkTagging] = useState(false);
  const [bulkTagResult, setBulkTagResult] = useState<string | null>(null);

  const reloadCustomers = async () => {
    try {
      const data = await ledger.customers();
      setCustomers(data);
    } catch {
      // Leave whatever is already showing (real data or the mock fallback).
    }
  };

  // Reflect a tag/stage change back into the row the drawer was opened from,
  // so the table doesn't show stale data until the next full reload.
  const patchSelected = (patch: Partial<CustomerSummary>) => {
    setSelectedCustomer((prev) => (prev ? { ...prev, ...patch } : prev));
    setCustomers((prev) =>
      prev.map((c) => (c.id === selectedCustomer?.id ? { ...c, ...patch } : c)),
    );
  };

  useEffect(() => {
    if (!selectedCustomer) {
      setTags([]);
      setNotes([]);
      return;
    }
    setNewDealValue(
      selectedCustomer.deal_value_paise ? String(selectedCustomer.deal_value_paise / 100) : "",
    );
    let mounted = true;
    setIsLoadingCrm(true);
    Promise.allSettled([
      crm.tags(selectedCustomer.id),
      crm.notes(selectedCustomer.id),
    ]).then(([tagsRes, notesRes]) => {
      if (!mounted) return;
      setTags(tagsRes.status === "fulfilled" ? tagsRes.value : []);
      setNotes(notesRes.status === "fulfilled" ? notesRes.value : []);
      setIsLoadingCrm(false);
    });
    return () => {
      mounted = false;
    };
  }, [selectedCustomer?.id]);

  useEffect(() => {
    let mounted = true;
    crm.pipelineStages().then((r) => {
      if (mounted) setPipelineStages(r.stages);
    }).catch(() => {
      // Falls back to no dropdown options - the stage input just won't offer suggestions.
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleAddTag = async () => {
    const label = newTagLabel.trim();
    if (!label || !selectedCustomer) return;
    setIsSavingTag(true);
    try {
      const tag = await crm.addTag(selectedCustomer.id, label);
      setTags((prev) => [tag, ...prev.filter((t) => t.label !== tag.label)]);
      setNewTagLabel("");
      const confirmedLabels = [
        ...new Set([...(selectedCustomer.tags || []), tag.label]),
      ];
      patchSelected({ tags: confirmedLabels });
    } catch {
      // Left silently - the input keeps its text so the user can retry.
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleConfirmTag = async (tag: CustomerTag) => {
    const updated = await crm.confirmTag(tag.id);
    setTags((prev) => prev.map((t) => (t.id === tag.id ? updated : t)));
    if (selectedCustomer) {
      patchSelected({ tags: [...new Set([...(selectedCustomer.tags || []), updated.label])] });
    }
  };

  const handleRejectTag = async (tag: CustomerTag) => {
    const updated = await crm.rejectTag(tag.id);
    setTags((prev) => prev.map((t) => (t.id === tag.id ? updated : t)));
  };

  const handleDeleteTag = async (tag: CustomerTag) => {
    await crm.deleteTag(tag.id);
    setTags((prev) => prev.filter((t) => t.id !== tag.id));
    if (selectedCustomer) {
      patchSelected({ tags: (selectedCustomer.tags || []).filter((l) => l !== tag.label) });
    }
  };

  const handleAddNote = async () => {
    const body = newNoteBody.trim();
    if (!body || !selectedCustomer) return;
    setIsSavingNote(true);
    try {
      const note = await crm.addNote(selectedCustomer.id, body);
      setNotes((prev) => [note, ...prev]);
      setNewNoteBody("");
    } catch {
      // Text stays in the box so nothing typed is lost.
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleSetStage = async (stage: string) => {
    if (!selectedCustomer) return;
    const value = stage || null;
    patchSelected({ stage: value });
    try {
      await crm.setStage(selectedCustomer.id, value);
    } catch {
      // The optimistic update stands even if the write failed silently -
      // acceptable here since a stage is a low-stakes label, not money.
    }
  };

  const handleSetDealValue = async () => {
    if (!selectedCustomer) return;
    const rupees = newDealValue.trim();
    const paise = rupees ? Math.round(parseFloat(rupees) * 100) : null;
    if (rupees && (Number.isNaN(paise) || (paise as number) < 0)) return;
    patchSelected({ deal_value_paise: paise });
    try {
      await crm.setDealValue(selectedCustomer.id, paise);
    } catch {
      // Optimistic update stands - a deal value is a forecast, not money moved.
    }
  };

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkTag = async () => {
    const label = bulkTagLabel.trim();
    if (!label || selectedIds.size === 0) return;
    setIsBulkTagging(true);
    setBulkTagResult(null);
    try {
      const result = await crm.bulkAddTag([...selectedIds], label);
      setCustomers((prev) =>
        prev.map((c) =>
          selectedIds.has(c.id) ? { ...c, tags: [...new Set([...(c.tags || []), label])] } : c,
        ),
      );
      setBulkTagResult(`Tagged ${result.tagged}, already had it ${result.already_tagged}.`);
      setBulkTagLabel("");
      setSelectedIds(new Set());
    } catch (err) {
      setBulkTagResult(err instanceof Error ? err.message : "Could not tag these customers.");
    } finally {
      setIsBulkTagging(false);
    }
  };

  const exportCustomersCsv = () => {
    // Private customers are excluded by default - marked private specifically
    // to stay out of automated reach, so a bulk export shouldn't include them.
    const rows = customers.filter((c) => !c.is_private);
    const header = ["Name", "Phone", "Email", "Stage", "Tags", "Health Score", "Outstanding", "Open Commitments", "Last Contact"];
    const csvRows = rows.map((c) => {
      const phone = c.identities.find((i) => i.kind === "phone")?.value || "";
      const email = c.identities.find((i) => i.kind === "email")?.value || "";
      return [
        c.name || "",
        phone,
        email,
        c.stage || "",
        (c.tags || []).join("; "),
        c.health_score != null ? String(c.health_score) : "",
        c.outstanding_paise ? (c.outstanding_paise / 100).toFixed(2) : "0",
        String(c.open_commitments),
        c.last_contact_at || "",
      ]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(",");
    });
    const csv = [header.join(","), ...csvRows].join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `krova-customers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImportFile = async (file: File) => {
    setImportError(null);
    setImportResult(null);
    setIsImporting(true);
    try {
      const text = await file.text();
      const contacts = parseContactsCsv(text);
      if (contacts.length === 0) {
        setImportError("Couldn't find any rows with a phone number in that file.");
        return;
      }
      const result = await ledger.importCustomers(contacts);
      setImportResult(result);
      await reloadCustomers();
    } catch (err) {
      setImportError(err instanceof Error ? err.message : "Could not import this file.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadCustomers = async () => {
      try {
        const data = await ledger.customers();
        if (mounted) setCustomers(data);
      } catch {
        // Mock fallback
        if (mounted) {
          setCustomers([
            {
              id: "cust-101",
              name: "Dr. Rajesh Sharma",
              identities: [
                { kind: "phone", value: "+91 98201 44521" },
                { kind: "email", value: "dr.rajesh@sharmaclinic.in" },
              ],
              last_contact_at: new Date().toISOString(),
              open_commitments: 1,
              is_private: false,
              health_score: 88,
              outstanding_paise: 1850000,
              summary:
                "Lead clinical ultrasound consultant. Enrolled in multiple workshop modules. Reliable payment record.",
              preferred_channel: "whatsapp",
            },
            {
              id: "cust-102",
              name: "Anita Varma (Radiance)",
              identities: [{ kind: "phone", value: "+91 91672 88910" }],
              last_contact_at: new Date(Date.now() - 86400000).toISOString(),
              open_commitments: 0,
              is_private: false,
              health_score: 92,
              outstanding_paise: 0,
              summary:
                "Corporate salon chain owner. Schedules team training sessions every quarter.",
              preferred_channel: "voice",
            },
            {
              id: "cust-103",
              name: "Vikram Malhotra",
              identities: [{ kind: "phone", value: "+91 98450 11223" }],
              last_contact_at: new Date(Date.now() - 86400000 * 4).toISOString(),
              open_commitments: 2,
              is_private: true,
              health_score: 42,
              outstanding_paise: 5000000,
              summary:
                "Promised retainer fee payment 3 times and delayed twice. Pattern extracted: Needs structured deadline reminders.",
              preferred_channel: "whatsapp",
            },
          ]);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    loadCustomers();
    return () => {
      mounted = false;
    };
  }, []);

  const allTagLabels = [...new Set(customers.flatMap((c) => c.tags || []))].sort();

  const filteredCustomers = customers.filter((c) => {
    const matchesSearch =
      (c.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.identities.some((i) => i.value.includes(searchQuery));
    const score = c.health_score ?? 80;
    const matchesHealth =
      healthFilter === "all" ||
      (healthFilter === "high" && score >= 75) ||
      (healthFilter === "low" && score < 75);
    const matchesTag = !tagFilter || (c.tags || []).includes(tagFilter);
    return matchesSearch && matchesHealth && matchesTag;
  });

  return (
    <AppLayout
      title="Customer Intelligence CRM"
      subtitle="AI-built relationship graph & compressed customer profiles"
      actions={
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-os-text-dim">
            {customers.length} Tracked Profiles
          </span>
          <div className="flex items-center rounded-lg bg-white/[0.04] p-0.5">
            {(["list", "pipeline"] as const).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold capitalize cursor-pointer transition-colors ${
                  view === v ? "bg-white text-black" : "text-os-text-dim hover:text-white"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={exportCustomersCsv}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => {
              setImportError(null);
              setImportResult(null);
              setIsImportModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Import Contacts
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
      {view === "list" && (
      <>
        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-os-card border border-white/[0.06]">
          <div className="flex items-center px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.08] w-full sm:w-80">
            <Search className="w-4 h-4 text-os-text-dim mr-2 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search customer name or phone..."
              className="w-full bg-transparent text-xs text-white placeholder:text-os-text-dim outline-none"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="text-xs font-mono text-os-text-dim">Health:</span>
            {(["all", "high", "low"] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHealthFilter(h)}
                className={`px-3 py-1 rounded-lg text-xs font-mono capitalize transition-all cursor-pointer ${
                  healthFilter === h
                    ? "bg-white text-black font-bold"
                    : "bg-white/[0.04] text-os-text-dim hover:text-white"
                }`}
              >
                {h === "high" ? "Healthy (75+)" : h === "low" ? "At-Risk (<75)" : "All"}
              </button>
            ))}
          </div>
        </div>

        {allTagLabels.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap px-1">
            <span className="text-xs font-mono text-os-text-dim flex items-center gap-1">
              <TagIcon className="w-3 h-3" /> Tag:
            </span>
            <button
              type="button"
              onClick={() => setTagFilter(null)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer ${
                !tagFilter ? "bg-white text-black font-bold" : "bg-white/[0.04] text-os-text-dim hover:text-white"
              }`}
            >
              All
            </button>
            {allTagLabels.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() => setTagFilter(tagFilter === label ? null : label)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono cursor-pointer ${
                  tagFilter === label ? "bg-brass text-white font-bold" : "bg-white/[0.04] text-os-text-dim hover:text-white"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Bulk Tag Bar - appears once at least one row is selected */}
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-2.5 p-3 rounded-xl bg-brass/10 border border-brass/20">
            <span className="text-xs font-mono text-white font-semibold shrink-0">
              {selectedIds.size} selected
            </span>
            <input
              type="text"
              value={bulkTagLabel}
              onChange={(e) => setBulkTagLabel(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleBulkTag()}
              placeholder="Tag to apply to all selected..."
              className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
            />
            <button
              type="button"
              onClick={handleBulkTag}
              disabled={isBulkTagging || !bulkTagLabel.trim()}
              className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold disabled:opacity-40 cursor-pointer shrink-0"
            >
              {isBulkTagging ? "Tagging..." : "Apply Tag"}
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-os-text-dim hover:text-white shrink-0 cursor-pointer"
            >
              Clear
            </button>
          </div>
        )}
        {bulkTagResult && (
          <p className="text-[11px] text-os-text-dim px-1">{bulkTagResult}</p>
        )}

        {/* Customer Data Table */}
        <GlassCard className="p-6">
          {isLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : filteredCustomers.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No customers match your filter"
              description="Try adjusting your search query or health score filter."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3 px-3 w-8">
                      <input
                        type="checkbox"
                        checked={filteredCustomers.length > 0 && filteredCustomers.every((c) => selectedIds.has(c.id))}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
                          } else {
                            setSelectedIds(new Set());
                          }
                        }}
                        className="cursor-pointer"
                      />
                    </th>
                    <th className="py-3 px-3">Customer</th>
                    <th className="py-3 px-3">Identity / Contact</th>
                    <th className="py-3 px-3">Health Score</th>
                    <th className="py-3 px-3">Open Commitments</th>
                    <th className="py-3 px-3">Outstanding ₹</th>
                    <th className="py-3 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  {filteredCustomers.map((cust) => {
                    const score = cust.health_score ?? 80;
                    return (
                      <tr
                        key={cust.id}
                        className="hover:bg-white/[0.02] cursor-pointer transition-colors group"
                        onClick={() => setSelectedCustomer(cust)}
                      >
                        <td className="py-3 px-3" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(cust.id)}
                            onChange={() => toggleSelected(cust.id)}
                            className="cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-brass/40 to-slate-800 border border-white/10 flex items-center justify-center font-bold text-xs text-white">
                              {cust.name?.charAt(0) || "C"}
                            </div>
                            <div>
                              <p className="font-bold text-white group-hover:text-brass-bright transition-colors">
                                {cust.name || "Unnamed Contact"}
                              </p>
                              <span className="text-[10px] text-os-text-dim capitalize">
                                Prefers {cust.preferred_channel || "WhatsApp"}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 font-mono text-os-text-dim">
                          {cust.identities[0]?.value || "No phone"}
                        </td>

                        <td className="py-3 px-3 font-mono">
                          <Badge
                            variant={score >= 75 ? "emerald" : score >= 50 ? "amber" : "rose"}
                            size="sm"
                          >
                            {score}/100
                          </Badge>
                        </td>

                        <td className="py-3 px-3 font-mono text-white">
                          {cust.open_commitments > 0 ? (
                            <span className="text-amber-400 font-semibold">
                              {cust.open_commitments} Pending
                            </span>
                          ) : (
                            <span className="text-os-text-dim">0 Promises</span>
                          )}
                        </td>

                        <td className="py-3 px-3 font-mono font-bold text-white">
                          {cust.outstanding_paise ? (
                            formatPaise(cust.outstanding_paise)
                          ) : (
                            <span className="text-seal-bright font-normal">₹0 Settled</span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedCustomer(cust);
                            }}
                            className="px-2.5 py-1 rounded bg-white/[0.04] hover:bg-white/[0.08] text-white font-semibold text-xs transition-colors"
                          >
                            Inspect 360
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>
      </>
      )}

      {view === "pipeline" && (
        <PipelineBoard
          onOpenCustomer={(customerId) => {
            const found = customers.find((c) => c.id === customerId);
            if (found) setSelectedCustomer(found);
          }}
        />
      )}

        {/* Customer 360 Inspection Drawer */}
        <Drawer
          isOpen={!!selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
          title="Customer Intelligence Dossier"
          subtitle={`AI profile for ${selectedCustomer?.name || "Customer"}`}
          width="md"
        >
          {selectedCustomer && (
            <div className="space-y-6">
              {/* Health Score Gauge */}
              <GlassCard className="p-4 bg-white/[0.02]">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono uppercase text-os-text-dim">
                    Relationship Health
                  </span>
                  <span className="text-base font-bold font-mono text-seal-bright">
                    {selectedCustomer.health_score ?? 85}/100
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.08] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-brass to-seal-bright rounded-full"
                    style={{ width: `${selectedCustomer.health_score ?? 85}%` }}
                  />
                </div>
              </GlassCard>

              {/* AI Compressed Profile Summary */}
              <div>
                <h4 className="text-xs font-mono uppercase text-brass-bright font-semibold mb-2 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  AI Compressed Profile
                </h4>
                <div className="p-4 rounded-xl bg-brass/10 border border-brass/20 text-xs text-white/90 leading-relaxed font-sans">
                  {selectedCustomer.summary ||
                    "Customer interacts primarily through WhatsApp. Responses indicate steady engagement with low dispute probability."}
                </div>
              </div>

              {/* Identity & Channels */}
              <div>
                <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2">
                  Contact Channels
                </h4>
                <div className="space-y-2">
                  {selectedCustomer.identities.map((id, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono"
                    >
                      <span className="text-os-text-dim uppercase text-[10px]">{id.kind}</span>
                      <span className="text-white">{id.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pipeline Stage */}
              <div>
                <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2">
                  Pipeline Stage
                </h4>
                <select
                  value={selectedCustomer.stage || ""}
                  onChange={(e) => handleSetStage(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                >
                  <option value="">No stage set</option>
                  {pipelineStages.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              {/* Deal Value - a forecast the business sets, distinct from a
                  Commitment, which is a promise already read from a message */}
              <div>
                <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2">
                  Deal Value
                </h4>
                <div className="flex gap-1.5">
                  <div className="flex-1 flex items-center px-3 rounded-lg bg-black/40 border border-white/[0.12] focus-within:border-brass">
                    <span className="text-xs text-os-text-dim mr-1">₹</span>
                    <input
                      type="number"
                      min={0}
                      value={newDealValue}
                      onChange={(e) => setNewDealValue(e.target.value)}
                      onBlur={handleSetDealValue}
                      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                      placeholder="What this relationship could be worth"
                      className="w-full py-2 bg-transparent text-xs text-white placeholder:text-os-text-dim outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Tags - confirmed, and suggested awaiting a yes or no */}
              <div>
                <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2 flex items-center gap-1.5">
                  <TagIcon className="w-3.5 h-3.5" />
                  Tags
                </h4>

                {tags.some((t) => t.status === "suggested") && (
                  <div className="mb-2.5 space-y-1.5">
                    {tags.filter((t) => t.status === "suggested").map((t) => (
                      <div
                        key={t.id}
                        className="p-2.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-mono text-amber-300 font-semibold truncate">
                              {t.label}
                            </p>
                            {t.reasoning && (
                              <p className="text-[10px] text-os-text-dim mt-0.5">{t.reasoning}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleConfirmTag(t)}
                              title="Confirm"
                              className="p-1 rounded bg-seal/20 hover:bg-seal/30 text-seal-bright cursor-pointer"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRejectTag(t)}
                              title="Reject"
                              className="p-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-os-text-dim cursor-pointer"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-1.5 mb-2">
                  {tags.filter((t) => t.status === "confirmed").map((t) => (
                    <span
                      key={t.id}
                      className="group inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/[0.06] border border-white/[0.1] text-[11px] font-mono text-white"
                    >
                      {t.label}
                      <button
                        type="button"
                        onClick={() => handleDeleteTag(t)}
                        className="text-os-text-dim hover:text-thread-bright cursor-pointer"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    </span>
                  ))}
                  {!isLoadingCrm && tags.filter((t) => t.status === "confirmed").length === 0 && (
                    <span className="text-[11px] text-os-text-dim">No tags yet.</span>
                  )}
                </div>

                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddTag()}
                    placeholder="Add a tag..."
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={isSavingTag || !newTagLabel.trim()}
                    className="px-2.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Notes - the one part of this CRM that's manual on purpose */}
              <div>
                <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2 flex items-center gap-1.5">
                  <StickyNote className="w-3.5 h-3.5" />
                  Notes
                </h4>
                <div className="flex gap-1.5 mb-2.5">
                  <textarea
                    rows={2}
                    value={newNoteBody}
                    onChange={(e) => setNewNoteBody(e.target.value)}
                    placeholder="Something worth writing down..."
                    className="flex-1 p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={isSavingNote || !newNoteBody.trim()}
                    className="px-2.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white disabled:opacity-40 cursor-pointer shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {notes.map((n) => (
                    <div key={n.id} className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-xs text-white/90 whitespace-pre-wrap">{n.body}</p>
                      <p className="text-[10px] text-os-text-dim mt-1">
                        {n.author_name || "Someone"} · {new Date(n.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                  {!isLoadingCrm && notes.length === 0 && (
                    <p className="text-[11px] text-os-text-dim">No notes yet.</p>
                  )}
                </div>
              </div>

              {/* Quick Navigation Links */}
              <div className="pt-4 border-t border-white/[0.06] space-y-2">
                <Link
                  href={`/conversations`}
                  className="w-full py-2.5 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
                >
                  <MessageSquare className="w-4 h-4" />
                  Open Conversation Timeline
                </Link>

                <Link
                  href={`/ledger?customer_id=${selectedCustomer.id}`}
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
                >
                  <Layers className="w-4 h-4" />
                  Inspect Commitment Ledger
                </Link>
              </div>
            </div>
          )}
        </Drawer>

        <Modal
          isOpen={isImportModalOpen}
          onClose={() => setIsImportModalOpen(false)}
          title="Import Contacts"
          subtitle="A CSV with phone and name columns - a business you're switching from, or a customer list that's never texted this number yet."
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">CSV file</label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleImportFile(file);
                }}
                disabled={isImporting}
                className="w-full text-xs text-white file:mr-3 file:px-3 file:py-2 file:rounded-lg file:border-0 file:bg-brass file:text-white file:text-xs file:font-bold file:cursor-pointer cursor-pointer"
              />
              <p className="text-[11px] text-os-text-dim mt-1.5">
                Expects a header row with <code className="font-mono">phone</code> and, optionally, <code className="font-mono">name</code> columns. No header? The first column is read as phone, the second as name.
              </p>
            </div>

            {isImporting && <p className="text-xs text-brass-bright font-mono">Importing...</p>}
            {importError && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {importError}
              </div>
            )}

            {importResult && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-3 rounded-lg bg-seal/10 border border-seal/20 text-center">
                    <p className="text-lg font-bold text-seal-bright">{importResult.created}</p>
                    <p className="text-[10px] font-mono uppercase text-os-text-dim">Created</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.04] border border-white/[0.08] text-center">
                    <p className="text-lg font-bold text-white">{importResult.already_existed}</p>
                    <p className="text-[10px] font-mono uppercase text-os-text-dim">Already existed</p>
                  </div>
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-center">
                    <p className="text-lg font-bold text-red-400">{importResult.invalid}</p>
                    <p className="text-[10px] font-mono uppercase text-os-text-dim">Invalid</p>
                  </div>
                </div>
                {importResult.invalid > 0 && (
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {importResult.rows
                      .filter((r) => r.outcome === "invalid")
                      .map((r) => (
                        <p key={r.row_number} className="text-[11px] font-mono text-red-400/80">
                          Row {r.row_number} ({r.phone}): {r.reason}
                        </p>
                      ))}
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsImportModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
