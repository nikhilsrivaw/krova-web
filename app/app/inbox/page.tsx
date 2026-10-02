"use client";

import { useEffect, useState } from "react";
import { MessageSquare, Instagram, Phone, Mail, Lock } from "lucide-react";
import { conversations, type ConversationItem } from "@/lib/api";
import { appPath } from "@/lib/app-nav";

const CHANNEL_ICONS: Record<string, typeof MessageSquare> = {
  whatsapp: MessageSquare,
  instagram: Instagram,
  voice: Phone,
  email: Mail,
};

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const ms = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

export default function InboxPage() {
  const [list, setList] = useState<ConversationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    conversations
      .list()
      .then(setList)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="px-4 pt-5 max-w-md mx-auto">
      <h1 className="text-lg font-semibold text-os-ink mb-4">Conversations</h1>

      {isLoading ? (
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className="text-center text-sm text-os-text-dim py-12">No conversations yet.</p>
      ) : (
        <div className="space-y-2">
          {list.map((c) => {
            const primaryChannel = c.channels[0] || "whatsapp";
            const Icon = CHANNEL_ICONS[primaryChannel] || MessageSquare;
            return (
              <a
                key={c.customer_id}
                href={appPath(`/inbox/${c.customer_id}`)}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-os-card border border-os-border active:bg-white/[0.03] transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-teal/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-teal" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-os-ink truncate flex items-center gap-1.5">
                      {c.is_private && <Lock className="w-3 h-3 text-os-text-dim shrink-0" />}
                      {c.name || "Unknown"}
                    </p>
                    <span className="text-[10px] text-os-text-dim shrink-0">
                      {timeAgo(c.last_message_at)}
                    </span>
                  </div>
                  <p className="text-xs text-os-text-dim truncate mt-0.5">
                    {c.last_direction === "outbound" ? "You: " : ""}
                    {c.last_message || "No messages"}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
