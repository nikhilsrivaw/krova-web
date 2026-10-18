"use client";

import { useEffect, useState } from "react";
import { cannedResponses, type CannedResponse } from "@/lib/api";
import { Sheet } from "./Sheet";

/** Saved replies (Settings / WhatsApp page): tap one to put it in the reply box, where it can still be changed. */
export function SavedRepliesSheet({
  open, onClose, onPick,
}: { open: boolean; onClose: () => void; onPick: (body: string) => void }) {
  const [list, setList] = useState<CannedResponse[] | null>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!open || list) return;
    cannedResponses.list().then(setList).catch(() => setList([]));
  }, [open, list]);

  const q = query.trim().toLowerCase();
  const shown = (list ?? []).filter((c) => !q || c.title.toLowerCase().includes(q) || c.body.toLowerCase().includes(q));

  return (
    <Sheet open={open} title="Saved replies" onClose={onClose}>
      {list === null ? (
        <p className="text-xs text-os-text-dim">Loading…</p>
      ) : list.length === 0 ? (
        <p className="text-xs text-os-text-dim">No saved replies yet. Add them on the WhatsApp page (Saved Replies).</p>
      ) : (
        <div className="space-y-2">
          {list.length > 5 && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search"
              className="w-full px-3 py-2 rounded-xl bg-black/40 border border-os-border text-xs text-os-ink focus:border-teal focus:outline-none"
            />
          )}
          {shown.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => { onPick(c.body); onClose(); }}
              className="w-full text-left p-3 rounded-xl bg-black/30 border border-os-border active:bg-white/[0.04]"
            >
              <p className="text-xs font-semibold text-os-ink">{c.title}</p>
              <p className="text-[11px] text-os-text-dim mt-0.5 line-clamp-2">{c.body}</p>
            </button>
          ))}
        </div>
      )}
    </Sheet>
  );
}
