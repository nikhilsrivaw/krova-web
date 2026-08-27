"use client";

import React, { useEffect, useState } from "react";
import { GripVertical, IndianRupee } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/EmptyState";
import { crm, formatPaise, type PipelineBoard as PipelineBoardData, type PipelineCard } from "@/lib/api";

/**
 * The pipeline as a board, not a table - a funnel-shaped business (a coach
 * signing up clients, an agency closing accounts) thinks in stages someone
 * drags a card across, not rows to filter. A clinic that has no real use for
 * this never opens it; the toggle back to List costs nothing.
 */
export function PipelineBoard({ onOpenCustomer }: { onOpenCustomer: (customerId: string) => void }) {
  const [board, setBoard] = useState<PipelineBoardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    crm
      .pipeline()
      .then((b) => {
        setBoard(b);
        setLoadError(null);
      })
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load the pipeline."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const moveCard = (card: PipelineCard, fromStage: string | null, toStage: string | null) => {
    if (fromStage === toStage || !board) return;

    // Optimistic: pull the card out of its old column, drop it in the new
    // one, adjust both totals - the drag should feel instant, not wait on
    // a round trip before the card moves.
    setBoard({
      columns: board.columns.map((col) => {
        if (col.stage === fromStage) {
          return {
            ...col,
            customers: col.customers.filter((c) => c.customer_id !== card.customer_id),
            total_deal_value_paise: col.total_deal_value_paise - (card.deal_value_paise || 0),
          };
        }
        if (col.stage === toStage) {
          return {
            ...col,
            customers: [card, ...col.customers],
            total_deal_value_paise: col.total_deal_value_paise + (card.deal_value_paise || 0),
          };
        }
        return col;
      }),
    });

    crm.setStage(card.customer_id, toStage).catch(() => load());
  };

  if (isLoading && !board) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (loadError && !board) {
    return <p className="text-xs text-red-400">{loadError}</p>;
  }

  if (!board) return null;

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {board.columns.map((col) => (
        <div
          key={col.stage ?? "__unstaged"}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverStage(col.stage ?? "__unstaged");
          }}
          onDragLeave={() => setDragOverStage((s) => (s === (col.stage ?? "__unstaged") ? null : s))}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverStage(null);
            const raw = e.dataTransfer.getData("application/json");
            if (!raw) return;
            const { card, fromStage } = JSON.parse(raw) as { card: PipelineCard; fromStage: string | null };
            moveCard(card, fromStage, col.stage);
          }}
          className={`w-64 shrink-0 rounded-xl border transition-colors ${
            dragOverStage === (col.stage ?? "__unstaged")
              ? "border-brass/50 bg-brass/[0.04]"
              : "border-white/[0.06] bg-os-card"
          }`}
        >
          <div className="p-3 border-b border-white/[0.06]">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white">{col.stage ?? "Unstaged"}</span>
              <span className="text-[10px] font-mono text-os-text-dim">{col.customers.length}</span>
            </div>
            {col.total_deal_value_paise > 0 && (
              <p className="text-[11px] font-mono text-seal-bright mt-0.5 flex items-center gap-0.5">
                <IndianRupee className="w-2.5 h-2.5" />
                {formatPaise(col.total_deal_value_paise)}
              </p>
            )}
          </div>

          <div className="p-2 space-y-2 min-h-[6rem]">
            {col.customers.map((card) => (
              <div
                key={card.customer_id}
                draggable
                onDragStart={(e) => {
                  setDraggingId(card.customer_id);
                  e.dataTransfer.setData(
                    "application/json",
                    JSON.stringify({ card, fromStage: col.stage }),
                  );
                }}
                onDragEnd={() => setDraggingId(null)}
                onClick={() => onOpenCustomer(card.customer_id)}
                className={`p-2.5 rounded-lg bg-white/[0.03] border border-white/[0.08] hover:border-white/[0.16] cursor-pointer group transition-opacity ${
                  draggingId === card.customer_id ? "opacity-40" : "opacity-100"
                }`}
              >
                <div className="flex items-start gap-1.5">
                  <GripVertical className="w-3 h-3 text-os-text-dim mt-0.5 opacity-0 group-hover:opacity-100 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-white truncate">
                      {card.name || "Unnamed contact"}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      {card.health_score != null && (
                        <Badge
                          variant={card.health_score >= 75 ? "emerald" : card.health_score >= 50 ? "amber" : "rose"}
                          size="sm"
                        >
                          {card.health_score}
                        </Badge>
                      )}
                      {card.deal_value_paise ? (
                        <span className="text-[10px] font-mono text-os-text-dim">
                          {formatPaise(card.deal_value_paise)}
                        </span>
                      ) : null}
                    </div>
                    {card.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {card.tags.slice(0, 3).map((t) => (
                          <span key={t} className="px-1.5 py-0.5 rounded bg-white/[0.06] text-[9px] font-mono text-os-text-dim">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {col.customers.length === 0 && (
              <p className="text-[11px] text-os-text-dim px-1 py-2">Drop a card here</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
