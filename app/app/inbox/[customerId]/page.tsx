"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Phone,
  Mail,
  Volume2,
  Send,
  Lock,
  Check,
  X,
  Pencil,
  AlertTriangle,
  Layers,
} from "lucide-react";
import {
  conversations,
  channels,
  approvals,
  formatPaise,
  type ConversationThread,
  type MessageDraft,
  type Identity,
} from "@/lib/api";
import { appPath } from "@/lib/app-nav";

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: MessageSquare,
  voice: Phone,
  email: Mail,
};

function phoneOf(identities: Identity[]): string | null {
  return identities.find((i) => i.kind === "phone")?.value || null;
}

function igsidOf(identities: Identity[]): string | null {
  return identities.find((i) => i.kind === "instagram")?.value || null;
}

/**
 * The app's own conversation thread - everything a person needs to handle
 * one customer (messages, reply, commitments, the pending drafts Approvals
 * already has queued for them) in one self-contained screen. This is what
 * replaced linking out to the desktop /conversations page: tapping a
 * conversation in the app must stay in the app.
 */
export default function AppConversationThreadPage() {
  const params = useParams<{ customerId: string }>();
  const router = useRouter();
  const customerId = params.customerId;

  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [pendingDrafts, setPendingDrafts] = useState<MessageDraft[]>([]);
  const [actioningDraftId, setActioningDraftId] = useState<string | null>(null);
  const [editingDraftId, setEditingDraftId] = useState<string | null>(null);
  const [editedDraftText, setEditedDraftText] = useState("");

  const [replyBody, setReplyBody] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);

  const [showCommitments, setShowCommitments] = useState(false);

  useEffect(() => {
    if (!customerId) return;
    let mounted = true;
    setIsLoading(true);
    setLoadError(null);
    conversations
      .thread(customerId)
      .then((data) => {
        if (mounted) setThread(data);
      })
      .catch((err) => {
        if (mounted) setLoadError(err instanceof Error ? err.message : "Could not load this conversation.");
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    approvals
      .list("pending")
      .then((drafts) => {
        if (mounted) setPendingDrafts(drafts.filter((d) => d.customer_id === customerId));
      })
      .catch(() => {
        /* the thread itself still loads fine without this */
      });
    return () => {
      mounted = false;
    };
  }, [customerId]);

  const handleApproveDraft = async (id: string) => {
    setActioningDraftId(id);
    try {
      await approvals.approve(id, editingDraftId === id ? editedDraftText : undefined);
      setPendingDrafts((prev) => prev.filter((d) => d.id !== id));
      setEditingDraftId(null);
    } catch {
      /* stays in the list - retry on click */
    } finally {
      setActioningDraftId(null);
    }
  };

  const handleRejectDraft = async (id: string) => {
    setActioningDraftId(id);
    try {
      await approvals.reject(id);
      setPendingDrafts((prev) => prev.filter((d) => d.id !== id));
    } catch {
      /* stays in the list */
    } finally {
      setActioningDraftId(null);
    }
  };

  const handleSendReply = async () => {
    if (!thread || !replyBody.trim()) return;
    const phone = phoneOf(thread.identities);
    const igsid = igsidOf(thread.identities);
    setIsSendingReply(true);
    setReplyError(null);
    try {
      if (phone) {
        await channels.sendText(phone, replyBody.trim());
      } else if (igsid) {
        await channels.sendInstagramText(igsid, replyBody.trim());
      } else {
        setReplyError("No WhatsApp or Instagram identity on this conversation.");
        return;
      }
      const sentAt = new Date().toISOString();
      setThread((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: `local-${sentAt}`,
                  channel: phone ? "whatsapp" : "instagram",
                  direction: "outbound",
                  text: replyBody.trim(),
                  subject: null,
                  media: {},
                  occurred_at: sentAt,
                  analysed: false,
                },
              ],
            }
          : prev,
      );
      setReplyBody("");
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : "Could not send this reply.");
    } finally {
      setIsSendingReply(false);
    }
  };

  const canReply = thread && (phoneOf(thread.identities) || igsidOf(thread.identities));

  return (
    <div>
      {/* main (app/app/layout.tsx) is the one scroll container - sticky
          here anchors to it, avoiding a nested scroll area inside it. */}
      <div className="sticky top-0 z-10 flex items-center gap-2.5 px-3 py-3 bg-os-bg/95 backdrop-blur-xl border-b border-os-border">
        <button
          type="button"
          onClick={() => router.push(appPath("/inbox"))}
          className="p-1.5 -ml-1.5 rounded-lg active:bg-white/[0.06]"
        >
          <ArrowLeft className="w-4 h-4 text-os-ink" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-os-ink truncate flex items-center gap-1.5">
            {thread?.is_private && <Lock className="w-3 h-3 text-os-text-dim shrink-0" />}
            {thread?.name || "Customer"}
          </p>
          {thread && (
            <p className="text-[10px] text-os-text-dim">
              {thread.window_open ? "Reply window open" : "24h window closed"}
            </p>
          )}
        </div>
        {thread && thread.commitments.length > 0 && (
          <button
            type="button"
            onClick={() => setShowCommitments((v) => !v)}
            className="shrink-0 px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-[11px] font-semibold text-os-ink flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5 text-teal" />
            {thread.commitments.length}
          </button>
        )}
      </div>

      {showCommitments && thread && thread.commitments.length > 0 && (
        <div className="px-3 pt-3 space-y-2 border-b border-os-border pb-3">
          {thread.commitments.map((c) => (
            <div key={c.id} className="p-3 rounded-xl bg-os-card border border-os-border text-xs space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-os-ink/90 truncate">{c.description || "—"}</span>
                <span
                  className={`shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded ${
                    c.status === "met"
                      ? "bg-emerald-500/15 text-emerald-300"
                      : c.status === "missed"
                      ? "bg-rose-500/15 text-rose-300"
                      : "bg-amber-500/15 text-amber-300"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-os-text-dim">
                <span>{c.direction === "they_owe" ? "They owe" : "We owe"}</span>
                {c.amount_paise != null && <span className="text-os-ink">{formatPaise(c.amount_paise)}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {pendingDrafts.length > 0 && (
        <div className="px-3 pt-3 space-y-2.5 border-b border-os-border pb-3">
          {pendingDrafts.map((d) => (
            <div key={d.id} className="rounded-2xl bg-teal/[0.06] border border-teal/25 overflow-hidden">
              <div className="px-3.5 pt-2.5 pb-1.5 flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wide text-teal-bright">
                <Pencil className="w-3 h-3" />
                Draft waiting on you
                {d.low_confidence && <AlertTriangle className="w-3 h-3 text-amber-400 ml-1" />}
              </div>
              <div className="px-3.5 pb-2.5">
                {editingDraftId === d.id ? (
                  <textarea
                    autoFocus
                    rows={3}
                    value={editedDraftText}
                    onChange={(e) => setEditedDraftText(e.target.value)}
                    className="w-full p-2.5 rounded-lg bg-black/40 border border-teal/40 text-xs text-os-ink focus:outline-none resize-none"
                  />
                ) : (
                  <p className="text-xs text-os-ink/90 leading-relaxed whitespace-pre-wrap">{d.body}</p>
                )}
              </div>
              {d.action === "reply" && (
                <div className="flex items-center border-t border-teal/15">
                  <button
                    type="button"
                    onClick={() => handleRejectDraft(d.id)}
                    disabled={actioningDraftId === d.id}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-os-text-dim active:bg-white/[0.03] disabled:opacity-40"
                  >
                    <X className="w-3.5 h-3.5" /> Reject
                  </button>
                  <div className="w-px h-5 bg-teal/15" />
                  <button
                    type="button"
                    onClick={() => {
                      if (editingDraftId === d.id) {
                        setEditingDraftId(null);
                      } else {
                        setEditingDraftId(d.id);
                        setEditedDraftText(d.body || "");
                      }
                    }}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-semibold text-os-text-dim active:bg-white/[0.03]"
                  >
                    <Pencil className="w-3.5 h-3.5" /> {editingDraftId === d.id ? "Cancel" : "Edit"}
                  </button>
                  <div className="w-px h-5 bg-teal/15" />
                  <button
                    type="button"
                    onClick={() => handleApproveDraft(d.id)}
                    disabled={actioningDraftId === d.id}
                    className="flex-1 py-2.5 flex items-center justify-center gap-1.5 text-xs font-bold text-teal active:bg-teal/5 disabled:opacity-40"
                  >
                    <Check className="w-3.5 h-3.5" />
                    {actioningDraftId === d.id ? "..." : "Send"}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="px-3 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-14 w-3/4 rounded-2xl bg-os-card animate-pulse" />
            ))}
          </div>
        ) : loadError ? (
          <p className="text-center text-xs text-rose-400 py-8">{loadError}</p>
        ) : !thread || thread.messages.length === 0 ? (
          <p className="text-center text-xs text-os-text-dim py-12">No messages yet.</p>
        ) : (
          thread.messages.map((msg) => {
            const isOutbound = msg.direction === "outbound";
            const ChannelIcon = CHANNEL_ICONS[msg.channel] || MessageSquare;
            return (
              <div key={msg.id} className={`flex flex-col ${isOutbound ? "items-end" : "items-start"}`}>
                <div className="flex items-center gap-1 mb-1 px-1">
                  <ChannelIcon className="w-2.5 h-2.5 text-os-text-dim" />
                  <span className="text-[9px] font-mono text-os-text-dim">
                    {new Date(msg.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-xs leading-relaxed ${
                    msg.channel === "voice"
                      ? "bg-cyan-950/30 border border-cyan-500/30 text-os-ink rounded-tl-sm"
                      : isOutbound
                      ? "bg-teal text-os-bg rounded-tr-sm font-medium"
                      : "bg-os-card border border-os-border text-os-ink/90 rounded-tl-sm"
                  }`}
                >
                  {msg.channel === "voice" && (
                    <div className="flex items-center gap-1.5 mb-1.5 pb-1.5 border-b border-cyan-500/20 text-cyan-300 font-mono text-[10px]">
                      <Volume2 className="w-3 h-3" />
                      Voice call
                    </div>
                  )}
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {canReply && (
        <div className="sticky bottom-20 border-t border-os-border bg-os-bg/95 backdrop-blur-xl p-3 mt-3">
          {/* bottom-20 sits this right above the fixed BottomNav (app/app/layout.tsx's main has pb-20 reserved for it) */}
          {replyError && <p className="text-[11px] text-rose-400 mb-2">{replyError}</p>}
          <div className="flex items-end gap-2">
            <textarea
              rows={1}
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Type a reply..."
              className="flex-1 px-3.5 py-2.5 rounded-2xl bg-os-card border border-os-border text-xs text-os-ink placeholder:text-os-text-dim focus:border-teal focus:outline-none resize-none max-h-24"
            />
            <button
              type="button"
              disabled={!replyBody.trim() || isSendingReply}
              onClick={handleSendReply}
              className="shrink-0 w-10 h-10 rounded-full bg-teal flex items-center justify-center disabled:opacity-40 active:scale-95 transition-transform"
            >
              <Send className="w-4 h-4 text-os-bg" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
