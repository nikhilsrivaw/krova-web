"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  Building,
  MessageSquare,
  PhoneCall,
  Mail,
  Shield,
  Sparkles,
  ArrowRight,
  Check,
  Zap,
  ChevronRight,
  Eye,
  FileText,
} from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { account, approvals, channels, type AutonomyLevel } from "@/lib/api";

const STEPS = [
  "Business & Vertical",
  "Connect WhatsApp",
  "Voice & Gmail (Optional)",
  "Autonomy Guardrails",
];

const VERTICALS = [
  { key: "clinic", label: "Clinic & Healthcare", desc: "Patient appointments, doctor consultations, diagnostics" },
  { key: "coaching", label: "Coaching Institute", desc: "Student enrollments, batch scheduling, fee reminders" },
  { key: "salon", label: "Salon & Beauty Chain", desc: "Stylist bookings, service catalogs, appointment rescheduling" },
  { key: "agency", label: "Agency & Consultancy", desc: "Retainer client deliverables and payment milestones" },
  { key: "general", label: "General Professional", desc: "Standard client inquiries, quotes & ledger commitments" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);

  // Step 1: Business Profile
  const [businessName, setBusinessName] = useState("Apex Healthcare LLP");
  const [vertical, setVertical] = useState("clinic");

  // Step 2: WhatsApp
  const [isConnectingWA, setIsConnectingWA] = useState(false);
  const [isWAConnected, setIsWAConnected] = useState(true);

  // Step 3: Voice & Gmail
  const [isVoiceConnected, setIsVoiceConnected] = useState(false);
  const [isGmailConnected, setIsGmailConnected] = useState(false);

  // Step 4: Autonomy (Default draft)
  const [autonomy, setAutonomy] = useState<AutonomyLevel>("draft");
  const [isFinishing, setIsFinishing] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      setIsFinishing(true);
      setFinishError(null);
      try {
        await account.updateProfile({
          business_name: businessName,
          vertical,
        });
        await approvals.setAutonomy(autonomy);
        router.push("/dashboard");
      } catch (err) {
        setFinishError(
          err instanceof Error ? err.message : "Could not save your setup.",
        );
        setIsFinishing(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-os-bg text-white flex flex-col justify-between p-6 sm:p-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brass/10 blur-[140px] rounded-full pointer-events-none" />

      {/* Top Header */}
      <header className="max-w-3xl mx-auto w-full flex items-center justify-between pb-8 border-b border-white/[0.06] relative z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brass-bright to-brass-dim flex items-center justify-center font-bold text-white shadow-lg shadow-brass/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="text-sm font-bold tracking-tight">KROVA OS Onboarding</span>
        </div>

        <div className="text-xs font-mono text-os-text-dim">
          Step {currentStep + 1} of {STEPS.length}
        </div>
      </header>

      {/* Main Step Body */}
      <main className="max-w-2xl mx-auto w-full my-auto py-8 relative z-10">
        {/* Step 0: Business Name & Vertical */}
        {currentStep === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Welcome to KROVA. Tell us about your business.
              </h2>
              <p className="text-xs text-os-text-dim mt-1">
                Your industry vertical customizes the AI agent's tone, terminology, and knowledge defaults.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                  Business Legal or Trading Name:
                </label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-sm text-white focus:border-brass focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
                  Select Industry Vertical:
                </label>
                <div className="space-y-2.5">
                  {VERTICALS.map((v) => (
                    <div
                      key={v.key}
                      onClick={() => setVertical(v.key)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        vertical === v.key
                          ? "border-brass/60 bg-brass/10 text-white font-semibold"
                          : "border-white/[0.06] bg-white/[0.02] text-os-text-dim hover:text-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{v.label}</span>
                        {vertical === v.key && <Check className="w-4 h-4 text-brass" />}
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5">{v.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Step 1: Connect WhatsApp */}
        {currentStep === 1 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Connect your WhatsApp Business Account
              </h2>
              <p className="text-xs text-os-text-dim mt-1">
                KROVA reads customer inquiries and proposes replies using Meta's official Embedded Signup flow.
              </p>
            </div>

            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-seal/10 border border-seal/20 text-seal-bright">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Meta WhatsApp Business API
                  </h4>
                  <p className="text-xs text-os-text-dim">
                    {isWAConnected ? "● Phone number active & webhooks connected" : "Launch Meta login popup"}
                  </p>
                </div>
              </div>

              {isWAConnected ? (
                <div className="p-4 rounded-xl bg-seal/10 border border-seal/30 text-xs text-seal-bright flex items-center justify-between">
                  <span>✓ WhatsApp Business Number (+91 80 3180 2883) verified with Meta</span>
                  <Badge variant="emerald">Connected</Badge>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsWAConnected(true)}
                  className="w-full py-3 rounded-xl bg-seal hover:bg-seal-dim text-white text-xs font-bold transition-all shadow-md shadow-seal/20 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  Connect with Meta Embedded Signup
                </button>
              )}
            </GlassCard>
          </motion.div>
        )}

        {/* Step 2: Connect Voice & Gmail (Optional) */}
        {currentStep === 2 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Connect Secondary Channels (Optional)
              </h2>
              <p className="text-xs text-os-text-dim mt-1">
                You can configure these now or complete them later from the Voice and Settings tabs.
              </p>
            </div>

            <div className="space-y-4">
              {/* Voice Card */}
              <GlassCard className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                    <PhoneCall className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Voice Phone Agent (India KYC)</h4>
                    <p className="text-[11px] text-os-text-dim">
                      Live inbound phone agent with real-time speech transcription.
                    </p>
                  </div>
                </div>

                <Badge variant={isVoiceConnected ? "cyan" : "outline"}>
                  {isVoiceConnected ? "Configured" : "Available in Voice Tab"}
                </Badge>
              </GlassCard>

              {/* Gmail Card */}
              <GlassCard className="p-5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">Gmail Work Inbox</h4>
                    <p className="text-[11px] text-os-text-dim">
                      Extract payment receipts and client promises from emails.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsGmailConnected(!isGmailConnected)}
                  className="px-3.5 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] cursor-pointer"
                >
                  {isGmailConnected ? "✓ Connected" : "Connect OAuth"}
                </button>
              </GlassCard>
            </div>
          </motion.div>
        )}

        {/* Step 3: Set Autonomy Guardrails (Default: Draft) */}
        {currentStep === 3 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            <div>
              <h2 className="text-2xl font-bold text-white tracking-tight">
                Set AI Agent Autonomy Level
              </h2>
              <p className="text-xs text-os-text-dim mt-1">
                KROVA is built with a human-in-the-loop promise. We recommend starting with <strong>Draft Mode</strong>.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  level: "draft" as AutonomyLevel,
                  title: "Draft Mode (Recommended Default)",
                  desc: "Human-in-the-loop: AI proposes replies with confidence and reasoning. A human approves, edits, or rejects before sending.",
                  icon: FileText,
                  badge: "Safe for Launch",
                },
                {
                  level: "observe" as AutonomyLevel,
                  title: "Observe Mode",
                  desc: "The AI agent only monitors channels and extracts commitments into the ledger. Generates zero draft replies.",
                  icon: Eye,
                  badge: "Passive",
                },
                {
                  level: "act" as AutonomyLevel,
                  title: "Act Mode (Autonomous)",
                  desc: "AI agent sends approved replies autonomously without human intervention when confidence is high.",
                  icon: Zap,
                  badge: "Autonomous",
                },
              ].map((a) => (
                <div
                  key={a.level}
                  onClick={() => setAutonomy(a.level)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    autonomy === a.level
                      ? "border-brass/60 bg-brass/10 shadow-lg shadow-brass/10"
                      : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg border ${
                          autonomy === a.level
                            ? "bg-brass/20 border-brass/40 text-brass-bright"
                            : "bg-white/[0.04] border-white/[0.08] text-os-text-dim"
                        }`}
                      >
                        <a.icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-xs font-bold text-white">{a.title}</h4>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-os-text-dim">
                            {a.badge}
                          </span>
                        </div>
                        <p className="text-xs text-os-text-dim leading-relaxed">{a.desc}</p>
                      </div>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 mt-1 ${
                        autonomy === a.level ? "border-brass bg-brass" : "border-white/20"
                      }`}
                    >
                      {autonomy === a.level && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {finishError && (
          <div className="mt-6 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {finishError}
          </div>
        )}

        {/* Step Navigation Controls */}
        <div className="mt-8 pt-6 border-t border-white/[0.06] flex items-center justify-between">
          {currentStep > 0 ? (
            <button
              type="button"
              onClick={() => setCurrentStep((prev) => prev - 1)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-os-text-dim hover:text-white bg-white/[0.04] transition-colors"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            disabled={isFinishing}
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold transition-all shadow-lg shadow-brass/20 flex items-center gap-1.5 cursor-pointer"
          >
            <span>{currentStep === STEPS.length - 1 ? (isFinishing ? "Launching..." : "Launch Command Center") : "Continue"}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-[11px] font-mono text-os-text-dim py-4 border-t border-white/[0.04]">
        KROVA — Autonomous Business Intelligence OS • Built for Indian SMBs
      </footer>
    </div>
  );
}
