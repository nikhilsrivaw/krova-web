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
  Zap,
  Plus,
  Trash2,
  StickyNote,
  Tag as TagIcon,
  AlertCircle,
  Check,
  X,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { getEmail } from "@/lib/auth";
import {
  conversations,
  channels,
  formatPaise,
  team,
  account,
  queue as queueApi,
  crm,
  ledger,
  cannedResponses,
  type Capability,
  type Shift,
  type ShiftSession,
  type ConversationItem,
  type ConversationThread,
  type TeamMember,
  type ThreadMessage,
  type CustomerTag,
  type CustomerNote,
  type CannedResponse,
  type CustomerSummary,
} from "@/lib/api";

/** SLA-style countdown for the WhatsApp 24h free-form reply window - same
 * "don't let a deadline pass silently" pattern as the dashboard's pending-
 * draft expiry badge, applied to the window every reply in this inbox
 * actually depends on. */
function slaUrgency(closesAt: string | null): { label: string; className: string } | null {
  if (!closesAt) return null;
  const msLeft = new Date(closesAt).getTime() - Date.now();
  if (msLeft <= 0) return null; // conversations.window_open already covers "closed"
  const hoursLeft = msLeft / 3_600_000;
  if (hoursLeft < 1) {
    const mins = Math.round(msLeft / 60_000);
    return {
      label: `Closes in ${mins}m`,
      className: "bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse",
    };
  }
  if (hoursLeft < 3) {
    return {
      label: `Closes in ${Math.round(hoursLeft)}h`,
      className: "bg-amber-500/20 text-amber-300 border-amber-500/40",
    };
  }
  return null;
}

