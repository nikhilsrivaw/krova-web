"use client";

import React, { useEffect, useRef, useState } from "react";
import { Headset, MessageSquareText } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { EmptyState } from "@/components/ui/EmptyState";
import { API_BASE, getAccessToken } from "@/lib/auth";

type CopilotMessage = { call_uuid: string; suggestion: string };
type Suggestion = CopilotMessage & { id: number; receivedAt: number };

// First WebSocket client in this codebase - see FRONTEND_MAP.md / project
// notes on why: copilot suggestions need sub-2-second latency to be useful
// mid-conversation, which the app's only existing "live" pattern (15s
// setInterval polling, see AppSidebar's approvals badge) can't hit.
function wsUrl(path: string): string {
  return `${API_BASE.replace(/^http/, "ws")}${path}`;
}

export default function LiveAssistPage() {
  const [status, setStatus] = useState<"connecting" | "live" | "disconnected">("connecting");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const nextId = useRef(0);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let cancelled = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    const connect = () => {
      const token = getAccessToken();
      if (!token || cancelled) return;

      setStatus("connecting");
      const socket = new WebSocket(
        wsUrl(`/voice/copilot-assist?token=${encodeURIComponent(token)}`)
      );
      socketRef.current = socket;

      socket.onopen = () => {
        if (!cancelled) setStatus("live");
      };

      socket.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data) as CopilotMessage;
          if (!parsed.suggestion) return;
          setSuggestions((prev) => [
            { ...parsed, id: nextId.current++, receivedAt: Date.now() },
            ...prev,
          ].slice(0, 50));
        } catch {
          // A frame that isn't valid JSON isn't worth surfacing as an error -
          // the next one will most likely be fine.
        }
      };

      socket.onclose = () => {
        if (cancelled) return;
        setStatus("disconnected");
        // A dropped connection is routine (network blip, server restart) on
        // a socket meant to stay open for as long as this page is - retry
        // rather than leaving a staff member's live feed silently dead.
        reconnectTimer = setTimeout(connect, 3000);
      };

      socket.onerror = () => {
        socket.close();
      };
    };

    connect();
    return () => {
      cancelled = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socketRef.current?.close();
    };
  }, []);

  return (
    <AppLayout
      title="Live Assist"
      subtitle="Real-time suggestions while you're on a call - the AI listens, you talk"
    >
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] text-xs">
          <span
            className={`h-2 w-2 rounded-full ${
              status === "live"
                ? "bg-seal-bright animate-pulse"
                : status === "connecting"
                ? "bg-amber-400 animate-pulse"
                : "bg-os-text-dim"
            }`}
          />
          <span className="font-mono text-os-text-dim">
            {status === "live"
              ? "Connected - waiting for a call"
              : status === "connecting"
              ? "Connecting..."
              : "Disconnected - retrying"}
          </span>
        </div>

        <GlassCard className="p-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Headset className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Suggested talking points</h3>
              <p className="text-xs text-os-text-dim mt-0.5">
                Nothing here is spoken or sent anywhere - it's only for you, while a call is live
                on your Staff Phone Number.
              </p>
            </div>
          </div>

          {suggestions.length === 0 ? (
            <div className="pt-6">
              <EmptyState
                icon={MessageSquareText}
                title="No suggestions yet"
                description="Once someone calls your connected number in Live Copilot mode, real-time suggestions will appear here as the conversation happens."
              />
            </div>
          ) : (
            <div className="pt-4 space-y-3">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-xl bg-cyan-500/[0.06] border border-cyan-500/20 text-sm text-white leading-relaxed"
                >
                  {s.suggestion}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </AppLayout>
  );
}
