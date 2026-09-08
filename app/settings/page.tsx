"use client";

import React, { useCallback, useEffect, useState } from "react";
import {
  Settings,
  Shield,
  User,
  Building,
  MessageSquare,
  Phone,
  Mail,
  Zap,
  CreditCard,
  Check,
  ExternalLink,
  RefreshCw,
  Sparkles,
  AlertTriangle,
  Activity,
  Megaphone,
  Instagram,
  Calendar,
  Webhook,
  Trash2,
  KeyRound,
  Download,
  Star,
  Github,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import {
  account,
  approvals,
  channels,
  waAccount,
  integrations,
  dataExport,
  WEBHOOK_EVENT_TYPES,
  WEBHOOK_FORMATS,
  type UserProfile,
  type AutonomyLevel,
  type ChannelConnection,
  type WhatsAppProfile,
  type WhatsAppHealth,
  type WhatsAppReadiness,
  type CalendarStatus,
  type OutboundWebhookRow,
  type ApiKeyRow,
  type GitHubConnection,
  type EmailConnection,
  type StripeConnectionInfo,
  type InstagramConversation,
} from "@/lib/api";

const VERTICALS = [
  { key: "clinic", label: "Clinic & Healthcare", desc: "Patient appointments, doctor consultations, diagnostic tests" },
  { key: "coaching", label: "Coaching Institute", desc: "Student inquiries, batch enrollments, test series fee collection" },
  { key: "salon", label: "Salon & Spa Chain", desc: "Stylist bookings, service catalogs, appointment rescheduling" },
  { key: "agency", label: "Agency & Consultancy", desc: "Retainer invoices, project milestone deliverables, scope approvals" },
  { key: "general", label: "General Professional SMB", desc: "Standard business inquiries, quotes and invoice follow-ups" },
];

export default function SettingsPage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [channelsList, setChannelsList] = useState<ChannelConnection[]>([]);
  const [autonomy, setAutonomy] = useState<AutonomyLevel>("draft");
  const [vertical, setVertical] = useState<string>("clinic");
  const [businessName, setBusinessName] = useState("Apex Medical Clinic");
  const [fullName, setFullName] = useState("Dr. Rajesh Sharma");
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isExportingCustomers, setIsExportingCustomers] = useState(false);
  const [isExportingConversations, setIsExportingConversations] = useState(false);

  // WhatsApp Business Account - profile, health, readiness
  const [waProfile, setWaProfile] = useState<WhatsAppProfile | null>(null);
  const [waHealth, setWaHealth] = useState<WhatsAppHealth | null>(null);
  const [waReadiness, setWaReadiness] = useState<WhatsAppReadiness | null>(null);
  const [waAbout, setWaAbout] = useState("");
  const [waDescription, setWaDescription] = useState("");
  const [waAddress, setWaAddress] = useState("");
  const [waEmail, setWaEmail] = useState("");
  const [waCategory, setWaCategory] = useState("");
  const [waCategoryOptions, setWaCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [isSavingWaProfile, setIsSavingWaProfile] = useState(false);
  const [waProfileSaved, setWaProfileSaved] = useState(false);
  const [waProfileError, setWaProfileError] = useState<string | null>(null);

  // Click-to-WhatsApp ad attribution
  const [datasetId, setDatasetId] = useState("");
  const [isSavingDataset, setIsSavingDataset] = useState(false);
  const [datasetSaved, setDatasetSaved] = useState(false);

  // Number verification and two-step PIN
  const [verifyMethod, setVerifyMethod] = useState<"SMS" | "VOICE">("SMS");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifySent, setVerifySent] = useState<string | null>(null);
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [isRequestingCode, setIsRequestingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [isSavingPin, setIsSavingPin] = useState(false);
  const [pinResult, setPinResult] = useState<string | null>(null);

  const waConnection = channelsList.find((c) => c.channel === "whatsapp") || null;
  const voiceConnection = channelsList.find((c) => c.channel === "voice") || null;
  const emailConnection = channelsList.find((c) => c.channel === "email") || null;
  const igConnection = channelsList.find((c) => c.channel === "instagram") || null;

  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus | null>(null);
  const [webhooksList, setWebhooksList] = useState<OutboundWebhookRow[]>([]);
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [newWebhookEvents, setNewWebhookEvents] = useState<string[]>([]);
  const [newWebhookFormat, setNewWebhookFormat] = useState<string>("raw");
  const [isCreatingWebhook, setIsCreatingWebhook] = useState(false);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);

  const [apiKeysList, setApiKeysList] = useState<ApiKeyRow[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState("");
  const [isCreatingApiKey, setIsCreatingApiKey] = useState(false);
  const [createdApiKey, setCreatedApiKey] = useState<string | null>(null);

  // Software-startup vertical: the closed bug-lifecycle loop.
  const [githubConnection, setGithubConnection] = useState<GitHubConnection | null>(null);
  const [githubRepoOwner, setGithubRepoOwner] = useState("");
  const [githubRepoName, setGithubRepoName] = useState("");
  const [githubToken, setGithubToken] = useState("");
  const [githubWebhookSecret, setGithubWebhookSecret] = useState("");
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);

  // Postmark sender signature - distinct from `emailConnection` above,
  // which is the read-only Gmail channel; this is the outbound send path.
  const [emailSendConnection, setEmailSendConnection] = useState<EmailConnection | null>(null);
  const [sendFromEmail, setSendFromEmail] = useState("");
  const [isConnectingEmailSend, setIsConnectingEmailSend] = useState(false);

  const [stripeConnection, setStripeConnection] = useState<StripeConnectionInfo | null>(null);
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [isConnectingStripe, setIsConnectingStripe] = useState(false);

  // Feedback after the Instagram Business Login redirect lands back here -
  // read directly from the URL rather than a Next.js hook, since this page
  // is fully client-rendered and the round trip is a plain browser redirect.
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

  // Same round-trip pattern as Instagram's own redirect handling above, for
  // the Google Calendar OAuth callback.
  useEffect(() => {
    const result = new URLSearchParams(window.location.search).get("calendar");
    if (!result) return;
    const messages: Record<string, string> = {
      connected: "Google Calendar connected.",
      error: "Could not connect Google Calendar. Please try again.",
      expired: "That connection attempt expired. Please try again.",
    };
    if (messages[result]) alert(messages[result]);
    window.history.replaceState({}, "", window.location.pathname);
  }, []);

  useEffect(() => {
    let mounted = true;
    Promise.allSettled([
      integrations.googleCalendarStatus(),
      integrations.listWebhooks(),
      integrations.listApiKeys(),
      integrations.githubStatus(),
      integrations.emailConnectionStatus(),
      integrations.stripeStatus(),
    ]).then(([calRes, whRes, keyRes, ghRes, emailRes, stripeRes]) => {
      if (!mounted) return;
      if (calRes.status === "fulfilled") setCalendarStatus(calRes.value);
      if (whRes.status === "fulfilled") setWebhooksList(whRes.value);
      if (keyRes.status === "fulfilled") setApiKeysList(keyRes.value);
      if (ghRes.status === "fulfilled") setGithubConnection(ghRes.value);
      if (emailRes.status === "fulfilled") setEmailSendConnection(emailRes.value);
      if (stripeRes.status === "fulfilled") setStripeConnection(stripeRes.value);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const handleConnectGoogleCalendar = async () => {
    try {
      const res = await integrations.googleCalendarConnectUrl();
      window.location.href = res.url;
    } catch (err) {
      alert(err instanceof Error ? err.message : "Google Calendar isn't configured for this account yet.");
    }
  };

  const handleConnectGithub = async () => {
    if (!githubRepoOwner.trim() || !githubRepoName.trim() || !githubToken.trim() || !githubWebhookSecret.trim()) return;
    setIsConnectingGithub(true);
    try {
      const connected = await integrations.connectGithub({
        repo_owner: githubRepoOwner.trim(),
        repo_name: githubRepoName.trim(),
        access_token: githubToken.trim(),
        webhook_secret: githubWebhookSecret.trim(),
      });
      setGithubConnection(connected);
      setGithubRepoOwner("");
      setGithubRepoName("");
      setGithubToken("");
      setGithubWebhookSecret("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not connect this repo - check the token has issue access.");
    } finally {
      setIsConnectingGithub(false);
    }
  };

  const handleDisconnectGithub = async () => {
    try {
      await integrations.disconnectGithub();
      setGithubConnection(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not disconnect GitHub.");
    }
  };

  const handleConnectEmailSend = async () => {
    if (!sendFromEmail.trim()) return;
    setIsConnectingEmailSend(true);
    try {
      const connected = await integrations.connectEmail(sendFromEmail.trim());
      setEmailSendConnection(connected);
      setSendFromEmail("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not register this address.");
    } finally {
      setIsConnectingEmailSend(false);
    }
  };

  const handleDisconnectEmailSend = async () => {
    try {
      await integrations.disconnectEmail();
      setEmailSendConnection(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not disconnect this address.");
    }
  };

  const handleConnectStripe = async () => {
    // No trim-check here on purpose: the first call (issuing the URL)
    // deliberately has no secret yet - see StripeConnectionIn's own
    // docstring for why that's the expected order, not a guard to add.
    setIsConnectingStripe(true);
    try {
      const connected = await integrations.connectStripe(stripeWebhookSecret.trim() || undefined);
      setStripeConnection(connected);
      setStripeWebhookSecret("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not save this webhook secret.");
    } finally {
      setIsConnectingStripe(false);
    }
  };

  const handleDisconnectStripe = async () => {
    try {
      await integrations.disconnectStripe();
      setStripeConnection(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not disconnect Stripe.");
    }
  };

  const handleDisconnectGoogleCalendar = async () => {
    await integrations.disconnectGoogleCalendar();
    setCalendarStatus({ connected: false, status: null, connected_at: null });
  };

  const toggleNewWebhookEvent = (event: string) => {
    setNewWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookUrl.trim() || newWebhookEvents.length === 0) return;
    setIsCreatingWebhook(true);
    try {
      const created = await integrations.createWebhook({
        target_url: newWebhookUrl.trim(),
        event_types: newWebhookEvents,
        format: newWebhookFormat,
      });
      setWebhooksList((prev) => [...prev, created]);
      setCreatedWebhookSecret(created.secret);
      setNewWebhookUrl("");
      setNewWebhookEvents([]);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not create webhook.");
    } finally {
      setIsCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    await integrations.deleteWebhook(id);
    setWebhooksList((prev) => prev.filter((w) => w.id !== id));
  };

  const handleToggleWebhookActive = async (webhook: OutboundWebhookRow) => {
    const updated = await integrations.updateWebhook(webhook.id, { active: !webhook.active });
    setWebhooksList((prev) => prev.map((w) => (w.id === webhook.id ? updated : w)));
  };

  const handleCreateApiKey = async () => {
    if (!newApiKeyName.trim()) return;
    setIsCreatingApiKey(true);
    try {
      const created = await integrations.createApiKey(newApiKeyName.trim());
      setApiKeysList((prev) => [...prev, created]);
      setCreatedApiKey(created.raw_key);
      setNewApiKeyName("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not create API key.");
    } finally {
      setIsCreatingApiKey(false);
    }
  };

  const handleDeleteApiKey = async (id: string) => {
    await integrations.deleteApiKey(id);
    setApiKeysList((prev) => prev.filter((k) => k.id !== id));
  };

  const handleExportCustomers = async () => {
    setIsExportingCustomers(true);
    try {
      const blob = await dataExport.customersCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "krova_customers.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not export customers.");
    } finally {
      setIsExportingCustomers(false);
    }
  };

  const handleExportConversations = async () => {
    setIsExportingConversations(true);
    try {
      const blob = await dataExport.conversationsCsv();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "krova_conversations.csv";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not export conversations.");
    } finally {
      setIsExportingConversations(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const loadSettings = async () => {
      const [profRes, chRes] = await Promise.allSettled([
        account.profile(),
        channels.list(),
      ]);
      if (!mounted) return;

      if (profRes.status === "fulfilled") {
        setProfile(profRes.value);
        setAutonomy(profRes.value.autonomy || "draft");
        setVertical(profRes.value.vertical || "clinic");
        setBusinessName(profRes.value.business_name || "");
        setFullName(profRes.value.full_name || "");
        setGoogleReviewUrl(profRes.value.google_review_url || "");
      } else {
        setLoadError(
          profRes.reason instanceof Error
            ? profRes.reason.message
            : "Could not load your profile.",
        );
      }
      if (chRes.status === "fulfilled") {
        setChannelsList(chRes.value);
        const wa = chRes.value.find((c) => c.channel === "whatsapp");
        if (wa) {
          const [waProfRes, healthRes, readyRes, catRes] = await Promise.allSettled([
            waAccount.profile(), waAccount.health(), waAccount.readiness(), waAccount.verticals(),
          ]);
          if (!mounted) return;
          if (waProfRes.status === "fulfilled") {
            setWaProfile(waProfRes.value);
            setWaAbout(waProfRes.value.about || "");
            setWaDescription(waProfRes.value.description || "");
            setWaAddress(waProfRes.value.address || "");
            setWaEmail(waProfRes.value.email || "");
            setWaCategory(waProfRes.value.vertical || "");
          }
          if (healthRes.status === "fulfilled") setWaHealth(healthRes.value);
          if (readyRes.status === "fulfilled") setWaReadiness(readyRes.value);
          if (catRes.status === "fulfilled") setWaCategoryOptions(catRes.value);
        }
      }
    };

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

  const handleSaveWaProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingWaProfile(true);
    setWaProfileError(null);
    setWaProfileSaved(false);
    try {
      const updated = await waAccount.updateProfile({
        about: waAbout, description: waDescription, address: waAddress, email: waEmail, vertical: waCategory,
      });
      setWaProfile(updated);
      setWaCategory(updated.vertical || "");
      setWaProfileSaved(true);
      setTimeout(() => setWaProfileSaved(false), 3000);
    } catch (err) {
      setWaProfileError(err instanceof Error ? err.message : "Could not save this profile.");
    } finally {
      setIsSavingWaProfile(false);
    }
  };

  const handleSaveDataset = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingDataset(true);
    setDatasetSaved(false);
    try {
      await channels.setAdTracking(datasetId.trim() || null);
      setDatasetSaved(true);
      setTimeout(() => setDatasetSaved(false), 3000);
    } catch {
      // Non-critical field - a silent failure here is fine, no toast needed.
    } finally {
      setIsSavingDataset(false);
    }
  };

  const handleRequestVerifyCode = async () => {
    setIsRequestingCode(true);
    setVerifyError(null);
    setVerifySent(null);
    try {
      const r = await waAccount.requestCode(verifyMethod);
      setVerifySent(r.detail);
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "Could not send a verification code.");
    } finally {
      setIsRequestingCode(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsVerifyingCode(true);
    setVerifyError(null);
    try {
      await waAccount.verifyCode(verifyCode);
      setVerifySent("Verified.");
      setVerifyCode("");
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : "That code didn't verify.");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleSetPin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingPin(true);
    setPinResult(null);
    try {
      await waAccount.setTwoStepPin(pinValue);
      setPinResult("PIN updated.");
      setPinValue("");
    } catch (err) {
      setPinResult(err instanceof Error ? err.message : "Could not update the PIN.");
    } finally {
      setIsSavingPin(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveSuccess(false);
    setSaveError(null);
    try {
      await account.updateProfile({
        business_name: businessName,
        full_name: fullName,
        vertical,
        google_review_url: googleReviewUrl,
      });
      await approvals.setAutonomy(autonomy);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await channels.gmailConnectUrl();
      if (res?.authorize_url) {
        window.location.href = res.authorize_url;
      } else {
        alert("Gmail isn't configured for this account yet.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not connect Gmail.");
    }
  };

  const handleConnectInstagram = async () => {
    try {
      const res = await channels.instagramFbConnectUrl();
      if (res?.url) {
        // A real redirect, not a popup - Instagram Business Login is a
        // classic OAuth round trip, unlike WhatsApp's Embedded Signup dialog.
        window.location.href = res.url;
      } else {
        alert("Instagram isn't configured for this account yet.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not connect Instagram.");
    }
  };

  // Temporary - retesting the original "Instagram API with Instagram
  // Login" path's webhook delivery, separate from the Facebook Login
  // route above. Remove once that investigation concludes.
  const handleConnectInstagramLegacy = async () => {
    try {
      const res = await channels.instagramConnectUrl();
      if (res?.url) {
        window.location.href = res.url;
      } else {
        alert("Instagram (legacy) isn't configured for this account yet.");
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Could not connect Instagram (legacy).");
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

  const [isBackfilling, setIsBackfilling] = useState(false);
  const [backfillResult, setBackfillResult] = useState<string | null>(null);

  const handleGmailBackfill = async () => {
    setIsBackfilling(true);
    setBackfillResult(null);
    try {
      const result = await channels.gmailBackfillNow();
      setBackfillResult(`Read ${result.messages_read}, stored ${result.messages_stored} new, ${result.customers_found} customer(s) found.`);
    } catch (err) {
      setBackfillResult(err instanceof Error ? err.message : "Could not backfill right now.");
    } finally {
      setIsBackfilling(false);
    }
  };

  return (
    <AppLayout
      title="Settings & Connectors"
      subtitle="Business profile, vertical defaults, autonomy level & channel credentials"
    >
      <div className="space-y-6 max-w-4xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {/* SECTION 1: BUSINESS PROFILE & VERTICAL */}
        <form onSubmit={handleSaveProfile}>
          <GlassCard className="p-6 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-brass/10 border border-brass/20 text-brass">
                  <Building className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Business Identity & Vertical</h3>
                  <p className="text-xs text-os-text-dim">
                    Your business vertical drives prompt templates and default knowledge models.
                  </p>
                </div>
              </div>

              {saveSuccess && (
                <span className="text-xs font-mono text-seal-bright flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
              {saveError && (
                <span className="text-xs font-mono text-red-400">{saveError}</span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                  Business Legal / Trading Name:
                </label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                  Account Owner / Admin Name:
                </label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                  Google Review Link (optional):
                </label>
                <input
                  type="text"
                  value={googleReviewUrl}
                  onChange={(e) => setGoogleReviewUrl(e.target.value)}
                  placeholder="https://g.page/r/.../review"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white font-mono placeholder:text-os-text-dim/50 focus:border-brass focus:outline-none"
                />
                <p className="text-[10px] text-os-text-dim font-mono mt-1">
                  Set this to automatically ask customers for a review after a completed visit. Leave blank to turn this off.
                </p>
              </div>
            </div>

            {/* Vertical Selector */}
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
                Select Industry Vertical:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {VERTICALS.map((v) => (
                  <div
                    key={v.key}
                    onClick={() => setVertical(v.key)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      vertical === v.key
                        ? "border-brass/50 bg-brass/10 text-white"
                        : "border-white/[0.06] bg-white/[0.02] text-os-text-dim hover:text-white"
                    }`}
                  >
                    <p className="text-xs font-bold text-white mb-0.5">{v.label}</p>
                    <p className="text-[11px] leading-relaxed opacity-80">{v.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Autonomy Selector */}
            <div className="pt-2">
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
                Agent Autonomy Level:
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { key: "observe", title: "Observe Mode", desc: "Read & extract only" },
                  { key: "draft", title: "Draft Mode (Recommended)", desc: "Human-in-the-loop review" },
                  { key: "act", title: "Act Mode", desc: "Autonomous sending" },
                ].map((a) => (
                  <div
                    key={a.key}
                    onClick={() => setAutonomy(a.key as any)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all text-center ${
                      autonomy === a.key
                        ? "border-brass/50 bg-brass/10 text-white font-bold"
                        : "border-white/[0.06] bg-white/[0.02] text-os-text-dim hover:text-white"
                    }`}
                  >
                    <p className="text-xs text-white mb-0.5">{a.title}</p>
                    <p className="text-[10px] font-mono text-os-text-dim">{a.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-3 flex justify-end">
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2.5 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold transition-all shadow-md shadow-brass/20 cursor-pointer"
              >
                {isSaving ? "Saving Settings..." : "Save Settings"}
              </button>
            </div>
          </GlassCard>
        </form>

        {/* SECTION 2: CONNECTED CHANNELS */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
            <div>
              <h3 className="text-sm font-bold text-white">Connected Channels & Trunks</h3>
              <p className="text-xs text-os-text-dim">
                Real-time ingestion pipelines feeding the unified customer timeline.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* WhatsApp */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-seal/10 border border-seal/20 text-seal-bright">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">WhatsApp Business API (Meta)</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    {waConnection
                      ? `Quality Rating: ${waConnection.quality_rating || "—"} • WABA ID: ${waConnection.waba_id || "—"}`
                      : "Not connected"}
                  </p>
                </div>
              </div>
              {waConnection ? (
                <Badge variant={waConnection.status === "active" ? "emerald" : "amber"} dot>
                  {waConnection.status === "active" ? "Connected" : waConnection.status}
                </Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>

            {/* Voice */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Voice Inbound Trunk</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    {voiceConnection ? `Number: ${voiceConnection.external_account_id}` : "Not connected"}
                  </p>
                </div>
              </div>
              {voiceConnection ? (
                <Badge variant={voiceConnection.status === "active" ? "cyan" : "amber"} dot>
                  {voiceConnection.status === "active" ? "Active" : voiceConnection.status}
                </Badge>
              ) : (
                <Badge variant="outline">Not connected</Badge>
              )}
            </div>

            {/* Gmail */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Gmail Work Inbox</h4>
                  <p className="text-[11px] text-os-text-dim">
                    {emailConnection ? emailConnection.handle || "Connected" : "Read customer payment confirmations and meeting requests from email."}
                  </p>
                </div>
              </div>
              {emailConnection ? (
                <div className="flex items-center gap-2">
                  <Badge variant={emailConnection.status === "active" ? "emerald" : "amber"} dot>
                    {emailConnection.status === "active" ? "Connected" : emailConnection.status}
                  </Badge>
                  <button
                    type="button"
                    onClick={handleGmailBackfill}
                    disabled={isBackfilling}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBackfilling ? "animate-spin" : ""}`} />
                    {isBackfilling ? "Reading..." : "Backfill Now"}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGmail}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  Connect Gmail OAuth
                </button>
              )}
            </div>
            {backfillResult && (
              <p className="text-[11px] text-os-text-dim font-mono -mt-2">{backfillResult}</p>
            )}

            {/* Instagram */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-pink-500/10 border border-pink-500/20 text-pink-400">
                  <Instagram className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Instagram Business</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    {igConnection
                      ? igConnection.handle || igConnection.display_name || "Connected"
                      : "DMs and comments in the same unified timeline as WhatsApp."}
                  </p>
                </div>
              </div>
              {igConnection && igConnection.status === "active" ? (
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" dot>Connected</Badge>
                  {/* Reachable while connected on purpose: re-running the
                      Meta login is how a business switches which Instagram
                      account is linked, and how anyone demonstrates the
                      grant flow without first tearing the connection down. */}
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim hover:text-white text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                  >
                    Reconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {igConnection && (
                    // A row exists but isn't active (disconnected, expired,
                    // etc.) - shown so reconnecting isn't a mystery when a
                    // status badge silently vanishes and buttons appear.
                    <Badge variant="amber" dot>{igConnection.status}</Badge>
                  )}
                  <button
                    type="button"
                    onClick={handleConnectInstagram}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                  >
                    {igConnection ? "Reconnect Instagram" : "Connect Instagram"}
                  </button>
                  <button
                    type="button"
                    onClick={handleConnectInstagramLegacy}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                    title="Temporary - testing the original Instagram Login path"
                  >
                    {igConnection ? "Reconnect" : "Connect"} Instagram (legacy)
                  </button>
                </div>
              )}
            </div>
            {igConnection && (
              <div className="p-4 rounded-xl bg-pink-500/[0.04] border border-pink-500/[0.15] grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Username</p>
                  <p className="text-sm text-white font-mono font-semibold">
                    {igConnection.handle || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Display name</p>
                  <p className="text-sm text-white font-mono font-semibold">
                    {igConnection.display_name || "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Account ID</p>
                  <p className="text-sm text-white font-mono font-semibold">
                    {igConnection.external_account_id}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Connected since</p>
                  <p className="text-sm text-white font-mono font-semibold">
                    {igConnection.connected_at
                      ? new Date(igConnection.connected_at).toLocaleString()
                      : "—"}
                  </p>
                </div>
              </div>
            )}
            {igConnection && igConnection.status === "active" && (
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      Send an Instagram message
                    </p>
                    <p className="text-[11px] text-os-text-dim">
                      Choose a person who has messaged{" "}
                      {igConnection.handle || "this account"}, write a reply, and send it
                      from here. It arrives in their Instagram inbox.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={loadIgConversations}
                    disabled={igLoadingConversations}
                    className="shrink-0 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                  >
                    {igLoadingConversations ? "Loading…" : "Load conversations"}
                  </button>
                </div>

                {igConversationsError && (
                  <p className="text-[11px] text-red-400 font-mono">
                    {igConversationsError}
                  </p>
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
              </div>
            )}
          </div>
        </GlassCard>

        {/* SECTION 2z: OUTBOUND INTEGRATIONS */}
        <GlassCard className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-os-accent" />
            <h3 className="text-sm font-bold text-white">Integrations</h3>
          </div>
          <p className="text-[11px] text-os-text-dim font-mono -mt-2">
            Push bookings out to tools you already use - your own calendar, and any endpoint (Zapier, your CRM, a spreadsheet) that wants to know when something is booked.
          </p>

          <div className="space-y-3">
            {/* Google Calendar */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Google Calendar</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    {calendarStatus?.connected
                      ? "Bookings appear on your calendar automatically."
                      : "Every appointment and queue token shows up on your own calendar."}
                  </p>
                </div>
              </div>
              {calendarStatus?.connected ? (
                <div className="flex items-center gap-2">
                  <Badge variant="emerald" dot>Connected</Badge>
                  <button
                    type="button"
                    onClick={handleDisconnectGoogleCalendar}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectGoogleCalendar}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  Connect Google Calendar
                </button>
              )}
            </div>

            {/* GitHub - software-startup vertical's closed bug-lifecycle loop */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-500/10 border border-slate-500/20 text-slate-300">
                  <Github className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">GitHub</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    {githubConnection
                      ? `A bug report can be filed straight to ${githubConnection.repo_owner}/${githubConnection.repo_name} - the customer is told automatically once you close the issue.`
                      : "File an escalated bug straight to your repo, and tell the customer automatically once you close the issue."}
                  </p>
                </div>
              </div>
              {githubConnection ? (
                <div className="flex items-center justify-between">
                  <Badge variant="emerald" dot>{githubConnection.repo_owner}/{githubConnection.repo_name}</Badge>
                  <button
                    type="button"
                    onClick={handleDisconnectGithub}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text" value={githubRepoOwner} onChange={(e) => setGithubRepoOwner(e.target.value)}
                      placeholder="repo owner (e.g. acme)"
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                    />
                    <input
                      type="text" value={githubRepoName} onChange={(e) => setGithubRepoName(e.target.value)}
                      placeholder="repo name (e.g. app)"
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                    />
                  </div>
                  <input
                    type="password" value={githubToken} onChange={(e) => setGithubToken(e.target.value)}
                    placeholder="fine-grained personal access token (Issues: write)"
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                  />
                  <input
                    type="password" value={githubWebhookSecret} onChange={(e) => setGithubWebhookSecret(e.target.value)}
                    placeholder="webhook secret you set in the repo's Settings > Webhooks"
                    className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                  />
                  <button
                    type="button"
                    onClick={handleConnectGithub}
                    disabled={isConnectingGithub || !githubRepoOwner.trim() || !githubRepoName.trim() || !githubToken.trim() || !githubWebhookSecret.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {isConnectingGithub ? "Connecting..." : "Connect repo"}
                  </button>
                </div>
              )}
            </div>

            {/* Outbound email (Postmark sender signature) - software-startup vertical */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Mail className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Outbound email address</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    What a proactive email (like &quot;your bug is fixed&quot;) sends from. A confirmation link goes to this address - it can&apos;t send until you click it.
                  </p>
                </div>
              </div>
              {emailSendConnection ? (
                <div className="flex items-center justify-between">
                  <Badge variant={emailSendConnection.verified ? "emerald" : "amber"} dot>
                    {emailSendConnection.from_email} - {emailSendConnection.verified ? "Verified" : "Check your inbox to confirm"}
                  </Badge>
                  <button
                    type="button"
                    onClick={handleDisconnectEmailSend}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <input
                    type="email" value={sendFromEmail} onChange={(e) => setSendFromEmail(e.target.value)}
                    placeholder="support@yourstartup.com"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                  />
                  <button
                    type="button"
                    onClick={handleConnectEmailSend}
                    disabled={isConnectingEmailSend || !sendFromEmail.trim()}
                    className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {isConnectingEmailSend ? "Sending..." : "Send confirmation"}
                  </button>
                </div>
              )}
            </div>

            {/* Stripe billing dunning - software-startup vertical */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Stripe billing dunning</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    A failed payment gets tracked on your ledger and one reminder sent - Stripe&apos;s own Smart Retries still handle actually recovering it.
                  </p>
                </div>
              </div>
              {stripeConnection ? (
                <>
                  <div className="p-2.5 rounded-lg bg-black/30 border border-white/[0.06]">
                    <p className="text-[10px] text-os-text-dim font-mono mb-1">
                      Paste this as your webhook endpoint URL in the Stripe Dashboard:
                    </p>
                    <p className="text-[11px] text-white font-mono break-all select-all">{stripeConnection.webhook_url}</p>
                  </div>
                  {stripeConnection.has_secret ? (
                    <div className="flex items-center justify-between">
                      <Badge variant="emerald" dot>Signing secret saved</Badge>
                      <button
                        type="button"
                        onClick={handleDisconnectStripe}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        type="password" value={stripeWebhookSecret} onChange={(e) => setStripeWebhookSecret(e.target.value)}
                        placeholder="whsec_... (from that endpoint's own page in Stripe)"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                      />
                      <button
                        type="button"
                        onClick={handleConnectStripe}
                        disabled={isConnectingStripe || !stripeWebhookSecret.trim()}
                        className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                      >
                        {isConnectingStripe ? "Saving..." : "Save secret"}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleConnectStripe}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  Generate my webhook URL
                </button>
              )}
            </div>

            {/* Webhooks */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-violet-500/10 border border-violet-500/20 text-violet-400">
                  <Webhook className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Webhooks</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    Send booking events to your own endpoint - a Zapier catch-hook, your CRM, anything.
                  </p>
                </div>
              </div>

              {webhooksList.map((w) => (
                <div
                  key={w.id}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-mono truncate">{w.target_url}</p>
                    <p className="text-[10px] text-os-text-dim font-mono">
                      {w.event_types.join(", ")}
                      {w.last_delivery_status && ` · last: ${w.last_delivery_status}`}
                      {w.failure_count > 0 && ` · ${w.failure_count} failing`}
                    </p>
                  </div>
                  <Badge variant={w.active ? "emerald" : "amber"} dot>
                    {w.active ? "Active" : "Paused"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleToggleWebhookActive(w)}
                    className="px-2.5 py-1 rounded-lg bg-white/[0.03] hover:bg-white/[0.08] text-os-text-dim text-[11px] font-semibold border border-white/[0.08] transition-all cursor-pointer"
                  >
                    {w.active ? "Pause" : "Resume"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteWebhook(w.id)}
                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-red-500/10 text-os-text-dim hover:text-red-400 border border-white/[0.08] transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {createdWebhookSecret && (
                <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.2] space-y-1">
                  <p className="text-[11px] text-emerald-400 font-mono font-semibold">
                    Webhook created - copy this signing secret now, it won&apos;t be shown again:
                  </p>
                  <p className="text-xs text-white font-mono break-all">{createdWebhookSecret}</p>
                </div>
              )}

              <div className="space-y-2 pt-1">
                <input
                  type="text"
                  value={newWebhookUrl}
                  onChange={(e) => setNewWebhookUrl(e.target.value)}
                  placeholder="https://hooks.zapier.com/..."
                  className="w-full px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                />
                <div className="flex flex-wrap items-center gap-2">
                  {WEBHOOK_EVENT_TYPES.map((event) => (
                    <button
                      key={event}
                      type="button"
                      onClick={() => toggleNewWebhookEvent(event)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer ${
                        newWebhookEvents.includes(event)
                          ? "bg-os-accent/20 border-os-accent/40 text-os-accent"
                          : "bg-white/[0.03] border-white/[0.08] text-os-text-dim"
                      }`}
                    >
                      {event}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase tracking-wide text-os-text-dim font-mono">Format</span>
                  {WEBHOOK_FORMATS.map((fmt) => (
                    <button
                      key={fmt}
                      type="button"
                      onClick={() => setNewWebhookFormat(fmt)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition-all cursor-pointer capitalize ${
                        newWebhookFormat === fmt
                          ? "bg-os-accent/20 border-os-accent/40 text-os-accent"
                          : "bg-white/[0.03] border-white/[0.08] text-os-text-dim"
                      }`}
                    >
                      {fmt === "raw" ? "Zapier / raw" : fmt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={handleCreateWebhook}
                    disabled={isCreatingWebhook || !newWebhookUrl.trim() || newWebhookEvents.length === 0}
                    className="ml-auto px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                  >
                    {isCreatingWebhook ? "Adding…" : "Add webhook"}
                  </button>
                </div>
              </div>
            </div>

            {/* API Keys */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">API Keys</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    Let your own systems call Krova directly - ask a question, check availability, create a booking.
                  </p>
                </div>
              </div>

              {apiKeysList.map((k) => (
                <div
                  key={k.id}
                  className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-white font-mono truncate">{k.name}</p>
                    <p className="text-[10px] text-os-text-dim font-mono">
                      {k.key_prefix}… {k.last_used_at ? `· last used ${new Date(k.last_used_at).toLocaleDateString()}` : "· never used"}
                    </p>
                  </div>
                  <Badge variant={k.active ? "emerald" : "amber"} dot>
                    {k.active ? "Active" : "Revoked"}
                  </Badge>
                  <button
                    type="button"
                    onClick={() => handleDeleteApiKey(k.id)}
                    className="p-1.5 rounded-lg bg-white/[0.03] hover:bg-red-500/10 text-os-text-dim hover:text-red-400 border border-white/[0.08] transition-all cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {createdApiKey && (
                <div className="p-3 rounded-lg bg-emerald-500/[0.06] border border-emerald-500/[0.2] space-y-1">
                  <p className="text-[11px] text-emerald-400 font-mono font-semibold">
                    API key created - copy it now, it won&apos;t be shown again:
                  </p>
                  <p className="text-xs text-white font-mono break-all">{createdApiKey}</p>
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={newApiKeyName}
                  onChange={(e) => setNewApiKeyName(e.target.value)}
                  placeholder="e.g. Internal dashboard"
                  className="flex-1 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] text-white text-xs font-mono placeholder:text-os-text-dim/50 outline-none focus:border-white/[0.2]"
                />
                <button
                  type="button"
                  onClick={handleCreateApiKey}
                  disabled={isCreatingApiKey || !newApiKeyName.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  {isCreatingApiKey ? "Creating…" : "Create key"}
                </button>
              </div>
            </div>

            {/* Data export */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Download your data</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    Your customers and conversation history, as CSV - no lock-in.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={handleExportCustomers}
                  disabled={isExportingCustomers}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  {isExportingCustomers ? "Exporting…" : "Customers.csv"}
                </button>
                <button
                  type="button"
                  onClick={handleExportConversations}
                  disabled={isExportingConversations}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
                >
                  {isExportingConversations ? "Exporting…" : "Conversations.csv"}
                </button>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* SECTION 2b: WHATSAPP ACCOUNT HEALTH */}
        {waConnection && (waHealth || waReadiness) && (
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
              <div className="p-2 rounded-lg bg-seal/10 border border-seal/20 text-seal-bright">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">WhatsApp Account Health</h3>
                <p className="text-xs text-os-text-dim">
                  What Meta itself says about this number - quality falls before a restriction, and a restriction happens before messages visibly stop.
                </p>
              </div>
            </div>

            {waReadiness && !waReadiness.ready && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="text-xs font-bold text-amber-300">Can send: {waReadiness.can_send}</p>
                  {waReadiness.action_required && (
                    <p className="text-xs text-amber-200/90 mt-1">{waReadiness.action_required}</p>
                  )}
                  {waReadiness.billing_url && (
                    <a
                      href={waReadiness.billing_url} target="_blank" rel="noreferrer"
                      className="text-xs text-brass-bright hover:text-brass inline-flex items-center gap-1 mt-2"
                    >
                      Open Meta Billing <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {waReadiness.blockers.map((b, i) => (
                    <p key={i} className="text-[11px] text-amber-200/80 mt-1">
                      {b.entity}: {b.message}{b.fix ? ` — ${b.fix}` : ""}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {waHealth && (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-mono uppercase text-os-text-dim mb-1">Quality</p>
                    <p className="text-sm font-bold text-white">{waHealth.quality_rating || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-mono uppercase text-os-text-dim mb-1">Daily Limit</p>
                    <p className="text-sm font-bold text-white">{waHealth.daily_recipient_limit ?? "Unlimited"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-mono uppercase text-os-text-dim mb-1">Status</p>
                    <p className="text-sm font-bold text-white">{waHealth.status || "—"}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <p className="text-[10px] font-mono uppercase text-os-text-dim mb-1">Official Badge</p>
                    <p className="text-sm font-bold text-white">{waHealth.is_official_business_account ? "Yes" : "No"}</p>
                  </div>
                </div>
                {waHealth.warnings.length > 0 && (
                  <div className="space-y-1.5">
                    {waHealth.warnings.map((w, i) => (
                      <p key={i} className="text-xs text-amber-300 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {w}
                      </p>
                    ))}
                  </div>
                )}
              </>
            )}
          </GlassCard>
        )}

        {/* SECTION 2c: WHATSAPP BUSINESS PROFILE */}
        {waConnection && waProfile && (
          <form onSubmit={handleSaveWaProfile}>
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between pb-4 border-b border-white/[0.06]">
                <div>
                  <h3 className="text-sm font-bold text-white">WhatsApp Business Profile</h3>
                  <p className="text-xs text-os-text-dim">
                    What a customer sees when they open this chat - the most visible thing on the account.
                  </p>
                </div>
                {waProfileSaved && (
                  <span className="text-xs font-mono text-seal-bright flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Saved!
                  </span>
                )}
                {waProfileError && <span className="text-xs font-mono text-red-400">{waProfileError}</span>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">About (short status line)</label>
                  <input
                    type="text" value={waAbout} onChange={(e) => setWaAbout(e.target.value)} maxLength={139}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Email</label>
                  <input
                    type="email" value={waEmail} onChange={(e) => setWaEmail(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Description</label>
                <textarea
                  rows={2} value={waDescription} onChange={(e) => setWaDescription(e.target.value)} maxLength={512}
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Address</label>
                <input
                  type="text" value={waAddress} onChange={(e) => setWaAddress(e.target.value)} maxLength={256}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                  Business Category (Meta&apos;s classification)
                </label>
                <select
                  value={waCategory}
                  onChange={(e) => setWaCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                >
                  <option value="">Not set</option>
                  {waCategoryOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-os-text-dim mt-1">
                  Shown to customers as your business type in WhatsApp - separate from Krova&apos;s own vertical setting above.
                </p>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit" disabled={isSavingWaProfile}
                  className="px-5 py-2 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {isSavingWaProfile ? "Saving..." : "Save Profile"}
                </button>
              </div>
            </GlassCard>
          </form>
        )}

        {/* SECTION 2c-2: NUMBER VERIFICATION & TWO-STEP PIN */}
        {waConnection && (
          <GlassCard className="p-6 space-y-5">
            <div className="flex items-center gap-3 pb-2 border-b border-white/[0.06]">
              <div className="p-2 rounded-lg bg-brass/10 border border-brass/20 text-brass">
                <Shield className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Number Verification & Security PIN</h3>
                <p className="text-xs text-os-text-dim">
                  Whoever is holding this phone needs to read the code Meta sends.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <form onSubmit={handleVerifyCode} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <select
                    value={verifyMethod} onChange={(e) => setVerifyMethod(e.target.value as "SMS" | "VOICE")}
                    className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  >
                    <option value="SMS">SMS</option>
                    <option value="VOICE">Voice call</option>
                  </select>
                  <button
                    type="button" onClick={handleRequestVerifyCode} disabled={isRequestingCode}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] cursor-pointer disabled:opacity-50"
                  >
                    {isRequestingCode ? "Sending..." : "Send Code"}
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)}
                    placeholder="123456"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                  <button
                    type="submit" disabled={isVerifyingCode || !verifyCode}
                    className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isVerifyingCode ? "Verifying..." : "Verify"}
                  </button>
                </div>
                {verifySent && <p className="text-[11px] text-seal-bright">{verifySent}</p>}
                {verifyError && <p className="text-[11px] text-red-400">{verifyError}</p>}
              </form>

              <form onSubmit={handleSetPin} className="space-y-2.5">
                <div className="flex items-center gap-2">
                  <input
                    type="password" inputMode="numeric" maxLength={6} value={pinValue}
                    onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ""))}
                    placeholder="New 6-digit PIN"
                    className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                  <button
                    type="submit" disabled={isSavingPin || pinValue.length !== 6}
                    className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] cursor-pointer disabled:opacity-50"
                  >
                    {isSavingPin ? "Saving..." : "Set PIN"}
                  </button>
                </div>
                <p className="text-[11px] text-os-text-dim">Six digits, this number's two-step verification PIN.</p>
                {pinResult && <p className="text-[11px] text-seal-bright">{pinResult}</p>}
              </form>
            </div>
          </GlassCard>
        )}

        {/* SECTION 2d: CLICK-TO-WHATSAPP AD ATTRIBUTION */}
        {waConnection && (
          <form onSubmit={handleSaveDataset}>
            <GlassCard className="p-6 space-y-3">
              <div className="flex items-center gap-3 pb-2">
                <div className="p-2 rounded-lg bg-brass/10 border border-brass/20 text-brass">
                  <Megaphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Click-to-WhatsApp Ad Attribution</h3>
                  <p className="text-xs text-os-text-dim">
                    Reports Purchase conversions back to Meta for ads that led to a chat, so ad spend attributes to real sales.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="text" value={datasetId} onChange={(e) => setDatasetId(e.target.value)}
                  placeholder="Business Manager Dataset ID (from Events Manager)"
                  className="flex-1 px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                />
                <button
                  type="submit" disabled={isSavingDataset}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer shrink-0"
                >
                  {isSavingDataset ? "Saving..." : datasetSaved ? "Saved!" : "Save"}
                </button>
              </div>
            </GlassCard>
          </form>
        )}

        {/* SECTION 3: METERED USAGE & BILLING (STUBBED PER UI_SPEC) */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-os-text-dim" />
              <h4 className="text-sm font-bold text-white">Metered Usage & Billing</h4>
            </div>
            <Badge variant="outline">Backend In Progress</Badge>
          </div>
          <p className="text-xs text-os-text-dim leading-relaxed">
            Per-event usage telemetry (WhatsApp messages, voice minutes, and AI draft completions) is recorded in paise. Enterprise billing and Razorpay invoicing dashboard is actively being built.
          </p>
        </GlassCard>
      </div>
    </AppLayout>
  );
}