type QuickSendType = "buttons" | "list" | "product" | "products" | "catalog";

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
  // "all" | "mine" | "unassigned" - triage filters, the shared-inbox pattern
  // every dedicated inbox product (WhatChimp included) offers alongside the
  // per-conversation assign dropdown that already existed here.
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [isLoadingList, setIsLoadingList] = useState(true);
  const [isLoadingThread, setIsLoadingThread] = useState(false);
  const [isCustomerDrawerOpen, setIsCustomerDrawerOpen] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [threadError, setThreadError] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);

  // Customer 360 drawer: notes, tags and the AI intelligence dossier -
  // already real, working CRM features (same data the /customers page
  // shows), just never pulled into the inbox where an agent mid-thread
  // would actually want them, without tab-switching.
  const [drawerTab, setDrawerTab] = useState<"overview" | "notes" | "tags">("overview");
  const [customerSummary, setCustomerSummary] = useState<CustomerSummary | null>(null);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [isLoadingDrawerExtras, setIsLoadingDrawerExtras] = useState(false);
  const [newNoteBody, setNewNoteBody] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [newTagLabel, setNewTagLabel] = useState("");
  const [isSavingTag, setIsSavingTag] = useState(false);

  // Canned Replies - a saved template sent as-is by a person's own click,
  // categorically different from an AI draft (no autonomy question here),
  // so it bypasses Approvals the same way Quick Send's structured messages
  // already do.
  const [cannedList, setCannedList] = useState<CannedResponse[]>([]);
  const [isCannedPickerOpen, setIsCannedPickerOpen] = useState(false);
  const [isSendingCanned, setIsSendingCanned] = useState(false);
  const [cannedError, setCannedError] = useState<string | null>(null);

  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [isBookingToken, setIsBookingToken] = useState(false);
  const [openShiftSessions, setOpenShiftSessions] = useState<ShiftSession[]>([]);
  const [bookingShift, setBookingShift] = useState<Shift | "">("");
  const [isSubmittingToken, setIsSubmittingToken] = useState(false);
  const [tokenResult, setTokenResult] = useState<{ queue_number: number; shift: Shift } | null>(null);
  const [tokenError, setTokenError] = useState<string | null>(null);

  useEffect(() => {
    team.list().then(setTeamMembers).catch(() => {
      // A missing team list shouldn't block the inbox - assignment just
      // won't have anyone to offer.
    });
    account.profile().then((p) => setCapabilities(p.capabilities || [])).catch(() => {});
    cannedResponses.list().then(setCannedList).catch(() => {
      // No canned replies configured yet - the picker just stays empty.
    });
  }, []);

  // Customer 360 drawer extras - loaded when the drawer opens (or the
  // selected customer changes while it's already open), not on every
  // thread switch, since most of a conversation is read without ever
  // opening the drawer.
  useEffect(() => {
    if (!isCustomerDrawerOpen || !activeThread) return;
    let mounted = true;
    const customerId = activeThread.customer_id;
    setIsLoadingDrawerExtras(true);
    setDrawerTab("overview");
    Promise.allSettled([
      crm.notes(customerId),
      crm.tags(customerId, true),
      ledger.customers(),
    ]).then(([notesRes, tagsRes, customersRes]) => {
      if (!mounted) return;
      setNotes(notesRes.status === "fulfilled" ? notesRes.value : []);
      setTags(tagsRes.status === "fulfilled" ? tagsRes.value : []);
      setCustomerSummary(
        customersRes.status === "fulfilled"
          ? customersRes.value.find((c) => c.id === customerId) || null
          : null,
      );
      setIsLoadingDrawerExtras(false);
    });
    return () => {
      mounted = false;
    };
  }, [isCustomerDrawerOpen, activeThread]);

  const handleAddNote = async () => {
    if (!activeThread || !newNoteBody.trim()) return;
    setIsSavingNote(true);
    try {
      const note = await crm.addNote(activeThread.customer_id, newNoteBody.trim());
      setNotes((prev) => [note, ...prev]);
      setNewNoteBody("");
    } catch {
      // Left in the textarea - the person can just retry the click.
    } finally {
      setIsSavingNote(false);
    }
  };

  const handleAddTag = async () => {
    if (!activeThread || !newTagLabel.trim()) return;
    setIsSavingTag(true);
    try {
      const tag = await crm.addTag(activeThread.customer_id, newTagLabel.trim());
      setTags((prev) => [tag, ...prev]);
      setNewTagLabel("");
    } catch {
      // Left in the input - retry on click.
    } finally {
      setIsSavingTag(false);
    }
  };

  const handleTagDecision = async (tagId: string, decision: "confirm" | "reject") => {
    try {
      const updated = decision === "confirm" ? await crm.confirmTag(tagId) : await crm.rejectTag(tagId);
      setTags((prev) => prev.map((t) => (t.id === tagId ? updated : t)));
    } catch {
      // Tag stays in its current state - the button just didn't take.
    }
  };

  const handleSendCanned = async (canned: CannedResponse) => {
    const to = activeThread ? phoneOf(activeThread.identities) : null;
    if (!to) return;
    setIsSendingCanned(true);
    setCannedError(null);
    try {
      await channels.sendText(to, canned.body);
      setIsCannedPickerOpen(false);
    } catch (err) {
      setCannedError(err instanceof Error ? err.message : "Could not send this reply.");
    } finally {
      setIsSendingCanned(false);
    }
  };

  const openBookingPanel = async () => {
    setIsBookingToken(true);
    setTokenResult(null);
    setTokenError(null);
    try {
      const sessions = await queueApi.listShifts();
      setOpenShiftSessions(sessions.filter((s) => !s.closed_at));
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Could not load open shifts.");
    }
  };

  const handleBookToken = async () => {
    if (!activeThread || !bookingShift) return;
    setIsSubmittingToken(true);
    setTokenError(null);
    try {
      const entry = await queueApi.checkIn({ customer_id: activeThread.customer_id, shift: bookingShift });
      setTokenResult({ queue_number: entry.queue_number, shift: entry.shift });
    } catch (err) {
      setTokenError(err instanceof Error ? err.message : "Could not book a token.");
    } finally {
      setIsSubmittingToken(false);
    }
  };

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

  // Deep search - the client-side filter below only ever sees the one
  // last-message preview already loaded; this searches actual message
  // content in the database (debounced so it isn't a round trip per
  // keystroke), and replaces threadList with the real result set.
  const [isSearchingServer, setIsSearchingServer] = useState(false);
  const [isServerFiltered, setIsServerFiltered] = useState(false);
  useEffect(() => {
    const query = searchQuery.trim();
    if (query.length < 2) {
      if (isServerFiltered) {
        // Query cleared after a deep search replaced threadList - restore
        // the normal unfiltered list rather than leaving it stuck narrow.
        setIsServerFiltered(false);
        conversations.list().then(setThreadList).catch(() => {});
      }
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setIsSearchingServer(true);
      try {
        const data = await conversations.list(query);
        if (!cancelled) {
          setThreadList(data);
          setIsServerFiltered(true);
        }
      } catch {
        // Deep search failing shouldn't break the inbox - the instant
        // client-side filter below still works on whatever's loaded.
      } finally {
        if (!cancelled) setIsSearchingServer(false);
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searchQuery]);

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

  const handleAssign = async (userId: string) => {
    if (!activeThread) return;
    const nextAssignee = userId || undefined; // "" from the <select>'s unassign option
    try {
      const result = await conversations.assign(activeThread.customer_id, nextAssignee);
      setActiveThread((prev) => (prev ? { ...prev, assigned_to_user_id: result.assigned_to_user_id } : null));
      setThreadList((prev) =>
        prev.map((t) =>
          t.customer_id === activeThread.customer_id
            ? { ...t, assigned_to_user_id: result.assigned_to_user_id }
            : t,
        ),
      );
    } catch (err) {
      setThreadError(err instanceof Error ? err.message : "Could not assign this conversation.");
    }
  };

  // Quick Send - interactive buttons/list/product/catalog to whoever the
  // active thread is with, rather than free text the AI has to parse back.
  const [isQuickSendOpen, setIsQuickSendOpen] = useState(false);
  const [quickSendType, setQuickSendType] = useState<QuickSendType>("buttons");
  const [quickSendBody, setQuickSendBody] = useState("");
  const [quickButtons, setQuickButtons] = useState([{ id: "", title: "" }]);
  const [quickListLabel, setQuickListLabel] = useState("Choose");
  const [quickListRows, setQuickListRows] = useState([{ id: "", title: "", description: "" }]);
  const [quickCatalogId, setQuickCatalogId] = useState("");
  const [quickProductId, setQuickProductId] = useState("");
  const [quickProductsHeader, setQuickProductsHeader] = useState("");
  const [quickProductIds, setQuickProductIds] = useState([""]);
  const [isSendingQuick, setIsSendingQuick] = useState(false);
  const [quickSendError, setQuickSendError] = useState<string | null>(null);
  const [quickSendOk, setQuickSendOk] = useState<string | null>(null);

  const openQuickSend = () => {
    setQuickSendType("buttons");
    setQuickSendBody("");
    setQuickButtons([{ id: "", title: "" }]);
    setQuickListLabel("Choose");
    setQuickListRows([{ id: "", title: "", description: "" }]);
    setQuickCatalogId("");
    setQuickProductId("");
    setQuickProductsHeader("");
    setQuickProductIds([""]);
    setQuickSendError(null);
    setQuickSendOk(null);
    setIsQuickSendOpen(true);
  };

  const handleQuickSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const to = activeThread ? phoneOf(activeThread.identities) : null;
    if (!to) return;
    setIsSendingQuick(true);
    setQuickSendError(null);
    setQuickSendOk(null);
    try {
      if (quickSendType === "buttons") {
        await channels.sendInteractiveButtons(to, quickSendBody, quickButtons.filter((b) => b.id && b.title));
      } else if (quickSendType === "list") {
        await channels.sendInteractiveList(to, quickSendBody, quickListLabel, [
          { title: "Options", rows: quickListRows.filter((r) => r.id && r.title) },
        ]);
      } else if (quickSendType === "product") {
        await channels.sendProduct(to, quickCatalogId, quickProductId, quickSendBody || undefined);
      } else if (quickSendType === "products") {
        await channels.sendProducts(to, quickCatalogId, quickProductsHeader, quickSendBody, [
          { title: "Products", product_retailer_ids: quickProductIds.filter((id) => id.trim()) },
        ]);
      } else {
        await channels.sendCatalog(to, quickSendBody);
      }
      setQuickSendOk("Sent.");
    } catch (err) {
      setQuickSendError(err instanceof Error ? err.message : "Could not send this message.");
    } finally {
      setIsSendingQuick(false);
    }
  };

  const myUserId = teamMembers.find((m) => m.email === getEmail())?.user_id || null;

  const filteredThreads = threadList.filter((item) => {
    const phone = phoneOf(item.identities) || "";
    // Once a deep server search has already narrowed threadList to real
    // matches (possibly on a message this preview never shows), re-running
    // the shallow name/phone/last-message check here would wrongly drop
    // results whose match isn't in what's currently loaded.
    const matchesSearch =
      isServerFiltered ||
      (item.name || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      phone.includes(searchQuery) ||
      (item.last_message || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchesChannel =
      channelFilter === "all" || item.channels.includes(channelFilter);
    const matchesAssignee =
      assigneeFilter === "all" ||
      (assigneeFilter === "mine" && item.assigned_to_user_id === myUserId) ||
      (assigneeFilter === "unassigned" && !item.assigned_to_user_id);
    return matchesSearch && matchesChannel && matchesAssignee;
  });

  const teamMemberById = (userId: string | null) =>
    userId ? teamMembers.find((m) => m.user_id === userId) : undefined;

  return (
    <AppLayout
      title="Unified Conversations"
      subtitle="Interleaved timeline across WhatsApp, Voice, Email & Instagram"
    >
      {/* A flat background gives glass panels nothing to actually blur -
          same fix as the dashboard, kept restrained here (Minimalism &
          Swiss Style is this product type's own primary recommendation,
          glassmorphism only a secondary accent) - two soft glows, no
          grid texture, most of the screen stays clean for the timeline. */}
      <div className="relative">
        <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10">
          <div className="absolute -top-16 right-[12%] w-[420px] h-[420px] rounded-full bg-brass/[0.06] blur-[130px]" />
          <div className="absolute bottom-0 left-[6%] w-[380px] h-[380px] rounded-full bg-seal/[0.05] blur-[130px]" />
        </div>

      <div className="h-[calc(100vh-140px)] flex border border-white/[0.08] rounded-2xl overflow-hidden bg-os-card/40 backdrop-blur-xl shadow-2xl">
        {/* Left Pane: High-Density Thread List */}
        <div className="w-80 lg:w-96 border-r border-white/[0.07] bg-os-card/70 backdrop-blur-xl flex flex-col shrink-0">
          {/* Search & Channel Filter Header */}
          <div className="p-3 border-b border-white/[0.06] space-y-2">
            <div className="flex items-center px-3 py-1.5 rounded-lg bg-white/[0.03] border border-white/[0.08]">
              <Search className="w-3.5 h-3.5 text-os-text-dim mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations, or anything ever said..."
                className="w-full bg-transparent text-xs text-white placeholder:text-os-text-dim outline-none"
              />
              {isSearchingServer && (
                <span className="text-[10px] font-mono text-os-text-dim shrink-0 ml-2">searching…</span>
              )}
            </div>

            <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
              {["all", "whatsapp", "instagram", "voice", "email"].map((ch) => (
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

            {teamMembers.length > 1 && (
              <div className="flex items-center gap-1 overflow-x-auto pb-0.5">
                {["all", "mine", "unassigned"].map((af) => (
                  <button
                    key={af}
                    type="button"
                    onClick={() => setAssigneeFilter(af)}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-mono capitalize transition-all shrink-0 ${
                      assigneeFilter === af
                        ? "bg-brass text-white font-bold"
                        : "bg-white/[0.02] text-os-text-dim hover:text-white"
                    }`}
                  >
                    {af}
                  </button>
                ))}
              </div>
            )}
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

                      <div className="flex items-center gap-1.5 shrink-0">
                        {teamMembers.length > 1 && thread.assigned_to_user_id && (
                          <span
                            title={
                              teamMemberById(thread.assigned_to_user_id)?.full_name ||
                              teamMemberById(thread.assigned_to_user_id)?.email ||
                              "Assigned"
                            }
                            className="w-[18px] h-[18px] rounded-full bg-gradient-to-br from-brass to-slate-800 border border-white/20 flex items-center justify-center text-[9px] font-bold text-white"
                          >
                            {(
                              teamMemberById(thread.assigned_to_user_id)?.full_name ||
                              teamMemberById(thread.assigned_to_user_id)?.email ||
                              "?"
                            )
                              .charAt(0)
                              .toUpperCase()}
                          </span>
                        )}
                        {thread.last_message_at && (
                          <span className="text-[10px] font-mono text-os-text-dim">
                            {new Date(thread.last_message_at).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 mb-1.5">
                      <div className={`p-1 rounded border text-[10px] ${channelStyle}`}>
                        <ChannelIcon className="w-2.5 h-2.5" />
                      </div>
                      <p className="text-[11px] text-os-text-dim truncate">
                        {thread.last_message || "No messages yet"}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono text-os-text-dim flex-wrap">
                      {!thread.window_open ? (
                        <span>24h window closed</span>
                      ) : (
                        (() => {
                          const urgency = slaUrgency(thread.window_closes_at);
                          return urgency ? (
                            <span className={`px-1.5 py-0.2 rounded border flex items-center gap-1 ${urgency.className}`}>
                              <Clock className="w-2.5 h-2.5" />
                              {urgency.label}
                            </span>
                          ) : null;
                        })()
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
        <div className="flex-1 flex flex-col bg-os-card/45 backdrop-blur-xl overflow-hidden">
          {/* Thread Header */}
          {activeThread ? (
            <div className="px-6 py-3.5 border-b border-white/[0.07] bg-white/[0.02] flex items-center justify-between">
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
                    {(() => {
                      const urgency = activeThread.window_open ? slaUrgency(activeThread.window_closes_at) : null;
                      return urgency ? (
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded border flex items-center gap-1 ${urgency.className}`}>
                          <AlertCircle className="w-2.5 h-2.5" />
                          {urgency.label}
                        </span>
                      ) : null;
                    })()}
                  </div>
                  {phoneOf(activeThread.identities) && (
                    <p className="text-[11px] text-os-text-dim font-mono">
                      {phoneOf(activeThread.identities)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Assign to teammate */}
                {teamMembers.length > 1 && (
                  <select
                    value={activeThread.assigned_to_user_id || ""}
                    onChange={(e) => handleAssign(e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim border border-white/[0.08] cursor-pointer focus:outline-none focus:border-brass"
                  >
                    <option value="">Unassigned</option>
                    {teamMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email}
                      </option>
                    ))}
                  </select>
                )}

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

                {/* Canned Reply: a saved template sent as-is, a person's own click -
                    not an AI draft, so it doesn't go through Approvals. */}
                {activeThread.window_open && phoneOf(activeThread.identities) && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCannedError(null);
                        setIsCannedPickerOpen((v) => !v);
                      }}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] flex items-center gap-1.5 transition-all cursor-pointer"
                      title="Send a saved reply as-is"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Canned Reply</span>
                    </button>
                    {isCannedPickerOpen && (
                      <div className="absolute right-0 top-full mt-2 w-80 z-20 rounded-xl border border-white/[0.1] bg-os-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
                        <div className="p-2 max-h-72 overflow-y-auto">
                          {cannedList.length === 0 ? (
                            <p className="p-3 text-[11px] text-os-text-dim">
                              No canned replies yet - add some from Settings.
                            </p>
                          ) : (
                            cannedList.map((c) => (
                              <button
                                key={c.id}
                                type="button"
                                disabled={isSendingCanned}
                                onClick={() => handleSendCanned(c)}
                                className="w-full text-left p-2.5 rounded-lg hover:bg-white/[0.06] transition-all cursor-pointer disabled:opacity-50"
                              >
                                <p className="text-xs font-semibold text-white">{c.title}</p>
                                <p className="text-[11px] text-os-text-dim line-clamp-2">{c.body}</p>
                              </button>
                            ))
                          )}
                          {cannedError && (
                            <p className="px-2.5 py-1.5 text-[11px] text-red-400">{cannedError}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Quick Send: interactive buttons/list/product/catalog */}
                {activeThread.window_open && phoneOf(activeThread.identities) && (
                  <button
                    type="button"
                    onClick={openQuickSend}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-white border border-white/[0.1] flex items-center gap-1.5 transition-all cursor-pointer"
                    title="Send tappable buttons, a picker list, a product, or the catalog"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>Quick Send</span>
                  </button>
                )}

                {/* Inspect Customer 360 */}
                <button
                  type="button"
                  onClick={() => {
                    setIsBookingToken(false);
                    setBookingShift("");
                    setTokenResult(null);
                    setTokenError(null);
                    setIsCustomerDrawerOpen(true);
                  }}
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
          <div className="p-3 bg-white/[0.02] border-t border-white/[0.06] flex items-center justify-between text-xs text-os-text-dim">
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
            {/* Tabs */}
            <div className="flex items-center gap-1.5 border-b border-white/[0.06] pb-2">
              {([
                ["overview", "Overview"],
                ["notes", `Notes${notes.length ? ` (${notes.length})` : ""}`],
                ["tags", `Tags${tags.length ? ` (${tags.length})` : ""}`],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDrawerTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                    drawerTab === key
                      ? "bg-brass/15 text-brass-bright border border-brass/30"
                      : "text-os-text-dim hover:text-white border border-transparent"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {drawerTab === "overview" && (
              <div className="space-y-6">
                {/* AI Intelligence Dossier */}
                {isLoadingDrawerExtras ? (
                  <Skeleton className="h-20 w-full" />
                ) : customerSummary?.summary ? (
                  <div className="p-3.5 rounded-xl bg-brass/[0.06] border border-brass/20">
                    <h4 className="text-xs font-mono uppercase text-brass-bright mb-1.5 flex items-center gap-1.5">
                      <Sparkles className="w-3 h-3" /> AI Profile
                    </h4>
                    <p className="text-xs text-white/90 leading-relaxed">{customerSummary.summary}</p>
                    {(customerSummary.health_score != null || customerSummary.outstanding_paise != null) && (
                      <div className="flex items-center gap-4 mt-2 pt-2 border-t border-brass/10 text-[11px] font-mono text-os-text-dim">
                        {customerSummary.health_score != null && (
                          <span>Health: <span className="text-white">{customerSummary.health_score}</span></span>
                        )}
                        {customerSummary.outstanding_paise != null && (
                          <span>Outstanding: <span className="text-white">{formatPaise(customerSummary.outstanding_paise)}</span></span>
                        )}
                      </div>
                    )}
                  </div>
                ) : null}

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
              </div>
            )}

            {drawerTab === "notes" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <textarea
                    value={newNoteBody}
                    onChange={(e) => setNewNoteBody(e.target.value)}
                    placeholder="Leave a note for the team - the customer never sees this."
                    rows={3}
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none resize-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddNote}
                    disabled={!newNoteBody.trim() || isSavingNote}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    <StickyNote className="w-3.5 h-3.5" />
                    {isSavingNote ? "Saving..." : "Add Note"}
                  </button>
                </div>
                {isLoadingDrawerExtras ? (
                  <Skeleton className="h-16 w-full" />
                ) : notes.length === 0 ? (
                  <p className="text-xs text-os-text-dim">No notes yet on this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {notes.map((n) => (
                      <div key={n.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs space-y-1">
                        <p className="text-white/90 whitespace-pre-wrap">{n.body}</p>
                        <p className="text-[10px] font-mono text-os-text-dim">
                          {n.author_name || "Someone"} · {new Date(n.created_at).toLocaleString("en-IN")}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {drawerTab === "tags" && (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newTagLabel}
                    onChange={(e) => setNewTagLabel(e.target.value)}
                    placeholder="Add a tag..."
                    className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddTag}
                    disabled={!newTagLabel.trim() || isSavingTag}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim cursor-pointer disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                {isLoadingDrawerExtras ? (
                  <Skeleton className="h-16 w-full" />
                ) : tags.length === 0 ? (
                  <p className="text-xs text-os-text-dim">No tags yet on this customer.</p>
                ) : (
                  <div className="space-y-2">
                    {tags.map((t) => (
                      <div key={t.id} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
                        <div className="flex items-center justify-between gap-2">
                          <span className="flex items-center gap-1.5 text-white font-semibold">
                            <TagIcon className="w-3 h-3 text-brass" />
                            {t.label}
                          </span>
                          {t.status === "suggested" ? (
                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleTagDecision(t.id, "confirm")}
                                className="p-1 rounded bg-seal/15 text-seal-bright hover:bg-seal/25 cursor-pointer"
                                title="Confirm"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleTagDecision(t.id, "reject")}
                                className="p-1 rounded bg-thread/15 text-thread-bright hover:bg-thread/25 cursor-pointer"
                                title="Reject"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <Badge variant={t.status === "confirmed" ? "emerald" : "rose"} size="sm">
                              {t.status}
                            </Badge>
                          )}
                        </div>
                        {t.status === "suggested" && t.reasoning && (
                          <p className="text-[10px] text-os-text-dim mt-1 italic">"{t.reasoning}"</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="pt-4 border-t border-white/[0.06] space-y-2">
              <a
                href={`/ledger`}
                className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all"
              >
                <Layers className="w-4 h-4" />
                View Full Commitment Ledger
              </a>

              {capabilities.includes("opd_queue") && (
                !isBookingToken ? (
                  <button
                    type="button"
                    onClick={openBookingPanel}
                    className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    <Clock className="w-4 h-4" />
                    Book Token
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                    {tokenResult ? (
                      <p className="text-xs text-emerald-400 text-center font-semibold">
                        Booked: {tokenResult.shift} #{tokenResult.queue_number}
                      </p>
                    ) : (
                      <>
                        {tokenError && <p className="text-[11px] text-red-400">{tokenError}</p>}
                        {openShiftSessions.length === 0 ? (
                          <p className="text-[11px] text-os-text-dim">No shift is open right now.</p>
                        ) : (
                          <>
                            <select
                              value={bookingShift}
                              onChange={(e) => setBookingShift(e.target.value as Shift)}
                              className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                            >
                              <option value="">Select shift...</option>
                              {openShiftSessions.map((s) => (
                                <option key={s.id} value={s.shift}>{s.shift}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={handleBookToken}
                              disabled={!bookingShift || isSubmittingToken}
                              className="w-full py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim cursor-pointer disabled:opacity-50"
                            >
                              {isSubmittingToken ? "Booking..." : "Confirm Token"}
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )
              )}
            </div>
          </div>
        )}
      </Drawer>

      <Modal
        isOpen={isQuickSendOpen}
        onClose={() => setIsQuickSendOpen(false)}
        title="Quick Send"
        subtitle="A tappable choice beats free text the AI has to parse back into an answer."
      >
        <form onSubmit={handleQuickSend} className="space-y-4">
          <div className="flex gap-1.5">
            {(["buttons", "list", "product", "products", "catalog"] as QuickSendType[]).map((t) => (
              <button
                key={t} type="button" onClick={() => setQuickSendType(t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize cursor-pointer ${
                  quickSendType === t ? "bg-white/[0.08] text-white border border-white/[0.1]" : "text-os-text-dim hover:text-white"
                }`}
              >
                {t}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
              {quickSendType === "product" ? "Caption (optional)" : "Message"}
            </label>
            <textarea
              required={quickSendType !== "product"} rows={2} value={quickSendBody}
              onChange={(e) => setQuickSendBody(e.target.value)}
              className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
            />
          </div>

          {quickSendType === "buttons" && (
            <div className="space-y-2">
              <label className="block text-xs font-mono uppercase text-os-text-dim">Buttons (up to 3)</label>
              {quickButtons.map((b, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text" placeholder="id" value={b.id}
                    onChange={(e) => setQuickButtons((prev) => prev.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))}
                    className="w-1/3 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                  <input
                    type="text" placeholder="Title (max 20 chars)" maxLength={20} value={b.title}
                    onChange={(e) => setQuickButtons((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  />
                  <button type="button" onClick={() => setQuickButtons((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-os-text-dim hover:text-thread-bright">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {quickButtons.length < 3 && (
                <button
                  type="button" onClick={() => setQuickButtons((prev) => [...prev, { id: "", title: "" }])}
                  className="text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add button
                </button>
              )}
            </div>
          )}

          {quickSendType === "list" && (
            <div className="space-y-2">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Button label (max 20 chars)</label>
                <input
                  type="text" maxLength={20} value={quickListLabel} onChange={(e) => setQuickListLabel(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>
              <label className="block text-xs font-mono uppercase text-os-text-dim">Rows (up to 10)</label>
              {quickListRows.map((r, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text" placeholder="id" value={r.id}
                    onChange={(e) => setQuickListRows((prev) => prev.map((x, j) => (j === i ? { ...x, id: e.target.value } : x)))}
                    className="w-1/4 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                  <input
                    type="text" placeholder="Title" value={r.title}
                    onChange={(e) => setQuickListRows((prev) => prev.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  />
                  <button type="button" onClick={() => setQuickListRows((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-os-text-dim hover:text-thread-bright">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {quickListRows.length < 10 && (
                <button
                  type="button" onClick={() => setQuickListRows((prev) => [...prev, { id: "", title: "", description: "" }])}
                  className="text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add row
                </button>
              )}
            </div>
          )}

          {quickSendType === "product" && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Catalog ID</label>
                <input
                  type="text" required value={quickCatalogId} onChange={(e) => setQuickCatalogId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Product SKU</label>
                <input
                  type="text" required value={quickProductId} onChange={(e) => setQuickProductId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                />
              </div>
            </div>
          )}

          {quickSendType === "products" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Catalog ID</label>
                  <input
                    type="text" required value={quickCatalogId} onChange={(e) => setQuickCatalogId(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Header (max 60 chars)</label>
                  <input
                    type="text" required maxLength={60} value={quickProductsHeader} onChange={(e) => setQuickProductsHeader(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  />
                </div>
              </div>
              <label className="block text-xs font-mono uppercase text-os-text-dim">Product SKUs (up to 30)</label>
              {quickProductIds.map((id, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text" placeholder="SKU" value={id}
                    onChange={(e) => setQuickProductIds((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                    className="flex-1 px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                  <button type="button" onClick={() => setQuickProductIds((prev) => prev.filter((_, j) => j !== i))} className="p-1.5 text-os-text-dim hover:text-thread-bright">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {quickProductIds.length < 30 && (
                <button
                  type="button" onClick={() => setQuickProductIds((prev) => [...prev, ""])}
                  className="text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add SKU
                </button>
              )}
            </div>
          )}

          {quickSendError && <p className="text-xs text-red-400">{quickSendError}</p>}
          {quickSendOk && <p className="text-xs text-seal-bright">{quickSendOk}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setIsQuickSendOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
              Close
            </button>
            <button
              type="submit" disabled={isSendingQuick}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50"
            >
              {isSendingQuick ? "Sending..." : "Send"}
            </button>
          </div>
        </form>
      </Modal>
    </AppLayout>
  );
}
