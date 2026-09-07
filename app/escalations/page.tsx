"use client";

import React, { useEffect, useState } from "react";
import { Siren, Check, Clock } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { escalations, type EscalationRow } from "@/lib/api";

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export default function EscalationsPage() {
  const [openList, setOpenList] = useState<EscalationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [acknowledgingId, setAcknowledgingId] = useState<string | null>(null);

  const load = async () => {
    try {
      const rows = await escalations.list(false);
      setOpenList(rows);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load escalations.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleAcknowledge = async (id: string) => {
    setAcknowledgingId(id);
    try {
      await escalations.acknowledge(id);
      setOpenList((prev) => prev.filter((e) => e.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not acknowledge.");
    } finally {
      setAcknowledgingId(null);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <Siren className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Escalations</h1>
            <p className="text-xs text-os-text-dim font-mono">
              Every time the agent couldn&apos;t handle something on its own. Unacknowledged for 15+ minutes gets a text to whoever&apos;s on staff_phone_number.
            </p>
          </div>
        </div>

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        )}

        {loadError && (
          <div className="p-4 rounded-xl bg-rose-500/[0.06] border border-rose-500/[0.2] text-rose-400 text-sm">
            {loadError}
          </div>
        )}

        {!isLoading && !loadError && openList.length === 0 && (
          <EmptyState
            icon={Check}
            title="No open escalations"
            description="Every escalation the agent has raised has been acknowledged."
          />
        )}

        <div className="space-y-3">
          {openList.map((e) => (
            <GlassCard key={e.id} className="p-4 flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="rose" dot>
                    {e.channel}
                  </Badge>
                  <span className="text-[11px] text-os-text-dim font-mono flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {timeAgo(e.created_at)}
                  </span>
                  {e.escalated_further_at && (
                    <Badge variant="amber" dot>
                      SMS sent
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-white">{e.reason}</p>
              </div>
              <button
                type="button"
                onClick={() => handleAcknowledge(e.id)}
                disabled={acknowledgingId === e.id}
                className="flex-shrink-0 px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
              >
                {acknowledgingId === e.id ? "…" : "Acknowledge"}
              </button>
            </GlassCard>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
