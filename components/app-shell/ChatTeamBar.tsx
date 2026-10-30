"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, RotateCcw, StickyNote, UserRound } from "lucide-react";
import { conversations, crm, team, type CustomerNote, type TeamMember } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { waitLabel } from "@/lib/chatWait";
import { Sheet } from "@/components/app-shell/Sheet";

/**
 * The team row under a chat's header: who has the chat (tap to hand it to a teammate, take it, or leave it
 * unassigned), how long the customer has waited, a team note that the customer never sees, and Resolve / Reopen.
 */
export function ChatTeamBar({
  customerId, assignedTo, resolved, waitingSince, waitTarget, onAssigned, onResolved, onNote,
}: {
  customerId: string;
  assignedTo: string | null;
  resolved: boolean;
  waitingSince: string | null | undefined;
  waitTarget: number | null | undefined;
  onAssigned: (userId: string | null) => void;
  onResolved: (resolved: boolean) => void;
  onNote: (note: CustomerNote) => void;
}) {
  const me = getUserId();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [assignOpen, setAssignOpen] = useState(false);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, tick] = useState(0);

  useEffect(() => { team.list().then(setMembers).catch(() => {}); }, []);
  // The wait label counts up while the chat is open.
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  const nameOf = (id: string | null) => {
    if (!id) return null;
    if (id === me) return "You";
    const m = members.find((x) => x.user_id === id);
    return m?.full_name || m?.email || "A teammate";
  };
  const wait = waitLabel(waitingSince, waitTarget);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true); setError(null);
    try { await fn(); } catch (e) { setError(e instanceof Error ? e.message : "That did not work."); } finally { setBusy(false); }
  };

  const assign = (userId: string | null) => run(async () => {
    const res = await conversations.assign(customerId, userId ?? undefined);
    onAssigned(res.assigned_to_user_id);
    setAssignOpen(false);
  });

  return (
    <>
      <div className="flex items-center gap-2 px-3 pt-3 flex-wrap">
        <button
          type="button"
          onClick={() => setAssignOpen(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-os-card border border-os-border text-[11px] font-semibold text-os-ink"
        >
          <UserRound className="w-3.5 h-3.5 text-teal" />
          {nameOf(assignedTo) ?? "Unassigned"}
        </button>
        {wait && (
          <span className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${wait.late ? "bg-thread/15 text-thread-bright" : "bg-teal/10 text-teal"}`}>
            {wait.text}
          </span>
        )}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setNoteOpen(true)}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-400/30 text-[11px] font-semibold text-amber-200"
        >
          <StickyNote className="w-3.5 h-3.5" /> Note
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => run(async () => { const r = await conversations.resolve(customerId, !resolved); onResolved(r.resolved); })}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border disabled:opacity-50 ${
            resolved ? "bg-os-card border-os-border text-os-ink" : "bg-teal/10 border-teal/40 text-teal"
          }`}
        >
          {resolved ? <><RotateCcw className="w-3.5 h-3.5" /> Reopen</> : <><CheckCircle2 className="w-3.5 h-3.5" /> Resolve</>}
        </button>
      </div>
      {error && <p className="px-3 pt-1 text-[11px] text-rose-400">{error}</p>}

      <Sheet open={assignOpen} title="Who handles this chat?" onClose={() => setAssignOpen(false)}>
        <div className="divide-y divide-os-border rounded-xl border border-os-border overflow-hidden">
          {[...members].sort((a, b) => (a.user_id === me ? -1 : b.user_id === me ? 1 : 0)).map((m) => (
            <button
              key={m.user_id}
              type="button"
              disabled={busy || m.user_id === assignedTo}
              onClick={() => assign(m.user_id)}
              className="w-full flex items-center justify-between gap-3 px-3.5 py-3 text-left bg-os-card disabled:opacity-60"
            >
              <span className="min-w-0">
                <span className="block text-sm text-os-ink truncate">{m.user_id === me ? "Me" : m.full_name || m.email}</span>
                <span className="block text-[11px] text-os-text-dim">{m.role}{m.available === false ? " · Away" : ""}</span>
              </span>
              {m.user_id === assignedTo && <span className="text-[11px] text-teal font-semibold">Has it</span>}
            </button>
          ))}
        </div>
        {assignedTo && (
          <button type="button" disabled={busy} onClick={() => assign(null)} className="mt-3 w-full py-2.5 rounded-xl border border-os-border text-xs font-semibold text-os-text-dim">
            Leave unassigned
          </button>
        )}
        <p className="mt-3 text-[11px] text-os-text-dim">The person you choose gets a notification. Away teammates can still be given a chat.</p>
      </Sheet>

      <Sheet open={noteOpen} title="Team note" onClose={() => setNoteOpen(false)}>
        <textarea
          rows={4}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={2000}
          placeholder="Only your team sees this, e.g. Promised 10% off on the next visit."
          className="w-full px-3 py-2.5 rounded-xl bg-os-card border border-os-border text-sm text-os-ink placeholder:text-os-text-dim focus:border-teal focus:outline-none"
        />
        <button
          type="button"
          disabled={busy || !note.trim()}
          onClick={() => run(async () => { const saved = await crm.addNote(customerId, note.trim()); onNote(saved); setNote(""); setNoteOpen(false); })}
          className="mt-3 w-full py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40"
        >
          Save note
        </button>
        <p className="mt-2 text-[11px] text-os-text-dim">The customer never sees team notes. They show in this chat and on the customer&apos;s page.</p>
      </Sheet>
    </>
  );
}
