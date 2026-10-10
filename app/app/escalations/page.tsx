"use client";

import { useEffect, useState } from "react";
import { Siren, Check, MessageSquare, Phone, Mail } from "lucide-react";
import { account, assignedToOther, escalations, type EscalationRow } from "@/lib/api";
import { getUserId } from "@/lib/auth";
import { appPath } from "@/lib/app-nav";

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: MessageSquare,
  voice: Phone,
  email: Mail,
};

function timeAgo(iso: string): string {
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/**
 * Things the AI couldn't handle and flagged for a human - the one screen
 * in the app where "needs a human, now" is the entire point, so it's its
 * own place rather than folded into Approvals (which is routine draft
 * review, a different kind of attention).
 */
export default function AppEscalationsPage() {
  const [rows, setRows] = useState<EscalationRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const me = getUserId();

  useEffect(() => {
    // Unseen ones, plus the ones I have claimed (claiming also marks them seen,
    // so they would otherwise vanish from my own list the moment I took them).
    Promise.all([
      escalations.list(false),
      escalations.list(true, "mine").catch(() => [] as EscalationRow[]),
    ])
      .then(([open, mine]) => {
        const held = mine.filter((r) => r.status === "open" || r.status === "in_progress");
        const seen = new Set(open.map((r) => r.id));
        setRows([...open, ...held.filter((r) => !seen.has(r.id))]);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
    account.profile().then((p) => setIsSupervisor(p.role === "owner" || p.role === "admin")).catch(() => {});
  }, []);

  const handleClaim = async (r: EscalationRow, force = false) => {
    setActioningId(r.id);
    setError(null);
    try {
      const updated = await escalations.claim(r.id, force);
      setRows((prev) => prev.map((x) => (x.id === r.id ? updated : x)));
    } catch (err) {
      const other = assignedToOther(err);
      setError(other ? `${other.name} already has this one.` : err instanceof Error ? err.message : "Could not take this.");
    } finally {
      setActioningId(null);
    }
  };

  const handleAcknowledge = async (id: string) => {
    setActioningId(id);
    try {
      await escalations.acknowledge(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not acknowledge this.");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-1 flex items-center gap-2">
        <Siren className="w-4 h-4 text-thread-bright" />
        Escalations
      </h1>
      <p className="text-xs text-os-text-dim mb-5">Flagged for a human - nothing was sent automatically.</p>
      {error && (
        <div role="alert" className="mb-3 px-3.5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-100">{error}</div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <Check className="w-8 h-8 text-teal mx-auto mb-3 opacity-60" />
          <p className="text-sm text-os-text-dim">Nothing escalated right now.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {rows.map((r) => {
            const ChannelIcon = CHANNEL_ICONS[r.channel] || MessageSquare;
            return (
              <div key={r.id} className="rounded-2xl bg-thread/[0.06] border border-thread/25 overflow-hidden">
                <div className="px-4 pt-3 pb-2 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-thread-bright">
                    <ChannelIcon className="w-3 h-3" />
                    {r.channel}
                  </span>
                  <span className="text-[10px] text-os-text-dim">{timeAgo(r.created_at)}</span>
                </div>
                <p className="px-4 pb-2 text-xs text-os-ink/90 leading-relaxed">{r.reason}</p>
                <p className="px-4 pb-3 text-[11px]">
                  {r.assigned_to_user_id ? (
                    <span className={r.assigned_to_user_id === me ? "text-teal font-semibold" : "text-amber-300"}>
                      {r.assigned_to_user_id === me ? "You have this" : `With ${r.assigned_to_name ?? "a teammate"}`}
                    </span>
                  ) : (
                    <span className="text-os-text-dim">Nobody has this yet</span>
                  )}
                </p>
                {(!r.assigned_to_user_id || (r.assigned_to_user_id !== me && isSupervisor)) && (
                  <button
                    type="button"
                    disabled={actioningId === r.id}
                    onClick={() => handleClaim(r, !!r.assigned_to_user_id)}
                    className="w-full py-2.5 border-t border-thread/15 text-xs font-bold text-teal active:bg-teal/5 disabled:opacity-40"
                  >
                    {r.assigned_to_user_id ? `Take over from ${r.assigned_to_name ?? "teammate"}` : "I have got this"}
                  </button>
                )}
                <div className="flex border-t border-thread/15">
                  {r.customer_id && (
                    <a
                      href={appPath(`/inbox/${r.customer_id}`)}
                      className="flex-1 py-2.5 text-center text-xs font-semibold text-os-text-dim active:bg-white/[0.03]"
                    >
                      Open chat
                    </a>
                  )}
                  <button
                    type="button"
                    disabled={actioningId === r.id}
                    onClick={() => handleAcknowledge(r.id)}
                    className={`flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-thread-bright active:bg-thread/5 disabled:opacity-40 ${
                      r.customer_id ? "border-l border-thread/15" : ""
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" />
                    {actioningId === r.id ? "..." : "Acknowledge"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
