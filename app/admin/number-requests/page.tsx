"use client";

import React, { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { numberRequests, type NumberRequest, type NumberRequestStatus } from "@/lib/api";

// Deliberately not linked from the sidebar - this is Krova's own operator
// queue for 140/160-series number requests, not a business-facing
// capability. Gated server-side by PLATFORM_ADMIN_EMAIL; a non-admin
// hitting this page just sees every request fail to load.

const STATUS_OPTIONS: NumberRequestStatus[] = [
  "requested", "submitted_to_plivo", "provisioned", "rejected",
];

const STATUS_VARIANT: Record<NumberRequestStatus, "emerald" | "amber" | "rose" | "cyan"> = {
  requested: "amber",
  submitted_to_plivo: "cyan",
  provisioned: "emerald",
  rejected: "rose",
};

export default function NumberRequestsAdminPage() {
  const [requests, setRequests] = useState<NumberRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, { admin_notes: string; provisioned_number: string }>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await numberRequests.listAll();
      setRequests(data);
      setDrafts(
        Object.fromEntries(
          data.map((r) => [r.id, { admin_notes: r.admin_notes || "", provisioned_number: r.provisioned_number || "" }])
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load number requests - are you the platform admin?");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleUpdate = async (id: string, status?: NumberRequestStatus) => {
    setBusy(id);
    try {
      const draft = drafts[id] || { admin_notes: "", provisioned_number: "" };
      const updated = await numberRequests.update(id, {
        ...(status ? { status } : {}),
        admin_notes: draft.admin_notes,
        provisioned_number: draft.provisioned_number,
      });
      setRequests((prev) => prev.map((r) => (r.id === id ? updated : r)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this request.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppLayout
      title="Number Request Queue"
      subtitle="Every business's 140/160-series requests - work through these whenever you're coordinating with Plivo"
    >
      <div className="max-w-4xl mx-auto space-y-4">
        {error && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {!isLoading && requests.length === 0 && !error && (
          <GlassCard className="p-6">
            <EmptyState icon={ShieldAlert} title="No pending requests" description="Nothing in the queue right now." />
          </GlassCard>
        )}

        {requests.map((r) => {
          const draft = drafts[r.id] || { admin_notes: "", provisioned_number: "" };
          return (
            <GlassCard key={r.id} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-white">
                    {r.request_type === "promotional_140" ? "140-series" : "160-series"}
                    {r.bfsi_declaration && r.request_type === "transactional_160" && (
                      <span className="ml-2 text-[10px] font-mono text-cyan-400">BFSI declared</span>
                    )}
                  </p>
                  <p className="text-[11px] font-mono text-os-text-dim">business {r.business_id}</p>
                </div>
                <Badge variant={STATUS_VARIANT[r.status]}>{r.status}</Badge>
              </div>

              <p className="text-xs text-os-text-dim">{r.justification}</p>

              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={draft.provisioned_number}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], provisioned_number: e.target.value } }))
                  }
                  placeholder="Provisioned number (once you have one)"
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                />
                <input
                  type="text"
                  value={draft.admin_notes}
                  onChange={(e) =>
                    setDrafts((prev) => ({ ...prev, [r.id]: { ...prev[r.id], admin_notes: e.target.value } }))
                  }
                  placeholder="Your notes (Plivo ticket ref, rejection reason...)"
                  className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => handleUpdate(r.id, s)}
                    disabled={busy === r.id}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-mono transition-all ${
                      r.status === s
                        ? "bg-white text-black font-bold"
                        : "bg-white/[0.04] text-os-text-dim hover:text-white"
                    }`}
                  >
                    {s}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => handleUpdate(r.id)}
                  disabled={busy === r.id}
                  className="ml-auto px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-bold cursor-pointer"
                >
                  {busy === r.id ? "Saving..." : "Save notes/number"}
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </AppLayout>
  );
}
