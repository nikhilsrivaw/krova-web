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
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import {
  account,
  approvals,
  channels,
  type UserProfile,
  type AutonomyLevel,
  type ChannelConnection,
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
      }
    };

    loadSettings();
    return () => {
      mounted = false;
    };
  }, []);

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
                    Quality Rating: GREEN • WABA ID: WABA_9021481092
                  </p>
                </div>
              </div>
              <Badge variant="emerald" dot>Connected</Badge>
            </div>

            {/* Voice */}
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-white">Voice Inbound Trunk (DOT India KYC)</h4>
                  <p className="text-[11px] text-os-text-dim font-mono">
                    Subaccount: Active • Number: +91 80 3180 2883
                  </p>
                </div>
              </div>
              <Badge variant="cyan" dot>Carrier Verified</Badge>
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
                    Read customer payment confirmations and meeting requests from email.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleConnectGmail}
                className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] transition-all cursor-pointer"
              >
                Connect Gmail OAuth
              </button>
            </div>
          </div>
        </GlassCard>

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
