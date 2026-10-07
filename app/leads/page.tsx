"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { UserPlus, Search, Zap, ArrowRight } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { leads, type LeadRow, type LeadSourceCount } from "@/lib/api";

const SOURCE_LABEL: Record<string, string> = {
  justdial: "Justdial",
  indiamart: "IndiaMART",
  magicbricks: "Magicbricks",
  "99acres": "99Acres",
  housing: "Housing.com",
  generic: "Other tool",
  other: "Other tool",
  email: "Email forwarding",
  form: "Web form",
};

function sourceLabel(source: string): string {
  return SOURCE_LABEL[source] || source.charAt(0).toUpperCase() + source.slice(1);
}

const STATUS_LABEL: Record<string, string> = {
  received: "Saved",
  duplicate: "Duplicate",
  no_phone: "No phone",
};

const STATUS_BADGE: Record<string, "emerald" | "amber" | "cyan"> = {
  received: "emerald",
  duplicate: "cyan",
  no_phone: "amber",
};

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

const PAGE_SIZE = 25;

export default function LeadsPage() {
  const [rows, setRows] = useState<LeadRow[]>([]);
  const [total, setTotal] = useState(0);
  const [sourceCounts, setSourceCounts] = useState<LeadSourceCount[]>([]);
  const [sourceFilter, setSourceFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    leads.sources().then(setSourceCounts).catch(() => {});
  }, []);

  // Debounced search, same 400ms shape used elsewhere in this app
  // (components/voice/CallCampaignsTab.tsx's own preview debounce).
  useEffect(() => {
    const t = setTimeout(() => {
      setOffset(0);
      setSearch(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    leads
      .list({ source: sourceFilter || undefined, status: statusFilter || undefined, q: search || undefined, limit: PAGE_SIZE, offset })
      .then((result) => {
        if (!mounted) return;
        setRows(result.items);
        setTotal(result.total);
        setLoadError(null);
      })
      .catch((err) => {
        if (mounted) setLoadError(err instanceof Error ? err.message : "Could not load leads.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [sourceFilter, statusFilter, search, offset]);

  const totalLeads = sourceCounts.reduce((sum, s) => sum + s.total, 0);
  const rangeStart = total === 0 ? 0 : offset + 1;
  const rangeEnd = Math.min(offset + PAGE_SIZE, total);

  return (
    <AppLayout>
      <div className="space-y-6 max-w-5xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-os-accent" />
            <h2 className="text-sm font-bold text-white">Leads</h2>
            <span className="text-[11px] text-os-text-dim font-mono">
              {totalLeads} total across every source
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/automations"
              className="flex items-center gap-1.5 text-xs text-os-accent hover:underline"
            >
              <Zap className="w-3.5 h-3.5" />
              Automate what happens when a lead comes in
              <ArrowRight className="w-3 h-3" />
            </Link>
            <Link
              href="/settings"
              className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all"
            >
              Connect a lead source
            </Link>
          </div>
        </div>

        <GlassCard className="p-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-os-text-dim mr-2 shrink-0" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search name, phone, email, or what they asked for..."
                className="w-full bg-transparent text-xs text-white placeholder:text-os-text-dim outline-none"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white"
            >
              <option value="">All sources</option>
              {sourceCounts.map((s) => (
                <option key={s.source} value={s.source}>
                  {sourceLabel(s.source)} ({s.total})
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08] text-xs text-white"
            >
              <option value="">All statuses</option>
              <option value="received">Saved</option>
              <option value="no_phone">No phone</option>
              <option value="duplicate">Duplicate</option>
            </select>
          </div>
        </GlassCard>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : loadError ? (
          <GlassCard className="p-4">
            <p className="text-xs text-red-400">{loadError}</p>
          </GlassCard>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={UserPlus}
            title={totalLeads === 0 ? "No leads yet" : "No leads match these filters"}
            description={
              totalLeads === 0
                ? "Connect Justdial, IndiaMART, a portal webhook, or upload a file to start seeing leads here."
                : "Try a different source, status, or search term."
            }
          />
        ) : (
          <div className="space-y-2">
            {rows.map((lead) => (
              <GlassCard key={lead.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-white">{lead.name || "No name"}</span>
                      <Badge variant="cyan" dot={false}>{sourceLabel(lead.source)}</Badge>
                      <Badge variant={STATUS_BADGE[lead.status] || "amber"} dot>
                        {STATUS_LABEL[lead.status] || lead.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-os-text-dim font-mono">
                      {lead.phone || "No phone number"}
                      {lead.email ? ` · ${lead.email}` : ""}
                    </p>
                    {lead.query && <p className="text-xs text-white/80">{lead.query}</p>}
                  </div>
                  <span className="text-[11px] text-os-text-dim font-mono shrink-0">
                    {timeAgo(lead.received_at)}
                  </span>
                </div>
              </GlassCard>
            ))}

            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-os-text-dim font-mono">
                {total === 0 ? "0 leads" : `Showing ${rangeStart}-${rangeEnd} of ${total}`}
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                  className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
