"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import { commands, type CommandRecord } from "@/lib/api";

/**
 * The confirm step every owner command goes through. Shows exactly what will
 * change, and nothing runs until the owner taps Confirm. A decided command
 * (done, failed, cancelled) is shown as its outcome, never as a live button.
 */
export function ConfirmCard({
  command,
  onDecided,
}: {
  command: CommandRecord;
  onDecided: (updated: CommandRecord) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const decide = async (action: "confirm" | "cancel") => {
    setBusy(true);
    setError(null);
    try {
      const updated = action === "confirm" ? await commands.confirm(command.id) : await commands.cancel(command.id);
      onDecided(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this command.");
    } finally {
      setBusy(false);
    }
  };

  const isPending = command.status === "pending";

  return (
    <div className="rounded-2xl bg-os-card border border-os-border p-4 space-y-3">
      <p className="text-[10px] font-mono uppercase tracking-wide text-os-text-dim">
        {isPending ? "Confirm karein" : statusLabel(command.status)}
      </p>
      <ul className="space-y-1.5">
        {command.preview.map((line, i) => (
          <li key={i} className="text-xs text-os-ink/90 leading-relaxed">
            {line}
          </li>
        ))}
      </ul>

      {command.status === "failed" && command.error && (
        <p className="text-xs text-rose-400">{command.error}</p>
      )}
      {error && <p className="text-xs text-rose-400">{error}</p>}

      {isPending && (
        <div className="flex gap-2 pt-1">
          <button
            type="button"
            onClick={() => decide("cancel")}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-os-text-dim bg-white/[0.04] border border-os-border flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <X className="w-3.5 h-3.5" /> Cancel
          </button>
          <button
            type="button"
            onClick={() => decide("confirm")}
            disabled={busy}
            className="flex-1 py-2.5 rounded-xl text-xs font-bold text-os-bg bg-teal flex items-center justify-center gap-1.5 disabled:opacity-40"
          >
            <Check className="w-3.5 h-3.5" /> {busy ? "..." : "Confirm"}
          </button>
        </div>
      )}
    </div>
  );
}

function statusLabel(status: CommandRecord["status"]): string {
  if (status === "done") return "Ho gaya";
  if (status === "failed") return "Nahi hua";
  if (status === "cancelled") return "Cancel kiya";
  return "";
}
