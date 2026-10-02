"use client";

import { useEffect, useState } from "react";
import { Siren, Check, MessageSquare, Phone, Mail } from "lucide-react";
import { escalations, type EscalationRow } from "@/lib/api";
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

  useEffect(() => {
    escalations
      .list(false)
      .then(setRows)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const handleAcknowledge = async (id: string) => {
    setActioningId(id);
    try {
      await escalations.acknowledge(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
    } catch {
      /* stays in the list - retry on tap */
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
                <p className="px-4 pb-3 text-xs text-os-ink/90 leading-relaxed">{r.reason}</p>
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
