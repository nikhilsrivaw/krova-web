"use client";

import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import {
  MessageSquare,
  RefreshCw,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Sparkles,
  ExternalLink,
  Shield,
  Layers,
  Phone,
  Copy,
  Check,
  Download,
  Link2,
  BookText,
  Pencil,
  ArrowLeftRight,
  XCircle,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  channels,
  templates,
  cannedResponses,
  migration,
  type CannedResponse,
  type ChannelConnection,
  type EmbeddedSignupResult,
  type MigrationReadiness,
  type Template,
  type WhatsAppWindow,
} from "@/lib/api";
import { isEmbeddedSignupMessage, loadFacebookSdk, loginForEmbeddedSignup } from "@/lib/facebookSdk";

export default function WhatsAppPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "templates" | "compose">("overview");
  const [connection, setConnection] = useState<ChannelConnection | null>(null);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Create Template Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [newTemplateCategory, setNewTemplateCategory] = useState<"MARKETING" | "UTILITY">("UTILITY");
  const [newTemplateBody, setNewTemplateBody] = useState("");

  // Window Tester & Composer State
  const [targetPhone, setTargetPhone] = useState("+91 98201 44521");
  const [windowState, setWindowState] = useState<WhatsAppWindow | null>(null);
  const [isCheckingWindow, setIsCheckingWindow] = useState(false);
  const [directMessageText, setDirectMessageText] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const [isSending, setIsSending] = useState(false);
  const [sendSuccessMsg, setSendSuccessMsg] = useState("");

  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Embedded Signup
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectStatus, setConnectStatus] = useState<string | null>(null);
  const [connectError, setConnectError] = useState<string | null>(null);
  const [lastSignupResult, setLastSignupResult] = useState<EmbeddedSignupResult | null>(null);

  // Click-to-Chat Link & QR Code
  const [chatLinkMessage, setChatLinkMessage] = useState("Hi! I'd like to know more.");
  const [chatLinkCopied, setChatLinkCopied] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Canned Responses (Saved Replies)
  const [cannedResponseList, setCannedResponseList] = useState<CannedResponse[]>([]);
  const [selectedCannedId, setSelectedCannedId] = useState("");
  const [isManageCannedOpen, setIsManageCannedOpen] = useState(false);
  const [cannedTitle, setCannedTitle] = useState("");
  const [cannedBody, setCannedBody] = useState("");
  const [editingCannedId, setEditingCannedId] = useState<string | null>(null);
  const [isSavingCanned, setIsSavingCanned] = useState(false);
  const [cannedError, setCannedError] = useState<string | null>(null);

  // Migrate an existing number from another provider - a 4-step wizard
  const [isMigrateOpen, setIsMigrateOpen] = useState(false);
  const [migrateStep, setMigrateStep] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [migrateReadiness, setMigrateReadiness] = useState<MigrationReadiness | null>(null);
  const [migratePhone, setMigratePhone] = useState("");
  const [migratePhoneNumberId, setMigratePhoneNumberId] = useState("");
  const [migrateDisplayPhone, setMigrateDisplayPhone] = useState("");
  const [migrateCode, setMigrateCode] = useState("");
  const [migrateCodeSent, setMigrateCodeSent] = useState(false);
  const [migrateFinishNote, setMigrateFinishNote] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);
  const [migrateError, setMigrateError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [chList, tList, crList] = await Promise.allSettled([
      channels.list(),
      templates.list(),
      cannedResponses.list(),
    ]);

    if (chList.status === "fulfilled") {
      const wa = chList.value.find((c) => c.channel === "whatsapp");
      setConnection(wa || null);
    }
    if (tList.status === "fulfilled") {
      setTemplateList(tList.value);
    }
    if (crList.status === "fulfilled") {
      setCannedResponseList(crList.value);
    }

    const failed = [chList, tList].find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(
        failed.reason instanceof Error ? failed.reason.message : "Could not load WhatsApp data.",
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Meta posts progress into the popup's opener while the dialog is still
  // open - this is the earliest signal of CANCEL/ERROR, often before (or
  // even without) FB.login()'s own callback firing usefully. Kept separate
  // from the callback's result rather than replacing it: this only ever
  // updates status text, never decides whether the connection succeeded -
  // that is exclusively what the backend's response to the exchanged code
  // decides, per shared/channels/whatsapp/signup.py's own reasoning about
  // subscription and registration being the two silent-failure steps.
  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const msg = isEmbeddedSignupMessage(event);
      if (!msg) return;
      if (msg.event === "CANCEL") {
        setConnectStatus(null);
        setIsConnecting(false);
      } else if (msg.event === "ERROR") {
        setConnectError(msg.data?.error_message || "Meta reported an error during signup.");
        setIsConnecting(false);
      } else if (msg.event === "FINISH") {
        setConnectStatus("Finishing connection with Meta...");
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, []);

  // wa.me needs digits only - Meta's display_phone_number comes formatted
  // ("+91 90000 00000"), never in the shape the link itself requires.
  const chatLink = connection?.handle
    ? `https://wa.me/${connection.handle.replace(/\D/g, "")}${
        chatLinkMessage.trim() ? `?text=${encodeURIComponent(chatLinkMessage.trim())}` : ""
      }`
    : null;

  useEffect(() => {
    if (!chatLink) {
      setQrDataUrl(null);
      return;
    }
    let cancelled = false;
    QRCode.toDataURL(chatLink, { width: 240, margin: 1, color: { dark: "#1a1512", light: "#ffffff" } })
      .then((url) => {
        if (!cancelled) setQrDataUrl(url);
      })
      .catch(() => {
        if (!cancelled) setQrDataUrl(null);
      });
    return () => {
      cancelled = true;
    };
  }, [chatLink]);

  const copyChatLink = () => {
    if (!chatLink) return;
    navigator.clipboard.writeText(chatLink);
    setChatLinkCopied(true);
    setTimeout(() => setChatLinkCopied(false), 2000);
  };

  const insertCannedResponse = (id: string) => {
    setSelectedCannedId(id);
    const found = cannedResponseList.find((c) => c.id === id);
    if (found) setDirectMessageText(found.body);
  };

  const openCannedEditor = (existing?: CannedResponse) => {
    setCannedError(null);
    setEditingCannedId(existing?.id || null);
    setCannedTitle(existing?.title || "");
    setCannedBody(existing?.body || "");
  };

  const saveCannedResponse = async () => {
    if (!cannedTitle.trim() || !cannedBody.trim()) return;
    setIsSavingCanned(true);
    setCannedError(null);
    try {
      if (editingCannedId) {
        const updated = await cannedResponses.update(editingCannedId, { title: cannedTitle, body: cannedBody });
        setCannedResponseList((prev) => prev.map((c) => (c.id === editingCannedId ? updated : c)).sort((a, b) => a.title.localeCompare(b.title)));
      } else {
        const created = await cannedResponses.create({ title: cannedTitle, body: cannedBody });
        setCannedResponseList((prev) => [...prev, created].sort((a, b) => a.title.localeCompare(b.title)));
      }
      setEditingCannedId(null);
      setCannedTitle("");
      setCannedBody("");
    } catch (err) {
      setCannedError(err instanceof Error ? err.message : "Could not save this saved reply.");
    } finally {
      setIsSavingCanned(false);
    }
  };

  const deleteCannedResponse = async (id: string) => {
    setCannedError(null);
    try {
      await cannedResponses.remove(id);
      setCannedResponseList((prev) => prev.filter((c) => c.id !== id));
      if (editingCannedId === id) openCannedEditor();
    } catch (err) {
      setCannedError(err instanceof Error ? err.message : "Could not delete this saved reply.");
    }
  };

  const openMigrate = async () => {
    setIsMigrateOpen(true);
    setMigrateStep(0);
    setMigrateReadiness(null);
    setMigratePhone("");
    setMigratePhoneNumberId("");
    setMigrateDisplayPhone("");
    setMigrateCode("");
    setMigrateCodeSent(false);
    setMigrateFinishNote(null);
    setMigrateError(null);
    try {
      const r = await migration.readiness();
      setMigrateReadiness(r);
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "Could not check migration readiness.");
    }
  };

  const handleMigrateStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    setMigrateError(null);
    try {
      const r = await migration.start(migratePhone);
      setMigratePhoneNumberId(r.phone_number_id);
      setMigrateDisplayPhone(r.display_phone_number);
      setMigrateStep(2);
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "Could not start the migration.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateRequestCode = async () => {
    setIsMigrating(true);
    setMigrateError(null);
    try {
      await migration.requestCode(migratePhoneNumberId);
      setMigrateCodeSent(true);
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "Could not send a verification code.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsMigrating(true);
    setMigrateError(null);
    try {
      await migration.verifyCode(migratePhoneNumberId, migrateCode);
      setMigrateStep(3);
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "That code didn't verify.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleMigrateFinish = async () => {
    setIsMigrating(true);
    setMigrateError(null);
    try {
      const r = await migration.finish(migratePhoneNumberId, migrateDisplayPhone);
      setMigrateFinishNote(r.note);
      setMigrateStep(4);
      await loadData();
    } catch (err) {
      setMigrateError(err instanceof Error ? err.message : "Could not finish the migration.");
    } finally {
      setIsMigrating(false);
    }
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);
    setConnectStatus("Opening Meta...");
    setLastSignupResult(null);
    try {
      const config = await channels.whatsappSignupConfig();
      await loadFacebookSdk(config.app_id, config.graph_version);
      const code = await loginForEmbeddedSignup(config.config_id);

      if (!code) {
        // The popup closed with no code - almost always the business
        // simply closed it. Not an error worth alarming over.
        setConnectStatus(null);
        setIsConnecting(false);
        return;
      }

      setConnectStatus("Registering the number and subscribing to messages...");
      const result = await channels.completeWhatsAppSignup(code);
      setLastSignupResult(result);
      setConnectStatus(null);
      loadData();
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Could not connect WhatsApp.");
      setConnectStatus(null);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSyncTemplates = async () => {
    setIsSyncing(true);
    setActionError(null);
    try {
      const synced = await templates.sync();
      setTemplateList(synced);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not sync templates.");
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    try {
      await templates.create({
        name: newTemplateName.toLowerCase().replace(/\s+/g, "_"),
        category: newTemplateCategory,
        body: newTemplateBody,
      });
      setIsCreateModalOpen(false);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not create template.");
    }
  };

  const checkWindow = async () => {
    setIsCheckingWindow(true);
    setWindowState(null);
    setActionError(null);
    try {
      const res = await channels.windowState(targetPhone);
      setWindowState(res);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not check the messaging window.");
    } finally {
      setIsCheckingWindow(false);
    }
  };

  const handleSendMessage = async () => {
    setIsSending(true);
    setSendSuccessMsg("");
    setActionError(null);
    try {
      if (windowState?.can_send_free_form) {
        await channels.sendText(targetPhone, directMessageText);
      } else {
        const template = templateList.find((t) => t.name === selectedTemplate);
        if (!template) {
          setActionError("Pick a template first.");
          return;
        }
        await channels.sendTemplate(targetPhone, template.name, templateVars, template.language);
      }
      setSendSuccessMsg("Message dispatched via WhatsApp Business API.");
      setDirectMessageText("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not send this message.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppLayout
      title="WhatsApp Business Hub"
      subtitle="WABA Connection, Meta Templates & 24h Window Dispatcher"
      actions={
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSyncTemplates}
            disabled={isSyncing}
            className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/[0.08] flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
            <span>Sync Meta Templates</span>
          </button>

          <button
            type="button"
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-1.5 rounded-lg bg-seal hover:bg-seal-dim text-white text-xs font-bold shadow-lg shadow-seal/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Template</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {actionError}
          </div>
        )}
        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          {[
            { key: "overview", label: "Connection & Health" },
            { key: "templates", label: `Meta Templates (${templateList.length})` },
            { key: "compose", label: "24h Window & Direct Send" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-inner"
                  : "text-os-text-dim hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB 1: OVERVIEW & CONNECTION HEALTH */}
        {activeTab === "overview" && (
          <div className="space-y-6">
            {!connection ? (
              <EmptyState
                icon={MessageSquare}
                title="No WhatsApp number connected"
                description="Connect a WhatsApp Business number through Meta's Embedded Signup to start receiving and sending messages."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase text-os-text-dim">
                      WABA Status
                    </span>
                    <Badge variant={connection.status === "active" ? "emerald" : "amber"} dot>
                      {connection.status}
                    </Badge>
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    {connection.verified_name || connection.display_name || "—"}
                  </h4>
                  <p className="text-xs font-mono text-os-text-dim mt-1">
                    ID: {connection.waba_id || "—"}
                  </p>
                </GlassCard>

                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase text-os-text-dim">
                      Quality Rating
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-seal/10 text-seal-bright border border-seal/20 font-bold">
                      {connection.quality_rating || "—"}
                    </span>
                  </div>
                  <h4 className="text-lg font-bold text-white font-mono">
                    {connection.handle || "—"}
                  </h4>
                </GlassCard>

                <GlassCard className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono uppercase text-os-text-dim">
                      Webhook Pipeline
                    </span>
                    <Badge variant={connection.webhook_subscribed ? "cyan" : "amber"} dot>
                      {connection.webhook_subscribed ? "Subscribed" : "Not subscribed"}
                    </Badge>
                  </div>
                  <h4 className="text-lg font-bold text-white">
                    {connection.number_registered ? "Number Registered" : "Not Registered"}
                  </h4>
                </GlassCard>
              </div>
            )}

            {/* Click-to-Chat Link & QR Code */}
            {connection?.handle && (
              <GlassCard className="p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Link2 className="w-4 h-4 text-brass-bright" />
                  <h3 className="text-sm font-bold text-white">Click-to-Chat Link & QR Code</h3>
                </div>
                <p className="text-xs text-os-text-dim mb-4 max-w-xl">
                  Drop this on your bio, storefront window, or packaging. Anyone who taps it or scans the code opens a chat with this number, prefilled with whatever you write below - no app install, no form.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-6">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                        Prefilled message (optional)
                      </label>
                      <input
                        type="text"
                        value={chatLinkMessage}
                        onChange={(e) => setChatLinkMessage(e.target.value)}
                        placeholder="Hi! I'd like to know more."
                        maxLength={300}
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Link</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={chatLink || ""}
                          className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white/80 font-mono truncate"
                        />
                        <button
                          type="button"
                          onClick={copyChatLink}
                          className="shrink-0 px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-xs font-semibold text-white flex items-center gap-1.5 cursor-pointer"
                        >
                          {chatLinkCopied ? <Check className="w-3.5 h-3.5 text-seal-bright" /> : <Copy className="w-3.5 h-3.5" />}
                          {chatLinkCopied ? "Copied" : "Copy"}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {qrDataUrl ? (
                      <img src={qrDataUrl} alt="WhatsApp chat QR code" className="w-32 h-32 rounded-lg border border-white/[0.1]" />
                    ) : (
                      <div className="w-32 h-32 rounded-lg border border-white/[0.1] bg-white/[0.02] animate-pulse" />
                    )}
                    <a
                      href={qrDataUrl || undefined}
                      download="whatsapp-chat-qr.png"
                      className={`text-[11px] font-semibold flex items-center gap-1 ${
                        qrDataUrl ? "text-brass-bright hover:text-brass cursor-pointer" : "text-os-text-dim pointer-events-none opacity-50"
                      }`}
                    >
                      <Download className="w-3 h-3" /> Download
                    </a>
                  </div>
                </div>
              </GlassCard>
            )}

            {/* Embedded Signup Card */}
            <GlassCard className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-white">
                    Meta Embedded Signup & Number Management
                  </h3>
                  <p className="text-xs text-os-text-dim max-w-xl">
                    Connect official Meta WhatsApp Business numbers with auto-configured webhooks, token refresh, and identity mapping. This opens Meta's own signup dialog — the account stays theirs throughout.
                  </p>
                  {connectStatus && (
                    <p className="text-xs text-brass-bright font-mono">{connectStatus}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {connection && (
                    <button
                      type="button"
                      onClick={openMigrate}
                      className="px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-bold border border-white/[0.1] flex items-center gap-2 cursor-pointer"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      Migrate a Number
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleConnect}
                    disabled={isConnecting}
                    className="px-4 py-2.5 rounded-xl bg-brass hover:bg-brass-dim disabled:opacity-60 text-white text-xs font-bold shadow-md flex items-center gap-2 cursor-pointer"
                  >
                    {isConnecting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ExternalLink className="w-3.5 h-3.5" />
                    )}
                    {connection ? "Connect Another Number" : "Connect WhatsApp Number"}
                  </button>
                </div>
              </div>

              {connectError && (
                <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                  {connectError}
                </div>
              )}

              {lastSignupResult && (
                <div className="mt-4 p-4 rounded-xl bg-seal/5 border border-seal/20 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-seal-bright shrink-0" />
                    <span className="text-xs font-bold text-white">
                      Connected {lastSignupResult.display_phone_number || lastSignupResult.phone_number_id}
                      {lastSignupResult.verified_name && ` — ${lastSignupResult.verified_name}`}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={lastSignupResult.webhook_subscribed ? "emerald" : "rose"} size="sm">
                      {lastSignupResult.webhook_subscribed ? "Webhook subscribed" : "Webhook NOT subscribed"}
                    </Badge>
                    <Badge variant={lastSignupResult.number_registered ? "emerald" : "amber"} size="sm">
                      {lastSignupResult.number_registered ? "Number registered" : "Number not registered"}
                    </Badge>
                    {lastSignupResult.quality_rating && (
                      <Badge variant="outline" size="sm">Quality: {lastSignupResult.quality_rating}</Badge>
                    )}
                  </div>
                  {lastSignupResult.graph_calls.length > 0 && (
                    <details className="text-[11px] text-os-text-dim">
                      <summary className="cursor-pointer font-mono uppercase tracking-wide hover:text-white">
                        {lastSignupResult.graph_calls.length} Graph API calls made
                      </summary>
                      <div className="mt-2 space-y-1 font-mono">
                        {lastSignupResult.graph_calls.map((c, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className={c.status === 200 ? "text-seal-bright" : "text-thread-bright"}>
                              {c.status}
                            </span>
                            <span>{c.method}</span>
                            <span className="text-white/70">{c.path}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </GlassCard>
          </div>
        )}

        {/* TAB 2: TEMPLATES MANAGER */}
        {activeTab === "templates" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templateList.map((tpl) => (
                <GlassCard key={tpl.id} className="p-5 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold font-mono text-white">
                          {tpl.name}
                        </span>
                        <Badge
                          variant={tpl.status === "APPROVED" ? "emerald" : "amber"}
                          size="sm"
                        >
                          {tpl.status}
                        </Badge>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-os-text-dim">
                        {tpl.category}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-black/40 border border-white/[0.06] text-xs text-white/90 font-mono leading-relaxed mb-4">
                      {tpl.body_text}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] text-[11px] text-os-text-dim font-mono">
                    <span>Lang: {tpl.language}</span>
                    <button
                      type="button"
                      onClick={() => alert(`Template ${tpl.name} details`)}
                      className="text-brass hover:text-brass-bright font-semibold"
                    >
                      Use in Campaign →
                    </button>
                  </div>
                </GlassCard>
              ))}
            </div>
          </div>
        )}

        {/* TAB 3: 24-HOUR WINDOW & DIRECT SENDER */}
        {activeTab === "compose" && (
          <div className="max-w-2xl mx-auto space-y-6">
            <GlassCard className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  WhatsApp 24-Hour Messaging Window Inspector
                </h3>
                <p className="text-xs text-os-text-dim">
                  Meta strictly enforces a 24-hour free-form messaging window. Outside this window, only pre-approved Templates can be sent.
                </p>
              </div>

              {/* Phone & Window Check Input */}
              <div className="flex gap-3">
                <input
                  type="text"
                  value={targetPhone}
                  onChange={(e) => setTargetPhone(e.target.value)}
                  placeholder="+91 98201 44521"
                  className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                />
                <button
                  type="button"
                  onClick={checkWindow}
                  disabled={isCheckingWindow}
                  className="px-4 py-2 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer shrink-0"
                >
                  {isCheckingWindow ? "Checking..." : "Inspect Window"}
                </button>
              </div>

              {/* Window Status Banner */}
              {windowState && (
                <div
                  className={`p-4 rounded-xl border flex items-center justify-between ${
                    windowState.can_send_free_form
                      ? "bg-seal/10 border-seal/30 text-seal-bright"
                      : "bg-amber-500/10 border-amber-500/30 text-amber-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5" />
                    <div>
                      <h4 className="text-xs font-bold">
                        {windowState.can_send_free_form ? "24h Window is OPEN" : "24h Window is CLOSED"}
                      </h4>
                      <p className="text-[11px] opacity-80">{windowState.explanation}</p>
                    </div>
                  </div>
                  <Badge variant={windowState.can_send_free_form ? "emerald" : "amber"}>
                    {windowState.can_send_free_form ? "Free-Form Allowed" : "Template Required"}
                  </Badge>
                </div>
              )}

              {/* Message Composer Area */}
              <div className="space-y-3 pt-2">
                {windowState?.can_send_free_form ? (
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-mono uppercase text-os-text-dim">
                        Direct Free-Form Text Message:
                      </label>
                      <div className="flex items-center gap-2">
                        <select
                          value={selectedCannedId}
                          onChange={(e) => insertCannedResponse(e.target.value)}
                          disabled={cannedResponseList.length === 0}
                          className="px-2 py-1 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none disabled:opacity-40"
                        >
                          <option value="">
                            {cannedResponseList.length === 0 ? "No saved replies yet" : "Insert a saved reply..."}
                          </option>
                          {cannedResponseList.map((c) => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            openCannedEditor();
                            setIsManageCannedOpen(true);
                          }}
                          className="p-1.5 rounded-lg text-os-text-dim hover:text-brass-bright hover:bg-white/[0.06] cursor-pointer"
                          title="Manage saved replies"
                        >
                          <BookText className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <textarea
                      rows={4}
                      value={directMessageText}
                      onChange={(e) => setDirectMessageText(e.target.value)}
                      placeholder="Type direct WhatsApp message..."
                      className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-seal focus:outline-none"
                    />
                  </div>
                ) : windowState ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                        Select Approved Meta Template:
                      </label>
                      <select
                        value={selectedTemplate}
                        onChange={(e) => {
                          setSelectedTemplate(e.target.value);
                          const t = templateList.find((x) => x.name === e.target.value);
                          setTemplateVars(t ? t.variables.map(() => "") : []);
                        }}
                        className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-amber-500 focus:outline-none"
                      >
                        <option value="">Choose a template</option>
                        {templateList.filter((t) => t.sendable).map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.category})
                          </option>
                        ))}
                      </select>
                    </div>
                    {templateVars.map((val, i) => (
                      <div key={i}>
                        <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                          {`{{${i + 1}}}`}:
                        </label>
                        <input
                          type="text"
                          value={val}
                          onChange={(e) =>
                            setTemplateVars((prev) =>
                              prev.map((v, idx) => (idx === i ? e.target.value : v)),
                            )
                          }
                          className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-amber-500 focus:outline-none"
                        />
                      </div>
                    ))}
                  </div>
                ) : null}

                {sendSuccessMsg && (
                  <p className="text-xs text-seal-bright font-semibold">{sendSuccessMsg}</p>
                )}

                <button
                  type="button"
                  disabled={isSending}
                  onClick={handleSendMessage}
                  className="w-full py-2.5 rounded-xl bg-seal hover:bg-seal-dim text-white text-xs font-bold transition-all shadow-lg shadow-seal/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  {isSending ? "Dispatching..." : "Send Message to WhatsApp"}
                </button>
              </div>
            </GlassCard>
          </div>
        )}

        {/* Create Template Modal */}
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create WhatsApp Template"
          subtitle="Submit a new template to Meta for approval."
          maxWidth="lg"
        >
          <form onSubmit={handleCreateTemplate} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Template Name (lowercase & underscores):
              </label>
              <input
                type="text"
                required
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="e.g. appointment_reminder"
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Category:
              </label>
              <select
                value={newTemplateCategory}
                onChange={(e) => setNewTemplateCategory(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              >
                <option value="UTILITY">Utility (Account updates, reminders, receipts)</option>
                <option value="MARKETING">Marketing (Promotions, offers, announcements)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Template Body Text (Use {"{{1}}"}, {"{{2}}"} for dynamic variables):
              </label>
              <textarea
                rows={4}
                required
                value={newTemplateBody}
                onChange={(e) => setNewTemplateBody(e.target.value)}
                placeholder="Hello {{1}}, your consultation with {{2}} is confirmed for {{3}}."
                className="w-full p-3 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-seal hover:bg-seal-dim shadow-md shadow-seal/20 cursor-pointer"
              >
                Submit to Meta
              </button>
            </div>
          </form>
        </Modal>

        <Modal
          isOpen={isManageCannedOpen}
          onClose={() => setIsManageCannedOpen(false)}
          title="Saved Replies"
          subtitle="Text you've written once and want to send exactly as-is - a refund policy, an address, an apology for a delay."
        >
          <div className="space-y-5">
            <div className="space-y-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Title</label>
                <input
                  type="text"
                  value={cannedTitle}
                  onChange={(e) => setCannedTitle(e.target.value)}
                  placeholder="Refund Policy"
                  maxLength={120}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Message</label>
                <textarea
                  rows={3}
                  value={cannedBody}
                  onChange={(e) => setCannedBody(e.target.value)}
                  placeholder="We refund within 7 days of purchase..."
                  className="w-full p-3 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                />
              </div>
              {cannedError && <p className="text-xs text-red-400">{cannedError}</p>}
              <div className="flex justify-end gap-2">
                {editingCannedId && (
                  <button
                    type="button"
                    onClick={() => openCannedEditor()}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
                  >
                    Cancel
                  </button>
                )}
                <button
                  type="button"
                  onClick={saveCannedResponse}
                  disabled={isSavingCanned || !cannedTitle.trim() || !cannedBody.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md disabled:opacity-50 cursor-pointer"
                >
                  {isSavingCanned ? "Saving..." : editingCannedId ? "Save Changes" : "Add Saved Reply"}
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cannedResponseList.length === 0 ? (
                <p className="text-xs text-os-text-dim text-center py-4">No saved replies yet.</p>
              ) : (
                cannedResponseList.map((c) => (
                  <div key={c.id} className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white">{c.title}</p>
                      <p className="text-[11px] text-os-text-dim truncate">{c.body}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openCannedEditor(c)}
                        className="p-1.5 rounded-lg text-os-text-dim hover:text-brass-bright hover:bg-white/[0.06] cursor-pointer"
                        title="Edit"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCannedResponse(c.id)}
                        className="p-1.5 rounded-lg text-os-text-dim hover:text-thread-bright hover:bg-white/[0.06] cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </Modal>

        <Modal
          isOpen={isMigrateOpen}
          onClose={() => setIsMigrateOpen(false)}
          title="Migrate an Existing Number"
          subtitle="Bring a number already on WhatsApp with another provider onto Krova. Your quality rating, messaging tier, and approved templates come across with it."
        >
          <div className="space-y-4">
            {migrateError && (
              <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">{migrateError}</div>
            )}

            {migrateStep === 0 && (
              <div className="space-y-4">
                {!migrateReadiness ? (
                  <p className="text-xs text-os-text-dim">Checking readiness...</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {migrateReadiness.checks.map((c, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          {c.met === true ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-seal-bright shrink-0 mt-0.5" />
                          ) : c.met === false ? (
                            <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                          ) : (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                          )}
                          <div>
                            <p className={c.met === false ? "text-red-300 font-semibold" : "text-white"}>{c.label}</p>
                            <p className="text-os-text-dim">{c.detail}</p>
                            {c.met !== true && (
                              <p className="text-[10px] font-mono text-os-text-dim mt-0.5">Fixed by: {c.who_fixes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                      <p className="text-[10px] font-mono uppercase text-os-text-dim mb-1.5">What carries over</p>
                      <ul className="space-y-1">
                        {migrateReadiness.what_carries_over.map((item, i) => (
                          <li key={i} className="text-[11px] text-os-text-dim">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => setMigrateStep(1)}
                        disabled={!migrateReadiness.can_start}
                        className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50"
                      >
                        Continue
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {migrateStep === 1 && (
              <form onSubmit={handleMigrateStart} className="space-y-4">
                <div>
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Phone number to migrate</label>
                  <input
                    type="text" required value={migratePhone} onChange={(e) => setMigratePhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={isMigrating} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50">
                    {isMigrating ? "Claiming..." : "Claim Number"}
                  </button>
                </div>
              </form>
            )}

            {migrateStep === 2 && (
              <form onSubmit={handleMigrateVerify} className="space-y-4">
                <p className="text-xs text-os-text-dim">
                  Claimed <span className="font-mono text-white">{migrateDisplayPhone}</span>. Someone needs to be holding this phone to read the code.
                </p>
                {!migrateCodeSent ? (
                  <button
                    type="button" onClick={handleMigrateRequestCode} disabled={isMigrating}
                    className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isMigrating ? "Sending..." : "Send Verification Code"}
                  </button>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Verification code</label>
                      <input
                        type="text" required value={migrateCode} onChange={(e) => setMigrateCode(e.target.value)}
                        placeholder="123456"
                        className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={handleMigrateRequestCode} disabled={isMigrating} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                        Resend
                      </button>
                      <button type="submit" disabled={isMigrating} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50">
                        {isMigrating ? "Verifying..." : "Verify"}
                      </button>
                    </div>
                  </>
                )}
              </form>
            )}

            {migrateStep === 3 && (
              <div className="space-y-4">
                <p className="text-xs text-os-text-dim">
                  Verified. Finishing registers <span className="font-mono text-white">{migrateDisplayPhone}</span> on Krova and generates a new two-step PIN, stored encrypted.
                </p>
                <div className="flex justify-end">
                  <button
                    type="button" onClick={handleMigrateFinish} disabled={isMigrating}
                    className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer disabled:opacity-50"
                  >
                    {isMigrating ? "Finishing..." : "Finish Migration"}
                  </button>
                </div>
              </div>
            )}

            {migrateStep === 4 && (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-seal/5 border border-seal/20 flex items-start gap-3">
                  <CheckCircle2 className="w-4 h-4 text-seal-bright shrink-0 mt-0.5" />
                  <p className="text-xs text-white">{migrateFinishNote}</p>
                </div>
                <div className="flex justify-end">
                  <button type="button" onClick={() => setIsMigrateOpen(false)} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
