"use client";

import { useEffect, useState } from "react";
import { Check, X, Pencil, AlertTriangle, Clock } from "lucide-react";
import { approvals, assignedToOther, conversations, type MessageDraft } from "@/lib/api";

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  voice: "Voice",
  email: "Email",
};

export default function ApprovalsPage() {
  const [drafts, setDrafts] = useState<MessageDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ customerId: string; name: string } | null>(null);

  const fail = (id: string, err: unknown, fallback: string) => {
    const other = assignedToOther(err);
    const customerId = drafts.find((d) => d.id === id)?.customer_id;
    setConflict(other && customerId ? { customerId, name: other.name } : null);
    setError(err instanceof Error ? err.message : fallback);
  };

  const takeOver = async () => {
    if (!conflict) return;
    try {
      await conversations.takeOver(conflict.customerId);
      setConflict(null);
      setError("It is yours now - tap again to send or reject.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not take over this chat.");
    }
  };

  const load = () => {
    approvals
      .list("pending")
      .then(setDrafts)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  };

  useEffect(load, []);

  const handleApprove = async (id: string) => {
    setActioningId(id);
    setError(null);
    setConflict(null);
    try {
      await approvals.approve(id, editingId === id ? editedText : undefined);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      setEditingId(null);
    } catch (err) {
      fail(id, err, "Could not send this."); // the draft stays in the list
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActioningId(id);
    setError(null);
    setConflict(null);
    try {
      await approvals.reject(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch (err) {
      fail(id, err, "Could not reject this."); // the draft stays in the list
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-4">Approvals</h1>

      {error && (
        <div role="alert" className="mb-3 p-3 rounded-xl bg-amber-500/10 border border-amber-400/30 text-xs text-amber-100 space-y-2">
          <p>{error}</p>
          {conflict && (
            <button type="button" onClick={takeOver} className="w-full py-2 rounded-lg bg-amber-400/20 border border-amber-300/40 font-semibold active:scale-[0.98]">
              Take over from {conflict.name}
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 rounded-2xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : drafts.length === 0 ? (
        <div className="text-center py-16">
          <Check className="w-8 h-8 text-teal mx-auto mb-3 opacity-60" />
          <p className="text-sm text-os-text-dim">All caught up. Nothing waiting.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {drafts.map((d) => (
            <div key={d.id} className="rounded-2xl bg-os-card border border-os-border overflow-hidden">
              <div className="px-4 pt-3.5 pb-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-os-ink">
                    {d.customer_name || "Unknown customer"}
                  </span>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.06] text-os-text-dim">
                    {CHANNEL_LABEL[d.channel] || d.channel}
                  </span>
                </div>
                {d.low_confidence && (
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                )}
              </div>

              {d.replying_to && (
                <div className="mx-4 mb-2 p-2.5 rounded-lg bg-white/[0.03] border-l-2 border-os-border">
                  <p className="text-[11px] text-os-text-dim line-clamp-2">{d.replying_to}</p>
                </div>
              )}

              <div className="px-4 pb-3">
                {d.action === "escalate" ? (
                  <p className="text-xs text-thread-bright">
                    Escalated - {d.gap || "needs a human"}
                  </p>
                ) : editingId === d.id ? (
                  <textarea
                    autoFocus
                    rows={3}
                    value={editedText}
                    onChange={(e) => setEditedText(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-teal/40 text-xs text-os-ink focus:outline-none resize-none"
                  />
                ) : (
                  <p className="text-xs text-os-ink/90 leading-relaxed whitespace-pre-wrap">
                    {d.body}
                  </p>
                )}
              </div>

              {d.action === "reply" && (
                <div className="flex items-center border-t border-os-border">
                  <button
                    type="button"
                    onClick={() => handleReject(d.id)}
                    disabled={actioningId === d.id}
                    className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-os-text-dim active:bg-white/[0.03] disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <div className="w-px h-5 bg-os-border" />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingId === d.id) {
                        setEditingId(null);
                      } else {
                        setEditingId(d.id);
                        setEditedText(d.body || "");
                      }
                    }}
                    className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-semibold text-os-text-dim active:bg-white/[0.03]"
                  >
                    <Pencil className="w-3.5 h-3.5" /> {editingId === d.id ? "Cancel" : "Edit"}
                  </button>
                  <div className="w-px h-5 bg-os-border" />
                  <button
                    type="button"
                    onClick={() => handleApprove(d.id)}
                    disabled={actioningId === d.id}
                    className="flex-1 py-3 flex items-center justify-center gap-1.5 text-xs font-bold text-teal active:bg-teal/5 disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {actioningId === d.id ? "..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
