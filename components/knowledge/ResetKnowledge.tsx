"use client";

import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
import { knowledge } from "@/lib/api";

const WORD = "DELETE";

/**
 * Owner only: wipe everything on this page in one go - both cards, Catalogue, fees, Question bank, other entries and
 * the Unanswered Gaps queue - to start again. Asks for the word typed, because it cannot be undone.
 */
export function ResetKnowledge({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  const close = () => { setOpen(false); setTyped(""); setError(null); };

  const reset = async () => {
    setBusy(true); setError(null);
    try {
      const out = await knowledge.reset(typed);
      setNote(`Deleted ${out.items} saved entr${out.items === 1 ? "y" : "ies"} and ${out.gaps} gap${out.gaps === 1 ? "" : "s"}.`);
      close();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <GlassCard className="p-5 border border-red-500/20 flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h4 className="text-sm font-bold text-white">Delete all knowledge</h4>
          <p className="text-[11px] text-os-text-dim max-w-xl">
            Removes everything saved on this page and empties the Unanswered Gaps queue, so you can start again.
            Only the owner can do this, and it cannot be undone.
          </p>
          {note && <p className="text-xs text-emerald-300">{note}</p>}
        </div>
        <button type="button" onClick={() => { setNote(null); setOpen(true); }}
          className="px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-200 text-xs font-bold flex items-center gap-1.5 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" /> Delete all knowledge
        </button>
      </GlassCard>

      <Modal isOpen={open} onClose={close} title="Delete all knowledge?" subtitle="This cannot be undone." maxWidth="md">
        <div className="space-y-4 text-xs text-white/90">
          <div className="space-y-1.5">
            <p>This deletes:</p>
            <ul className="list-disc pl-5 space-y-0.5 text-os-text-dim">
              <li>the Business card and the Team card</li>
              <li>the Catalogue and the Fees / Price list</li>
              <li>the Question bank and other entries</li>
              <li>everything in the Unanswered Gaps queue</li>
            </ul>
            <p className="text-os-text-dim">
              Kept: your &quot;Always hand this to me&quot; rules, so the AI still passes those questions to you.
              Until you add knowledge again, the AI will hand over more questions it can no longer answer.
            </p>
          </div>
          <label className="block space-y-1">
            <span className="text-os-text-dim">Type <span className="font-mono font-bold text-white">{WORD}</span> to confirm</span>
            <input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus
              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-red-400 focus:outline-none" />
          </label>
          {error && <p className="text-red-400">{error}</p>}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={close} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white cursor-pointer">
              Cancel
            </button>
            <button type="button" onClick={reset} disabled={busy || typed.trim().toUpperCase() !== WORD}
              className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold cursor-pointer disabled:opacity-40">
              {busy ? "Deleting..." : "Delete everything"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
