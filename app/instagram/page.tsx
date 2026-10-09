"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Instagram, RefreshCw, ImagePlus, GalleryHorizontal, Plus, Trash2, Loader2, ImageIcon } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  channels,
  type ChannelConnection,
  type InstagramConversation,
  type InstagramInsights,
  type InstagramCarouselElement,
  type SavedInstagramCarousel,
} from "@/lib/api";

const MIN_CAROUSEL_CARDS = 1;
const MAX_CAROUSEL_CARDS = 10;

type CarouselCardState = {
  title: string;
  subtitle: string;
  imageUrl: string | null;
  isUploading: boolean;
  uploadError: string | null;
  buttonEnabled: boolean;
  buttonType: "web_url" | "postback";
  buttonTitle: string;
  buttonUrl: string;
  buttonPayload: string;
};

const EMPTY_CAROUSEL_CARD: CarouselCardState = {
  title: "", subtitle: "", imageUrl: null, isUploading: false, uploadError: null,
  buttonEnabled: false, buttonType: "web_url", buttonTitle: "", buttonUrl: "", buttonPayload: "",
};

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

  // Carousel ("Generic Template") composer - no Meta review needed, sends
  // instantly, so no draft/pending state the way WhatsApp templates have.
  const [carouselTo, setCarouselTo] = useState("");
  const [carouselCards, setCarouselCards] = useState<CarouselCardState[]>([
    { ...EMPTY_CAROUSEL_CARD },
    { ...EMPTY_CAROUSEL_CARD },
  ]);
  const [isSendingCarousel, setIsSendingCarousel] = useState(false);
  const [carouselError, setCarouselError] = useState<string | null>(null);
  const [carouselResult, setCarouselResult] = useState<string | null>(null);

  const updateCarouselCard = (index: number, patch: Partial<CarouselCardState>) => {
    setCarouselCards((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  };

  const addCarouselCard = () =>
    setCarouselCards((prev) => (prev.length < MAX_CAROUSEL_CARDS ? [...prev, { ...EMPTY_CAROUSEL_CARD }] : prev));

  const removeCarouselCard = (index: number) =>
    setCarouselCards((prev) => (prev.length > MIN_CAROUSEL_CARDS ? prev.filter((_, i) => i !== index) : prev));

  const handleCarouselImagePick = async (index: number, file: File) => {
    updateCarouselCard(index, { isUploading: true, uploadError: null });
    try {
      const uploaded = await channels.uploadInstagramCarouselImage(file);
      updateCarouselCard(index, { imageUrl: uploaded.image_url, isUploading: false });
    } catch (err) {
      updateCarouselCard(index, {
        isUploading: false,
        uploadError: err instanceof Error ? err.message : "Could not upload this image.",
      });
    }
  };

  // The cards on their own are complete: enough of them, each with a title, no
  // image still uploading, any button filled in. Saving needs only this.
  const cardsAreComplete =
    carouselCards.length >= MIN_CAROUSEL_CARDS &&
    carouselCards.every(
      (c) =>
        c.title.trim() &&
        !c.isUploading &&
        (!c.buttonEnabled || (c.buttonTitle.trim() && (c.buttonType === "web_url" ? c.buttonUrl.trim() : c.buttonPayload.trim()))),
    );
  // Sending also needs someone to send to. Saving used to share this check, so
  // the Save button stayed dead until a recipient was picked - for something
  // that has nothing to do with a recipient.
  const canSendCarousel = !!carouselTo.trim() && cardsAreComplete;

  const buildCarouselElements = (): InstagramCarouselElement[] =>
    carouselCards.map((c) => ({
      title: c.title.trim(),
      subtitle: c.subtitle.trim() || undefined,
      image_url: c.imageUrl || undefined,
      buttons: c.buttonEnabled
        ? [{
            type: c.buttonType,
            title: c.buttonTitle.trim(),
            url: c.buttonType === "web_url" ? c.buttonUrl.trim() : undefined,
            payload: c.buttonType === "postback" ? c.buttonPayload.trim() : undefined,
          }]
        : [],
    }));

  const handleSendCarousel = async () => {
    if (!canSendCarousel) return;
    setIsSendingCarousel(true);
    setCarouselError(null);
    setCarouselResult(null);
    try {
      const res = await channels.sendInstagramCarousel(carouselTo.trim(), buildCarouselElements());
      if (res?.sent) {
        setCarouselResult(`Sent — message id ${res.message_id}`);
        setCarouselCards([{ ...EMPTY_CAROUSEL_CARD }, { ...EMPTY_CAROUSEL_CARD }]);
      } else {
        setCarouselResult("Send did not confirm");
      }
    } catch (err) {
      setCarouselError(err instanceof Error ? err.message : "Could not send this carousel.");
    } finally {
      setIsSendingCarousel(false);
    }
  };

  // Saved, reusable carousels - shared/ai/agent.py's share_carousel picks
  // one of these by name during a live reply, same idea as a WhatsApp
  // catalog a business sets up once and the agent offers when it fits.
  const [savedCarousels, setSavedCarousels] = useState<SavedInstagramCarousel[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savingResultId, setSavingResultId] = useState<string | null>(null);

  const loadSavedCarousels = useCallback(async () => {
    setIsLoadingSaved(true);
    try {
      const rows = await channels.listSavedInstagramCarousels();
      setSavedCarousels(rows ?? []);
    } catch {
      // Quiet fallback - this list is a convenience, not load-bearing for
      // the page itself.
    } finally {
      setIsLoadingSaved(false);
    }
  }, []);

  useEffect(() => {
    loadSavedCarousels();
  }, [loadSavedCarousels]);

  const [saveNotice, setSaveNotice] = useState<string | null>(null);

  const handleSaveCarousel = async () => {
    if (!saveName.trim() || !cardsAreComplete) return;
    setIsSaving(true);
    setSaveError(null);
    setSaveNotice(null);
    try {
      const saved = await channels.saveInstagramCarousel(
        saveName.trim(), saveDescription.trim(), buildCarouselElements(),
      );
      setSavedCarousels((prev) => [...prev, saved].sort((a, b) => a.name.localeCompare(b.name)));
      // The name is normalised on the server (lowercase, underscores), so say
      // what it was actually saved as - that is what the AI and rules see.
      setSaveNotice(`Saved as "${saved.name}". Your AI and automations can now use it.`);
      setSaveName("");
      setSaveDescription("");
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save this carousel.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendSavedCarousel = async (carousel: SavedInstagramCarousel) => {
    if (!carouselTo.trim()) {
      setCarouselError("Pick a recipient above first.");
      return;
    }
    setSavingResultId(carousel.id);
    setCarouselError(null);
    try {
      const res = await channels.sendSavedInstagramCarousel(carousel.id, carouselTo.trim());
      setCarouselResult(res?.sent ? `Sent "${carousel.name}" — message id ${res.message_id}` : "Send did not confirm");
    } catch (err) {
      setCarouselError(err instanceof Error ? err.message : "Could not send this carousel.");
    } finally {
      setSavingResultId(null);
    }
  };

  const handleDeleteSavedCarousel = async (id: string) => {
    try {
      await channels.deleteSavedInstagramCarousel(id);
      setSavedCarousels((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not delete this carousel.");
    }
  };

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

  // Photo posts only for now - video/Reels need a second, polled step
  // (Meta processes the upload after the container is created) that
  // isn't built yet. See InstagramClient.publish_photo's own docstring.
  const [publishFile, setPublishFile] = useState<File | null>(null);
  const [publishCaption, setPublishCaption] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<string | null>(null);

  const handlePublish = async () => {
    if (!publishFile) return;
    setPublishing(true);
    setPublishResult(null);
    try {
      const res = await channels.publishInstagramPhoto(publishFile, publishCaption.trim());
      setPublishResult(`Published — media id ${res.media_id}`);
      setPublishFile(null);
      setPublishCaption("");
    } catch (err) {
      setPublishResult(err instanceof Error ? err.message : "Could not publish this photo.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <AppLayout title="Instagram" subtitle="Connection, DMs & Comments">
      <div className="workspace-instagram space-y-6">
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
              <div className="workspace-actions">
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
              <div className="workspace-card-heading justify-between mb-5">
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

              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5 mb-5">
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
              <div className="workspace-actions pt-4 border-t border-white/[0.06]">
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
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
                    <ImagePlus className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Publish a photo</p>
                    <p className="text-[11px] text-os-text-dim">
                      Posts to {connection.handle || "this account"}&apos;s feed. Photos only for now - video/Reels are a separate, larger build.
                    </p>
                  </div>
                </div>

                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  onChange={(e) => setPublishFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-os-text-dim file:mr-3 file:px-3 file:py-1.5 file:rounded-lg file:border file:border-white/[0.08] file:bg-white/[0.04] file:text-white file:text-xs file:font-semibold file:cursor-pointer cursor-pointer"
                />

                <textarea
                  value={publishCaption}
                  onChange={(e) => setPublishCaption(e.target.value)}
                  placeholder="Write a caption…"
                  rows={2}
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                />

                <button
                  type="button"
                  onClick={handlePublish}
                  disabled={publishing || !publishFile}
                  className="px-4 py-1.5 rounded-lg bg-pink-500/[0.15] hover:bg-pink-500/[0.25] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-pink-500/[0.3] transition-all cursor-pointer"
                >
                  {publishing ? "Publishing…" : "Publish"}
                </button>

                {publishResult && (
                  <p className="text-[11px] text-os-text-dim font-mono">{publishResult}</p>
                )}
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

            {connection.status === "active" && (
              <GlassCard className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
                    <GalleryHorizontal className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-white">Send a carousel</p>
                    <p className="text-[11px] text-os-text-dim">
                      Up to 10 swipeable cards - a picture, a title, an optional line and a button
                      each. Unlike a WhatsApp template, this needs no Meta review - it sends
                      instantly, to anyone who's messaged {connection.handle || "this account"} in
                      the last 24 hours.
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] text-os-text-dim">
                    Pick someone who has messaged this account in the last 24 hours.
                  </p>
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
                          const selected = carouselTo === person.id;
                          return (
                            <button
                              key={`carousel-${conversation.id}-${person.id}`}
                              type="button"
                              onClick={() => setCarouselTo(person.id)}
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
                    value={carouselTo}
                    onChange={(e) => setCarouselTo(e.target.value)}
                    placeholder={
                      igConversations.length > 0
                        ? "Or paste an Instagram-scoped ID directly"
                        : "Paste an Instagram-scoped ID, or click Load conversations to pick someone"
                    }
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                  />
                </div>

                <div className="space-y-2.5">
                  {carouselCards.map((card, i) => (
                    <div key={i} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] space-y-2">
                      <div className="flex items-start gap-3">
                        <label className="w-16 h-16 shrink-0 rounded-lg border border-dashed border-white/20 flex items-center justify-center cursor-pointer bg-black/30 overflow-hidden relative">
                          {card.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={card.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-4 h-4 text-os-text-dim" />
                          )}
                          {card.isUploading && (
                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                              <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
                            </div>
                          )}
                          <input
                            type="file" accept="image/jpeg,image/png" className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleCarouselImagePick(i, file);
                            }}
                          />
                        </label>
                        <div className="flex-1 space-y-1.5 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-mono uppercase text-os-text-dim">Card {i + 1}</span>
                            <button
                              type="button" onClick={() => removeCarouselCard(i)}
                              disabled={carouselCards.length <= MIN_CAROUSEL_CARDS}
                              className="text-os-text-dim hover:text-thread-bright disabled:opacity-30 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <input
                            type="text" maxLength={80} value={card.title}
                            onChange={(e) => updateCarouselCard(i, { title: e.target.value })}
                            placeholder="Title (max 80 characters)"
                            className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                          />
                          <input
                            type="text" maxLength={80} value={card.subtitle}
                            onChange={(e) => updateCarouselCard(i, { subtitle: e.target.value })}
                            placeholder="Subtitle, optional (max 80 characters)"
                            className="w-full px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-xs text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                          />
                          {card.uploadError && <p className="text-[10px] text-red-400">{card.uploadError}</p>}
                        </div>
                      </div>

                      <label className="flex items-center gap-1.5 text-[11px] text-os-text-dim cursor-pointer">
                        <input
                          type="checkbox" checked={card.buttonEnabled}
                          onChange={(e) => updateCarouselCard(i, { buttonEnabled: e.target.checked })}
                        />
                        Add a button
                      </label>
                      {card.buttonEnabled && (
                        <div className="flex items-center gap-1.5 pl-5">
                          <select
                            value={card.buttonType}
                            onChange={(e) => updateCarouselCard(i, { buttonType: e.target.value as "web_url" | "postback" })}
                            className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-[11px] text-white focus:border-brass focus:outline-none shrink-0"
                          >
                            <option value="web_url">Open a link</option>
                            <option value="postback">Postback (custom reply)</option>
                          </select>
                          <input
                            type="text" maxLength={20} value={card.buttonTitle}
                            onChange={(e) => updateCarouselCard(i, { buttonTitle: e.target.value })}
                            placeholder="Button text"
                            className="w-24 px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-[11px] text-white placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                          />
                          {card.buttonType === "web_url" ? (
                            <input
                              type="text" value={card.buttonUrl}
                              onChange={(e) => updateCarouselCard(i, { buttonUrl: e.target.value })}
                              placeholder="https://..."
                              className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-[11px] text-white font-mono placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                            />
                          ) : (
                            <input
                              type="text" value={card.buttonPayload}
                              onChange={(e) => updateCarouselCard(i, { buttonPayload: e.target.value })}
                              placeholder="Payload your bot will receive"
                              className="flex-1 px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.1] text-[11px] text-white font-mono placeholder:text-os-text-dim focus:border-brass focus:outline-none"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {carouselCards.length < MAX_CAROUSEL_CARDS && (
                    <button
                      type="button" onClick={addCarouselCard}
                      className="text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add another card
                    </button>
                  )}
                </div>

                {carouselError && (
                  <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                    {carouselError}
                  </div>
                )}
                {carouselResult && (
                  <p className="text-[11px] text-os-text-dim font-mono">{carouselResult}</p>
                )}

                <button
                  type="button"
                  onClick={handleSendCarousel}
                  disabled={!canSendCarousel || isSendingCarousel}
                  className="px-4 py-1.5 rounded-lg bg-pink-500/[0.15] hover:bg-pink-500/[0.25] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-pink-500/[0.3] transition-all cursor-pointer"
                >
                  {isSendingCarousel ? "Sending…" : "Send carousel"}
                </button>

                <div className="pt-3 border-t border-white/[0.06] space-y-2">
                  <p className="text-[11px] text-os-text-dim">
                    Save these cards under a name, and KROVA's AI can offer this same carousel on
                    its own during a live reply - when a customer's message matches what it's for.
                  </p>
                  <p className="text-[11px] text-os-text-dim">
                    Want it personal? Put <code className="text-brass-bright">{"{{1}}"}</code>,{" "}
                    <code className="text-brass-bright">{"{{2}}"}</code> in a card&apos;s title or subtitle, e.g.
                    &quot;Hi {"{{1}}"}, picked for you&quot; - the AI fills it in from the chat (the
                    customer&apos;s name, a number they wrote) and skips the carousel if it can&apos;t. Such a
                    carousel can&apos;t be sent by hand.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="Name (e.g. new_arrivals)"
                      className="w-40 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                    />
                    <input
                      type="text"
                      value={saveDescription}
                      onChange={(e) => setSaveDescription(e.target.value)}
                      placeholder="What it's for, e.g. our 4 bestselling kurtas"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                    />
                    <button
                      type="button"
                      onClick={handleSaveCarousel}
                      disabled={!saveName.trim() || !cardsAreComplete || isSaving}
                      className="shrink-0 px-4 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                    >
                      {isSaving ? "Saving…" : "Save"}
                    </button>
                  </div>
                  {!cardsAreComplete && saveName.trim() && (
                    <p className="text-[11px] text-amber-400">
                      Every card needs a title (and a filled-in button, if you added one) before it can be saved.
                    </p>
                  )}
                  {saveNotice && <p className="text-[11px] text-emerald-400">{saveNotice}</p>}
                  {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}
                </div>
              </GlassCard>
            )}

            {connection.status === "active" && savedCarousels.length > 0 && (
              <GlassCard className="p-6 space-y-3">
                <div>
                  <p className="text-sm font-semibold text-white">Saved carousels</p>
                  <p className="text-[11px] text-os-text-dim">
                    What the AI can choose from when it decides a reply should include one
                    ("Available Instagram carousels" in its own instructions). Send one by hand
                    here too, to the recipient picked above.
                  </p>
                </div>
                <div className="space-y-2">
                  {savedCarousels.map((c) => (
                    <div
                      key={c.id}
                      className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold font-mono text-white">{c.name}</p>
                        <p className="text-[11px] text-os-text-dim truncate">
                          {c.description || `${c.elements.length} card${c.elements.length === 1 ? "" : "s"}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {JSON.stringify(c.elements).includes("{{") ? (
                          <span
                            title="Has {{placeholders}} the AI fills in from a conversation - there's nothing to fill them with when sending by hand."
                            className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono text-os-text-dim"
                          >
                            AI fills in
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSendSavedCarousel(c)}
                            disabled={savingResultId === c.id}
                            className="px-3 py-1.5 rounded-lg bg-pink-500/[0.15] hover:bg-pink-500/[0.25] disabled:opacity-40 text-white text-[11px] font-semibold border border-pink-500/[0.3] transition-all cursor-pointer"
                          >
                            {savingResultId === c.id ? "Sending…" : "Send"}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteSavedCarousel(c.id)}
                          className="p-1.5 rounded-lg text-os-text-dim hover:text-thread-bright hover:bg-white/[0.06] cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
