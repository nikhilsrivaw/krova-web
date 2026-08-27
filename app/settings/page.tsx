"use client";

import React, { useEffect, useState } from "react";
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
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import {
  account,
  approvals,
  channels,
  waAccount,
  type UserProfile,
  type AutonomyLevel,
  type ChannelConnection,
  type WhatsAppProfile,
  type WhatsAppHealth,
  type WhatsAppReadiness,
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
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

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
