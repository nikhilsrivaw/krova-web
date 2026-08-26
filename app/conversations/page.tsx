"use client";

import React, { useEffect, useState } from "react";
import {
  Inbox,
  Search,
  MessageSquare,
  Phone,
  Mail,
  Lock,
  Unlock,
  Sparkles,
  Clock,
  Send,
  User,
  ArrowRight,
  ExternalLink,
  Shield,
  Layers,
  ChevronRight,
  FileText,
  Volume2,
  Filter,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  conversations,
  formatPaise,
  type ConversationItem,
  type ConversationThread,
  type ThreadMessage,
} from "@/lib/api";

const CHANNEL_ICONS = {
  whatsapp: MessageSquare,
  voice: Phone,
  email: Mail,
  instagram: MessageSquare,
};

const CHANNEL_COLORS = {
  whatsapp: "text-seal-bright bg-seal/10 border-seal/20",
  voice: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  email: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  instagram: "text-pink-400 bg-pink-500/10 border-pink-500/20",
};

function phoneOf(identities: { kind: string; value: string }[]): string | null {
  return identities.find((i) => i.kind === "phone")?.value || null;
}

export default function ConversationsPage() {
  const [threadList, setThreadList] = useState<ConversationItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [activeThread, setActiveThread] = useState<ConversationThread | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);

  // Load conversation thread list
  useEffect(() => {
    let mounted = true;
    const loadList = async () => {
      setIsLoadingList(true);
      setListError(null);
      try {
        const data = await conversations.list();
        if (!mounted) return;
        setThreadList(data);
        if (data.length > 0) setSelectedCustomerId(data[0].customer_id);
      } catch (err) {
        if (mounted) {
          setListError(err instanceof Error ? err.message : "Could not load conversations.");
        }
      } finally {
        if (mounted) setIsLoadingList(false);
      }
    };

    loadList();
    return () => {
      mounted = false;
    };
  }, []);

  // Load selected customer thread messages
  useEffect(() => {
    if (!selectedCustomerId) return;
    let mounted = true;
    setIsLoadingThread(true);
    setThreadError(null);

    const loadThread = async () => {
      try {
        const data = await conversations.thread(selectedCustomerId);
        if (mounted) setActiveThread(data);
      } catch (err) {
        if (mounted) {
          setThreadError(err instanceof Error ? err.message : "Could not load this conversation.");
        }
      } finally {
        if (mounted) setIsLoadingThread(false);
      }
    };

    loadThread();
    return () => {
      mounted = false;
    };
  }, [selectedCustomerId]);

  const handleTogglePrivate = async () => {
    if (!activeThread) return;
    const nextPrivate = !activeThread.is_private;
    try {
      await conversations.setPrivate(activeThread.customer_id, nextPrivate);
      setActiveThread((prev) => (prev ? { ...prev, is_private: nextPrivate } : null));
      setThreadList((prev) =>
        prev.map((t) =>
          t.customer_id === activeThread.customer_id ? { ...t, is_private: nextPrivate } : t
        )
      );
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : "Could not change privacy.");
    }
  };

  const filteredThreads = threadList.filter((item) => {
    const phone = phoneOf(item.identities) || "";
    const matchesSearch =
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      (item.last_message || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel =
      channelFilter === "all" || item.channels.includes(channelFilter);
    return matchesSearch && matchesChannel;
  });

  return (
    <AppLayout
      title="Unified Conversations"
      subtitle="Interleaved timeline across WhatsApp, Voice, Email & Instagram"
    >
      <div className="h-[calc(100vh-140px)] flex border border-white/[0.08] rounded-2xl overflow-hidden bg-os-bg shadow-2xl">
        {/* Left Pane: High-Density Thread List */}
        <div className="w-80 lg:w-96 border-r border-white/[0.07] bg-os-card flex flex-col shrink-0">
          {/* Search & Channel Filter Header */}
          <div className="p-3 border-b border-white/[0.06] space-y-2">
            <div className="flex items-center px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <Search className="w-3.5 h-3.5 text-os-text-dim mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="w-full bg-transparent text-xs text-white placeholder:text-os-text-dim outline-none"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {["all", "whatsapp", "voice", "email"].map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => setChannelFilter(ch)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-all shrink-0 ${
                    channelFilter === ch
                      ? "bg-white text-black font-bold"
                      : "bg-white/[0.02] text-os-text-dim hover:text-white"
                  }`}
                >
                  {ch}
                </button>
              ))}
            </div>
          </div>

          {/* Thread Scroll List */}
          <div className="flex-1 overflow-y-auto divide-y divide-white/[0.03]">
            {isLoadingList ? (
              <div className="p-4 space-y-3">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : listError ? (
              <div className="p-4 text-center text-xs text-red-400">{listError}</div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center text-xs text-os-text-dim">
                No matching conversations found.
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.customer_id === selectedCustomerId;
                const lastChannel = thread.channels[thread.channels.length - 1] || "whatsapp";
                const ChannelIcon = CHANNEL_ICONS[lastChannel] || MessageSquare;
                const channelStyle = CHANNEL_COLORS[lastChannel] || CHANNEL_COLORS.whatsapp;

                return (
                  <div
                    key={thread.customer_id}
                    onClick={() => setSelectedCustomerId(thread.customer_id)}
                    className={`p-3.5 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-white/[0.08] border-l-2 border-brass"
                        : "hover:bg-white/[0.03]"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="text-xs font-bold text-white truncate">
                          {thread.name || "Unknown Customer"}
                        </span>
                        {thread.is_private && (
                          <span title="Private thread">
                            <Lock className="w-3 h-3 text-amber-400 shrink-0" />
                          </span>
                        )}
                      </div>

                      {thread.last_message_at && (
                        <span className="text-[10px] font-mono text-os-text-dim shrink-0">
                          {new Date(thread.last_message_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`p-1 rounded border text-[10px] ${channelStyle}`}>
                        <ChannelIcon className="w-2.5 h-2.5" />
                      </div>
                      <p className="text-[11px] text-os-text-dim truncate">
                        {thread.last_message || "No messages yet"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-os-text-dim">
                      {!thread.window_open && (
                        <span>24h window closed</span>
                      )}
                      {thread.open_commitments > 0 && (
                        <span className="px-1.5 py-0.2 rounded bg-brass/20 text-brass-bright border border-brass/30">
                          {thread.open_commitments} open commitment{thread.open_commitments === 1 ? "" : "s"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Center/Right: Full Interleaved Timeline */}
        <div className="flex-1 flex flex-col bg-os-card overflow-hidden">
          {/* Thread Header */}
          {activeThread ? (
            <div className="px-6 py-3.5 border-b border-white/[0.07] bg-os-card flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-brass to-slate-800 border border-white/20 flex items-center justify-center font-bold text-sm text-white">
                  {activeThread.name?.charAt(0) || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {activeThread.name || "Customer"}
                    </h3>
                    <Badge variant={activeThread.window_open ? "emerald" : "amber"} size="sm">
                      {activeThread.window_open ? "24h window open" : "Window closed"}
                    </Badge>
                  </div>
                  {phoneOf(activeThread.identities) && (
                    <p className="text-[11px] text-os-text-dim font-mono">
                      {phoneOf(activeThread.identities)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Mark Private Button */}
                <button
                  type="button"
                  onClick={handleTogglePrivate}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeThread.is_private
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/30"
                      : "bg-white/[0.04] text-os-text-dim hover:text-white border-white/[0.08]"
                  }`}
                >
                  {activeThread.is_private ? (
                    <>
                      <Lock className="w-3.5 h-3.5" />
                      <span>Private (Restricted)</span>
                    </>
                  ) : (
                    <>
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Mark Private</span>
                    </>
                  )}
                </button>

                {/* Inspect Customer 360 */}
                <button
                  type="button"
                  onClick={() => setIsCustomerDrawerOpen(true)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Customer 360</span>
                </button>
              </div>
            </div>
          ) : null}

          {/* Messages Scroll View */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {isLoadingThread ? (
              <div className="space-y-4">
                <Skeleton className="h-16 w-3/4" />
                <Skeleton className="h-16 w-3/4 ml-auto" />
                <Skeleton className="h-20 w-3/4" />
              </div>
            ) : threadError ? (
              <div className="p-4 text-center text-xs text-red-400">{threadError}</div>
            ) : !activeThread || activeThread.messages.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No messages in thread"
                description="Select a customer from the left list to view their interleaved conversation timeline."
              />
            ) : (
              activeThread.messages.map((msg) => {
                const isOutbound = msg.direction === "outbound";
                const ChannelIcon = CHANNEL_ICONS[msg.channel] || MessageSquare;

                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${
                      isOutbound ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      <ChannelIcon className="w-3 h-3 text-os-text-dim" />
                      <span className="text-[10px] font-mono text-os-text-dim capitalize">
                        {msg.channel} • {new Date(msg.occurred_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {/* Message Bubble Card */}
                    <div
                      className={`max-w-xl p-4 rounded-2xl text-xs leading-relaxed ${
                        msg.channel === "voice"
                          ? "bg-cyan-950/30 border border-cyan-500/30 text-white rounded-tl-sm"
                          : isOutbound
                          ? "bg-brass text-white rounded-tr-sm shadow-md"
                          : "bg-[#111728] border border-white/[0.08] text-white/90 rounded-tl-sm"
                      }`}
                    >
                      {msg.channel === "voice" && (
                        <div className="flex items-center gap-2 mb-2 pb-2 border-b border-cyan-500/20 text-cyan-300 font-mono text-[11px]">
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Voice call</span>
                        </div>
                      )}
                      <p className="whitespace-pre-wrap">{msg.text}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Context Footer Banner */}
          <div className="p-3 bg-os-bg border-t border-white/[0.06] flex items-center justify-between text-xs text-os-text-dim">
            <span className="flex items-center gap-1.5 font-mono text-[11px]">
              <Shield className="w-3.5 h-3.5 text-brass" />
              Human-in-the-loop: Replies are proposed in the <strong>Approvals</strong> queue.
            </span>
            <a
              href="/approvals"
              className="text-brass hover:text-brass-bright font-semibold flex items-center gap-1"
            >
              Go to Approvals →
            </a>
          </div>
        </div>
      </div>

      {/* Customer 360 Side-Inspector Drawer */}
      <Drawer
        isOpen={isCustomerDrawerOpen}
        onClose={() => setIsCustomerDrawerOpen(false)}
        title="Customer Detail"
        subtitle={`Identities & commitments for ${activeThread?.name || "Customer"}`}
        width="md"
      >
        {activeThread && (
          <div className="space-y-6">
            {/* Identities */}
            <div>
              <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2">
                Known Identities
              </h4>
              <div className="space-y-1.5">
                {activeThread.identities.map((id) => (
                  <div
                    key={`${id.kind}-${id.value}`}
                    className="px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs flex items-center justify-between"
                  >
                    <span className="text-os-text-dim uppercase font-mono text-[10px]">{id.kind}</span>
                    <span className="text-white font-mono">{id.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Commitments */}
            <div>
              <h4 className="text-xs font-mono uppercase text-os-text-dim mb-2">
                Commitments
              </h4>
              {activeThread.commitments.length === 0 ? (
                <p className="text-xs text-os-text-dim">No commitments extracted from this thread yet.</p>
              ) : (
                <div className="space-y-2">
                  {activeThread.commitments.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-white/90">{c.description || "—"}</span>
                        <Badge
                          variant={
                            c.status === "met" ? "emerald" : c.status === "missed" ? "rose" : "amber"
                          }
                          size="sm"
                        >
                          {c.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between text-[10px] font-mono text-os-text-dim">
                        <span>{c.direction === "they_owe" ? "They owe" : "We owe"}</span>
                        {c.amount_paise != null && (
                          <span className="text-white">{formatPaise(c.amount_paise)}</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-white/[0.06]">
              <a
                href={`/ledger`}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Layers className="w-4 h-4" />
                View Full Commitment Ledger
              </a>
            </div>
          </div>
        )}
      </Drawer>
    </AppLayout>
  );
}
