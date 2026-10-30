"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquare, Instagram, Phone, Globe, Lock, Search, X } from "lucide-react";
import { conversations, type ConversationItem } from "@/lib/api";
import { appPath } from "@/lib/app-nav";
import { getUserId } from "@/lib/auth";

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  voice: Phone,
  web: Globe,
};

type Filter = "all" | "waiting" | "mine" | "unassigned";
const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "waiting", label: "Waiting" },
  { key: "mine", label: "Mine" },
  { key: "unassigned", label: "Unassigned" },
];

// New messages show up without reopening the screen; paused while the app is in the background.
const REFRESH_MS = 20_000;

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function initials(name: string | null): string {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

/** A customer is waiting when the last message in the chat is theirs. */
const isWaiting = (c: ConversationItem) => c.last_direction === "inbound";

/**
 * The app's inbox: search across every message, filter to what needs you (Waiting, Mine, Unassigned), and see at a
 * glance who is waiting and whose 24-hour WhatsApp window has closed. Refreshes by itself while open.
 */
export default function InboxPage() {
  const [list, setList] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState("");
  const me = getUserId();

  const load = useCallback(async (q: string) => {
    try {
      setList(await conversations.list(q || undefined));
    } catch {
      /* keep what is shown */
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Search runs on the server (it reads every message, not only the last one), a moment after typing stops.
  useEffect(() => {
    const t = setTimeout(() => setSearched(query.trim()), 350);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    load(searched);
    const tick = () => { if (document.visibilityState === "visible") load(searched); };
    const timer = setInterval(tick, REFRESH_MS);
    document.addEventListener("visibilitychange", tick);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", tick); };
  }, [load, searched]);

  const counts = useMemo(() => ({
    all: list.length,
    waiting: list.filter(isWaiting).length,
    mine: list.filter((c) => c.assigned_to_user_id === me).length,
    unassigned: list.filter((c) => !c.assigned_to_user_id).length,
  }), [list, me]);

  const shown = list.filter((c) =>
    filter === "waiting" ? isWaiting(c)
      : filter === "mine" ? c.assigned_to_user_id === me
      : filter === "unassigned" ? !c.assigned_to_user_id
      : true,
  );

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-3">Inbox</h1>

      <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-os-card border border-os-border mb-3">
        <Search className="w-4 h-4 text-os-text-dim shrink-0" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search names, numbers or messages"
          aria-label="Search conversations"
          className="flex-1 min-w-0 bg-transparent text-sm text-os-ink placeholder:text-os-text-dim focus:outline-none"
        />
        {query && (
          <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="text-os-text-dim">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-3">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            aria-pressed={filter === f.key}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
              filter === f.key ? "bg-teal text-os-bg border-teal" : "bg-os-card text-os-ink border-os-border"
            }`}
          >
            {f.label}
            {counts[f.key] > 0 && <span className={`ml-1.5 ${filter === f.key ? "text-os-bg/80" : "text-os-text-dim"}`}>{counts[f.key]}</span>}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : shown.length === 0 ? (
        <p className="text-center text-sm text-os-text-dim py-12">
          {searched ? "Nothing matches that search."
            : filter === "waiting" ? "Nobody is waiting for a reply."
            : filter === "mine" ? "No chats are assigned to you."
            : filter === "unassigned" ? "Every chat has an owner."
            : "No conversations yet."}
        </p>
      ) : (
        <div className="divide-y divide-os-border rounded-2xl bg-os-card border border-os-border overflow-hidden">
          {shown.map((c) => {
            const Icon = CHANNEL_ICONS[c.channels[0] || "whatsapp"] || MessageSquare;
            const waiting = isWaiting(c);
            return (
              <a
                key={c.customer_id}
                href={appPath(`/inbox/${c.customer_id}`)}
                className="flex items-center gap-3 px-3.5 py-3 active:bg-white/[0.03] transition-colors"
              >
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-teal/15 text-teal flex items-center justify-center text-sm font-semibold">
                    {initials(c.name)}
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-os-bg border border-os-border flex items-center justify-center">
                    <Icon className="w-2.5 h-2.5 text-teal" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm truncate flex items-center gap-1.5 ${waiting ? "font-semibold text-os-ink" : "font-medium text-os-ink/90"}`}>
                      {c.is_private && <Lock className="w-3 h-3 text-os-text-dim shrink-0" />}
                      {c.name || "Unknown"}
                    </p>
                    <span className={`text-[10px] shrink-0 ${waiting ? "text-teal font-semibold" : "text-os-text-dim"}`}>
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className={`text-xs truncate flex-1 ${waiting ? "text-os-ink/80" : "text-os-text-dim"}`}>
                      {c.last_direction === "outbound" ? "You: " : ""}
                      {c.last_message || "No messages"}
                    </p>
                    {waiting && <span className="w-2 h-2 rounded-full bg-teal shrink-0" aria-label="Waiting for a reply" />}
                  </div>
                  {(c.open_commitments > 0 || (!c.window_open && c.channels.includes("whatsapp"))) && (
                    <div className="flex gap-1.5 mt-1">
                      {c.open_commitments > 0 && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300">
                          {c.open_commitments} open promise{c.open_commitments === 1 ? "" : "s"}
                        </span>
                      )}
                      {!c.window_open && c.channels.includes("whatsapp") && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/[0.05] text-os-text-dim">Template only</span>
                      )}
                    </div>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
