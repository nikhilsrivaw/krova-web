"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Instagram, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  channels,
  type ChannelConnection,
  type InstagramConversation,
  type InstagramInsights,
} from "@/lib/api";

const INSTAGRAM_METRIC_LABELS: Record<string, string> = {
  reach: "Reach",
  follower_count: "New Followers",
  profile_views: "Profile Views",
  accounts_engaged: "Accounts Engaged",
  total_interactions: "Total Interactions",
  website_clicks: "Website Clicks",
};

export default function InstagramPage() {
  const [connection, setConnection] = useState<ChannelConnection | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [insights, setInsights] = useState<InstagramInsights | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const list = await channels.list();
      const conn = list.find((c) => c.channel === "instagram") || null;
      setConnection(conn);
      // A 409 here just means not connected yet - not worth surfacing as
      // a page-level load error the way the connection list's own
      // failure is.
      if (conn?.status === "active") {
        channels.instagramInsights().then(setInsights).catch(() => setInsights(null));
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load Instagram data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Feedback after either Instagram connect route's redirect lands back
  // here - read directly from the URL rather than a Next.js hook, since
  // this page is fully client-rendered and the round trip is a plain
  // browser redirect.
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("instagram");
    if (!result) return;
    const messages: Record<string, string> = {
      connected: "Instagram connected.",
      error: "Could not connect Instagram. Please try again.",
      expired: "That connection attempt expired. Please try again.",
    };
    if (messages[result]) alert(messages[result]);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const handleConnectInstagram = async () => {
    try {
      const res = await channels.instagramFbConnectUrl();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        alert("Instagram isn't configured for this account yet.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not connect Instagram.");
    }
  };

  const handleConnectInstagramLogin = async () => {
    try {
      const res = await channels.instagramConnectUrl();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        alert("Instagram Login isn't configured for this account yet.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not connect Instagram.");
    }
  };

  // Temporary - manual Instagram send test for the App Review screencast,
  // since no general Instagram inbox/composer UI exists yet and the recipient
  // IGSID has to be typed in by hand (no read path works pre-Advanced-Access
  // to look it up automatically). Remove once a real Instagram inbox ships.
  const [igSendTo, setIgSendTo] = useState("");
  const [igSendBody, setIgSendBody] = useState("");
  const [igSending, setIgSending] = useState(false);
  const [igSendResult, setIgSendResult] = useState<string | null>(null);
  const [igConversations, setIgConversations] = useState<InstagramConversation[]>([]);
  const [igLoadingConversations, setIgLoadingConversations] = useState(false);
  const [igConversationsError, setIgConversationsError] = useState<string | null>(null);

  const loadIgConversations = useCallback(async () => {
    setIgLoadingConversations(true);
    setIgConversationsError(null);
    try {
      const rows = await channels.instagramConversations();
      setIgConversations(rows ?? []);
    } catch (err) {
      setIgConversationsError(
        err instanceof Error ? err.message : "Could not load conversations."
      );
    } finally {
      setIgLoadingConversations(false);
    }
  }, []);

  const handleSendInstagram = async () => {
    if (!igSendTo.trim() || !igSendBody.trim()) return;
    setIgSending(true);
    setIgSendResult(null);
    try {
      const res = await channels.sendInstagramText(igSendTo.trim(), igSendBody.trim());
      if (res?.sent) {
        setIgSendResult(`Sent — message id ${res.message_id}`);
        setIgSendBody("");
      } else {
        setIgSendResult("Send did not confirm");
      }
    } catch (err) {
      setIgSendResult(err instanceof Error ? err.message : "Could not send message.");
    } finally {
      setIgSending(false);
    }
  };

  return (
    <AppLayout title="Instagram" subtitle="Connection, DMs & Comments">
      <div className="space-y-6 max-w-4xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}

        {isLoading ? (
          <div className="p-8 text-center text-os-text-dim text-xs font-mono">Loading…</div>
        ) : !connection ? (
          <>
            <EmptyState
              icon={Instagram}
              title="No Instagram account connected"
              description="Connect through either Meta login route below to start receiving DMs and comments."
            />
            <GlassCard className="p-6">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleConnectInstagram}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold border border-white/[0.1] transition-all cursor-pointer"
                >
                  Connect Instagram
                </button>
                <button
                  type="button"
                  onClick={handleConnectInstagramLogin}
                  className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white text-xs font-bold border border-white/[0.08] transition-all cursor-pointer"
                >
                  Connect via Instagram Login
                </button>
              </div>
            </GlassCard>
          </>
        ) : (
          <>
            <GlassCard className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
                    <Instagram className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Instagram Business</h4>
                    <p className="text-[11px] text-os-text-dim font-mono">
                      {connection.handle || connection.display_name || "Connected"}
                    </p>
                  </div>
                </div>
                <Badge variant={connection.status === "active" ? "emerald" : "amber"} dot>
                  {connection.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Username</p>
                  <p className="text-sm text-white font-mono font-semibold">{connection.handle || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Display name</p>
                  <p className="text-sm text-white font-mono font-semibold">{connection.display_name || "—"}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Account ID</p>
                  <p className="text-sm text-white font-mono font-semibold">{connection.external_account_id}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Connected since</p>
                  <p className="text-sm text-white font-mono font-semibold">
                    {connection.connected_at ? new Date(connection.connected_at).toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              {/* Reachable while connected on purpose: re-running the Meta
                  login is how a business switches which Instagram account
                  is linked, and how anyone demonstrates the grant flow
                  without first tearing the connection down. */}
              <div className="flex items-center gap-2 pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={handleConnectInstagram}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                >
                  Reconnect
                </button>
                {/* Instagram Business Login - a separate connect route from
                    the Facebook Login button above (different Meta app,
                    different token host). Kept as a distinct button rather
                    than merged in, since which one a business should use is
                    a real choice, not a detail to hide. */}
                <button
                  type="button"
                  onClick={handleConnectInstagramLogin}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                >
                  Reconnect via Instagram Login
                </button>
              </div>
            </GlassCard>

            {insights && (
              <GlassCard className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white">Insights</h3>
                  <p className="text-xs text-os-text-dim">
                    Live from Meta, not stored twice - the last {insights.period_days} days.
                  </p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  {Object.entries(insights.values).map(([key, value]) => (
                    <div key={key} className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06]">
                      <span className="text-os-text-dim text-[10px] block">
                        {INSTAGRAM_METRIC_LABELS[key] || key}
                      </span>
                      <span className="text-lg font-bold text-white">{value.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}

            {connection.status === "active" && (
              <GlassCard className="p-6 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">Send an Instagram message</p>
                    <p className="text-[11px] text-os-text-dim">
                      Choose a person who has messaged {connection.handle || "this account"}, write a
                      reply, and send it from here. It arrives in their Instagram inbox.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadIgConversations}
                    disabled={igLoadingConversations}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${igLoadingConversations ? "animate-spin" : ""}`} />
                    {igLoadingConversations ? "Loading…" : "Load conversations"}
                  </button>
                </div>

                {igConversationsError && (
                  <p className="text-[11px] text-red-400 font-mono">{igConversationsError}</p>
                )}

                {igConversations.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-[10px] uppercase tracking-wide text-os-text-dim font-mono">
                      Recipient
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {igConversations.flatMap((conversation) =>
                        conversation.participants.map((person) => {
                          const selected = igSendTo === person.id;
                          return (
                            <button
                              key={`${conversation.id}-${person.id}`}
                              type="button"
                              onClick={() => setIgSendTo(person.id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all cursor-pointer ${
                                selected
                                  ? "bg-pink-500/[0.15] border-pink-500/[0.4] text-white"
                                  : "bg-white/[0.04] border-white/[0.08] text-os-text-dim hover:text-white hover:bg-white/[0.07]"
                              }`}
                            >
                              @{person.username || person.id}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="block text-[10px] uppercase tracking-wide text-os-text-dim font-mono">
                    Recipient ID
                  </label>
                  <input
                    type="text"
                    value={igSendTo}
                    onChange={(e) => setIgSendTo(e.target.value)}
                    placeholder="Pick someone above, or paste an Instagram-scoped ID"
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={igSendBody}
                    onChange={(e) => setIgSendBody(e.target.value)}
                    placeholder="Write your message…"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                  />
                  <button
                    type="button"
                    onClick={handleSendInstagram}
                    disabled={igSending || !igSendTo.trim() || !igSendBody.trim()}
                    className="px-4 py-1.5 rounded-lg bg-pink-500/[0.15] hover:bg-pink-500/[0.25] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-pink-500/[0.3] transition-all cursor-pointer"
                  >
                    {igSending ? "Sending…" : "Send message"}
                  </button>
                </div>

                {igSendResult && (
                  <p className="text-[11px] text-os-text-dim font-mono">{igSendResult}</p>
                )}
              </GlassCard>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
