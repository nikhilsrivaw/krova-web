"use client";

import React, { useEffect, useState } from "react";
import {
  PhoneCall,
  Phone,
  ShieldCheck,
  Upload,
  FileCheck,
  AlertCircle,
  Clock,
  DollarSign,
  Volume2,
  CheckCircle2,
  XCircle,
  Search,
  Trash2,
  ExternalLink,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Drawer } from "@/components/ui/Drawer";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  voice,
  channels,
  formatPaise,
  type Subaccount,
  type ComplianceRequirement,
  type VoiceApplication,
  type VoiceNumber,
  type CallLog,
  type ChannelConnection,
  type AgentSettings,
} from "@/lib/api";

const STATUS_LABEL: Record<VoiceApplication["status"], string> = {
  subaccount_created: "Not Submitted",
  compliance_submitted: "In Review by Carrier",
  compliance_approved: "Compliance Approved",
  compliance_rejected: "Rejected",
};

const STATUS_VARIANT: Record<VoiceApplication["status"], "emerald" | "amber" | "rose"> = {
  subaccount_created: "amber",
  compliance_submitted: "amber",
  compliance_approved: "emerald",
  compliance_rejected: "rose",
};

export default function VoicePage() {
  const [activeTab, setActiveTab] = useState<"compliance" | "numbers" | "logs" | "settings">("compliance");
  const [subaccount, setSubaccount] = useState<Subaccount | null>(null);
  const [requirement, setRequirement] = useState<ComplianceRequirement | null>(null);
  const [hasEndUser, setHasEndUser] = useState(false);
  const [uploadedDocTypeIds, setUploadedDocTypeIds] = useState<Set<string>>(new Set());
  const [application, setApplication] = useState<VoiceApplication | null>(null);
  const [voiceConnections, setVoiceConnections] = useState<ChannelConnection[]>([]);
  const [callLogs, setCallLogs] = useState<CallLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  // Number Search & Purchase
  const [searchPattern, setSearchPattern] = useState("080");
  const [searchResults, setSearchResults] = useState<VoiceNumber[]>([]);
  const [isSearchingNumbers, setIsSearchingNumbers] = useState(false);

  // Transcript Drawer
  const [selectedCall, setSelectedCall] = useState<CallLog | null>(null);

  // Agent Speech & Greeting - null means "no voice number connected yet",
  // which the tab treats differently from "still loading".
  const [agentSettings, setAgentSettings] = useState<AgentSettings | null>(null);
  const [greetingDraft, setGreetingDraft] = useState("");
  const [languageModeDraft, setLanguageModeDraft] = useState<"adaptive" | "fixed">("adaptive");
  const [languageDraft, setLanguageDraft] = useState<"en-IN" | "hi-IN">("en-IN");
  const [speakerDraft, setSpeakerDraft] = useState("shubh");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    const [appRes, chRes, logsRes, agentRes] = await Promise.allSettled([
      voice.applicationStatus(),
      channels.list(),
      voice.logs(),
      voice.agentSettings(),
    ]);

    if (appRes.status === "fulfilled") {
      setApplication(appRes.value);
      // An application existing at all implies the earlier steps succeeded.
      setHasEndUser(true);
    }
    if (chRes.status === "fulfilled") {
      setVoiceConnections(chRes.value.filter((c) => c.channel === "voice"));
    }
    if (logsRes.status === "fulfilled") setCallLogs(logsRes.value);
    if (agentRes.status === "fulfilled") {
      setAgentSettings(agentRes.value);
      setGreetingDraft(agentRes.value.greeting);
      setLanguageModeDraft(agentRes.value.language_mode);
      setLanguageDraft(agentRes.value.language);
      setSpeakerDraft(agentRes.value.speaker);
    }
    // agentRes rejecting (409, no voice number yet) is expected and left
    // as agentSettings === null - the tab shows its own explanatory state
    // for that rather than surfacing it as an error banner.
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(null);
    }
  };

  const handleCreateSubaccount = () =>
    run("subaccount", async () => {
      const sub = await voice.createSubaccount();
      setSubaccount(sub);
      const req = await voice.requirements();
      setRequirement(req);
    });

  const handleCreateEndUser = () =>
    run("enduser", async () => {
      await voice.createEndUser();
      setHasEndUser(true);
    });

  const handleUploadDocument = (docTypeId: string, docTypeName: string, file: File) =>
    run(`doc-${docTypeId}`, async () => {
      await voice.uploadDocument({ document_type_id: docTypeId, alias: docTypeName, file });
      setUploadedDocTypeIds((prev) => new Set(prev).add(docTypeId));
    });

  const handleSubmitApplication = () =>
    run("submit", async () => {
      if (!requirement) return;
      const app = await voice.submitApplication({ requirement_id: requirement.requirement_id });
      setApplication(app);
    });

  const handleRefreshStatus = () =>
    run("refresh", async () => {
      const app = await voice.applicationStatus();
      setApplication(app);
    });

  const handleResubmit = () =>
    run("resubmit", async () => {
      const app = await voice.resubmitApplication();
      setApplication(app);
    });

  const handleSaveAgentSettings = () =>
    run("agent-settings", async () => {
      const updated = await voice.updateAgentSettings({
        greeting: greetingDraft,
        language_mode: languageModeDraft,
        language: languageDraft,
        speaker: speakerDraft,
      });
      setAgentSettings(updated);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
    });

  const handleSearchNumbers = async () => {
    setIsSearchingNumbers(true);
    setActionError(null);
    try {
      const res = await voice.searchNumbers(searchPattern);
      setSearchResults(res);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not search numbers.");
    } finally {
      setIsSearchingNumbers(false);
    }
  };

  const handleBuyNumber = (num: VoiceNumber) =>
    run(`buy-${num.number}`, async () => {
      await voice.buyNumber(num.number);
      setSearchResults((prev) => prev.filter((n) => n.number !== num.number));
      const list = await channels.list();
      setVoiceConnections(list.filter((c) => c.channel === "voice"));
    });

  const handleReleaseNumber = (number: string) =>
    run(`release-${number}`, async () => {
      await voice.releaseNumber(number);
      setVoiceConnections((prev) => prev.filter((c) => c.external_account_id !== number));
    });

  const documentTypesRemaining =
    requirement?.document_types.filter((d) => !uploadedDocTypeIds.has(d.id)) ?? [];

  return (
    <AppLayout
      title="Voice Phone Agent"
      subtitle="Indian Regulatory Compliance, Phone Numbers & Cost Telemetry"
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {actionError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {actionError}
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          {[
            { key: "compliance", label: "Regulatory KYC & Compliance" },
            { key: "numbers", label: `Phone Numbers (${voiceConnections.length})` },
            { key: "logs", label: `Call Logs (${callLogs.length})` },
            { key: "settings", label: "Agent Speech & Greeting" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
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

        {isLoading ? (
          <Skeleton className="h-64 w-full" />
        ) : (
          <>
            {/* TAB 1: REGULATORY KYC & COMPLIANCE WIZARD */}
            {activeTab === "compliance" && (
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <ShieldCheck className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          India Telecom Regulatory Verification
                        </h3>
                        <p className="text-xs text-os-text-dim mt-0.5">
                          Carrier KYC is required before Krova can buy this business a phone number.
                        </p>
                      </div>
                    </div>
                    {application && (
                      <Badge variant={STATUS_VARIANT[application.status]}>
                        {STATUS_LABEL[application.status]}
                      </Badge>
                    )}
                  </div>

                  {/* Step 1: Subaccount */}
                  <div className="mt-6 space-y-4">
                    <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                      <div>
                        <p className="text-xs font-bold text-white">1. Create Voice Subaccount</p>
                        <p className="text-[11px] text-os-text-dim mt-0.5">
                          {subaccount
                            ? `Created — ${subaccount.subaccount_auth_id}`
                            : application
                            ? "Already created"
                            : "This business's own slice of the voice carrier."}
                        </p>
                      </div>
                      {!subaccount && !application && (
                        <button
                          type="button"
                          onClick={handleCreateSubaccount}
                          disabled={busy === "subaccount"}
                          className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20"
                        >
                          {busy === "subaccount" ? "Creating..." : "Create Subaccount"}
                        </button>
                      )}
                      {(subaccount || application) && (
                        <CheckCircle2 className="w-5 h-5 text-seal-bright" />
                      )}
                    </div>

                    {/* Step 2: End-user identity */}
                    {(subaccount || application) && (
                      <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                        <div>
                          <p className="text-xs font-bold text-white">2. Register Identity</p>
                          <p className="text-[11px] text-os-text-dim mt-0.5">
                            Registers this business's name with the carrier.
                          </p>
                        </div>
                        {!hasEndUser ? (
                          <button
                            type="button"
                            onClick={handleCreateEndUser}
                            disabled={busy === "enduser"}
                            className="px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20"
                          >
                            {busy === "enduser" ? "Registering..." : "Register Identity"}
                          </button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-seal-bright" />
                        )}
                      </div>
                    )}

                    {/* Step 3: Documents */}
                    {hasEndUser && requirement && !application && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <p className="text-xs font-bold text-white">3. Upload Documents</p>
                        {requirement.document_types.map((docType) => {
                          const done = uploadedDocTypeIds.has(docType.id);
                          return (
                            <div
                              key={docType.id}
                              className="flex items-center justify-between text-xs"
                            >
                              <span className="text-os-text-dim">{docType.name}</span>
                              {done ? (
                                <CheckCircle2 className="w-4 h-4 text-seal-bright" />
                              ) : (
                                <label className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold cursor-pointer flex items-center gap-1.5">
                                  <Upload className="w-3.5 h-3.5" />
                                  {busy === `doc-${docType.id}` ? "Uploading..." : "Upload"}
                                  <input
                                    type="file"
                                    className="hidden"
                                    disabled={busy === `doc-${docType.id}`}
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) handleUploadDocument(docType.id, docType.name, file);
                                    }}
                                  />
                                </label>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Step 4: Submit */}
                    {hasEndUser &&
                      requirement &&
                      !application &&
                      documentTypesRemaining.length === 0 && (
                        <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                          <p className="text-xs font-bold text-white">4. Submit for Review</p>
                          <button
                            type="button"
                            onClick={handleSubmitApplication}
                            disabled={busy === "submit"}
                            className="px-4 py-2 rounded-lg bg-seal hover:bg-seal-dim text-white text-xs font-bold shadow-md shadow-seal/20"
                          >
                            {busy === "submit" ? "Submitting..." : "Submit Application"}
                          </button>
                        </div>
                      )}

                    {/* Application status */}
                    {application && (
                      <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-bold text-white">Application Status</p>
                            <p className="text-[11px] font-mono text-os-text-dim mt-0.5">
                              {application.application_id}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleRefreshStatus}
                            disabled={busy === "refresh"}
                            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold"
                          >
                            {busy === "refresh" ? "Checking..." : "Refresh Status"}
                          </button>
                        </div>
                        {application.status === "compliance_rejected" && (
                          <>
                            {application.rejection_reason && (
                              <div className="p-3 rounded-lg bg-thread/10 border border-thread/20 text-xs text-thread-bright">
                                {application.rejection_reason}
                              </div>
                            )}
                            <button
                              type="button"
                              onClick={handleResubmit}
                              disabled={busy === "resubmit"}
                              className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold"
                            >
                              {busy === "resubmit" ? "Resubmitting..." : "Resubmit with corrected documents"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </GlassCard>
              </div>
            )}

            {/* TAB 2: PHONE NUMBERS SEARCH & ASSIGNMENT */}
            {activeTab === "numbers" && (
              <div className="space-y-6">
                <GlassCard className="p-6">
                  <h4 className="text-sm font-bold text-white mb-1">
                    Active Phone Numbers
                  </h4>
                  <p className="text-xs text-os-text-dim mb-4">
                    Numbers routed to your KROVA voice agent.
                  </p>

                  {voiceConnections.length === 0 ? (
                    <p className="text-xs text-os-text-dim">
                      No numbers connected yet. Complete compliance, then search below.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {voiceConnections.map((conn) => (
                        <div
                          key={conn.id}
                          className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 flex items-center justify-between gap-4"
                        >
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-cyan-500/20 border border-cyan-500/30 text-cyan-300">
                              <Phone className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold font-mono text-white">
                                  {conn.external_account_id}
                                </h5>
                                <Badge variant={conn.status === "active" ? "cyan" : "amber"} size="sm">
                                  {conn.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleReleaseNumber(conn.external_account_id)}
                            disabled={busy === `release-${conn.external_account_id}`}
                            className="text-xs text-os-text-dim hover:text-thread-bright transition-colors"
                          >
                            Release Number
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </GlassCard>

                {application?.status === "compliance_approved" && (
                  <GlassCard className="p-6">
                    <h4 className="text-sm font-bold text-white mb-1">
                      Search & Purchase Indian Voice Numbers
                    </h4>
                    <p className="text-xs text-os-text-dim mb-4">
                      Search local numbers by area code or city (e.g. 080 Bengaluru, 022 Mumbai).
                    </p>

                    <div className="flex gap-3 mb-6">
                      <input
                        type="text"
                        value={searchPattern}
                        onChange={(e) => setSearchPattern(e.target.value)}
                        placeholder="Area code or city"
                        className="flex-1 px-4 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleSearchNumbers}
                        disabled={isSearchingNumbers}
                        className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md shadow-cyan-600/20 cursor-pointer"
                      >
                        {isSearchingNumbers ? "Searching..." : "Search"}
                      </button>
                    </div>

                    {searchResults.length > 0 && (
                      <div className="space-y-3">
                        {searchResults.map((num) => (
                          <div
                            key={num.number}
                            className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-bold font-mono text-white">{num.number}</p>
                              <p className="text-[11px] font-mono text-os-text-dim">
                                {[num.city, num.region].filter(Boolean).join(", ")}
                                {num.voice_rate && ` • Rate: ${num.voice_rate}`}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleBuyNumber(num)}
                              disabled={busy === `buy-${num.number}`}
                              className="px-3.5 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 cursor-pointer"
                            >
                              {busy === `buy-${num.number}` ? "Buying..." : "Buy & Connect"}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </GlassCard>
                )}
              </div>
            )}

            {/* TAB 3: CALL LOGS */}
            {activeTab === "logs" && (
              <div className="space-y-4">
                <GlassCard className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h4 className="text-sm font-bold text-white">Call Logs</h4>
                      <p className="text-xs text-os-text-dim">
                        Per-call telemetry with speech-to-text and text-to-speech cost breakdown.
                      </p>
                    </div>
                  </div>

                  {callLogs.length === 0 ? (
                    <EmptyState
                      icon={PhoneCall}
                      title="No calls yet"
                      description="Calls to your connected number will show up here."
                    />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="border-b border-white/[0.06] text-os-text-dim font-mono uppercase text-[10px]">
                          <tr>
                            <th className="py-3 px-3">Caller</th>
                            <th className="py-3 px-3">Duration</th>
                            <th className="py-3 px-3">Cost Breakdown</th>
                            <th className="py-3 px-3">Ended</th>
                            <th className="py-3 px-3">Started</th>
                            <th className="py-3 px-3 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {callLogs.map((log) => (
                            <tr key={log.id} className="hover:bg-white/[0.02] group">
                              <td className="py-3 px-3">
                                <p className="font-semibold text-white">
                                  {log.customer_name || "Unknown"}
                                </p>
                                <p className="font-mono text-[10px] text-os-text-dim">
                                  {log.customer_phone || "—"}
                                </p>
                              </td>
                              <td className="py-3 px-3 font-mono">
                                {log.duration_seconds != null
                                  ? `${Math.floor(log.duration_seconds / 60)}m ${log.duration_seconds % 60}s`
                                  : "—"}
                              </td>
                              <td className="py-3 px-3 font-mono">
                                <span className="font-bold text-white block">{log.cost_display}</span>
                                <span className="text-[10px] text-os-text-dim block">
                                  STT: {formatPaise(log.cost_breakdown.sarvam_stt_paise ?? 0)} • TTS:{" "}
                                  {formatPaise(log.cost_breakdown.sarvam_tts_paise ?? 0)} • Carrier:{" "}
                                  {formatPaise(log.cost_breakdown.plivo_voice_paise ?? 0)}
                                </span>
                              </td>
                              <td className="py-3 px-3 font-mono text-os-text-dim text-[11px]">
                                {log.hangup_cause || "—"}
                              </td>
                              <td className="py-3 px-3 font-mono text-os-text-dim text-[11px]">
                                {new Date(log.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedCall(log)}
                                  className="px-2.5 py-1 rounded bg-white/[0.06] hover:bg-white/[0.1] text-white font-semibold text-xs"
                                >
                                  Details
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </GlassCard>
              </div>
            )}

            {/* TAB 4: AGENT SPEECH & GREETING */}
            {activeTab === "settings" && (
              <div className="max-w-2xl mx-auto space-y-6">
                {!agentSettings ? (
                  <GlassCard className="p-6">
                    <EmptyState
                      icon={Volume2}
                      title="Connect a phone number first"
                      description="Speech and greeting are per-number - once a voice number is bought under Phone Numbers, its voice and language become configurable here."
                    />
                  </GlassCard>
                ) : (
                  <GlassCard className="p-6 space-y-6">
                    <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
                      <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <Volume2 className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">Agent Speech & Greeting</h3>
                        <p className="text-xs text-os-text-dim mt-0.5">
                          What callers hear on this connected number.
                        </p>
                      </div>
                    </div>

                    {/* Greeting */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
                        Greeting
                      </label>
                      <textarea
                        value={greetingDraft}
                        onChange={(e) => setGreetingDraft(e.target.value)}
                        rows={2}
                        maxLength={500}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none resize-none"
                        placeholder="Hello, thank you for calling..."
                      />
                    </div>

                    {/* Voice */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
                        Agent Voice
                      </label>
                      <select
                        value={speakerDraft}
                        onChange={(e) => setSpeakerDraft(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                      >
                        <optgroup label="Male">
                          {agentSettings.male_speakers.map((s) => (
                            <option key={s} value={s} className="capitalize">
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Female">
                          {agentSettings.female_speakers.map((s) => (
                            <option key={s} value={s} className="capitalize">
                              {s.charAt(0).toUpperCase() + s.slice(1)}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                    </div>

                    {/* Language mode */}
                    <div>
                      <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
                        Language
                      </label>
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        {[
                          {
                            key: "adaptive" as const,
                            title: "Adaptive (Recommended)",
                            desc: "Replies in whatever the caller speaks - Hindi, English, or a mix.",
                          },
                          {
                            key: "fixed" as const,
                            title: "Fixed",
                            desc: "Always replies in one chosen language, regardless of the caller.",
                          },
                        ].map((m) => (
                          <div
                            key={m.key}
                            onClick={() => setLanguageModeDraft(m.key)}
                            className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                              languageModeDraft === m.key
                                ? "border-cyan-500/50 bg-cyan-500/10 text-white font-bold"
                                : "border-white/[0.06] bg-white/[0.02] text-os-text-dim hover:text-white"
                            }`}
                          >
                            <p className="text-xs text-white mb-0.5">{m.title}</p>
                            <p className="text-[10px] font-mono text-os-text-dim leading-relaxed">
                              {m.desc}
                            </p>
                          </div>
                        ))}
                      </div>

                      {languageModeDraft === "fixed" && (
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { key: "en-IN" as const, title: "English only" },
                            { key: "hi-IN" as const, title: "Hindi only" },
                          ].map((l) => (
                            <button
                              key={l.key}
                              type="button"
                              onClick={() => setLanguageDraft(l.key)}
                              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition-all ${
                                languageDraft === l.key
                                  ? "bg-cyan-600 border-cyan-500 text-white"
                                  : "bg-white/[0.02] border-white/[0.06] text-os-text-dim hover:text-white"
                              }`}
                            >
                              {l.title}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3">
                      {settingsSaved && (
                        <span className="text-xs text-seal-bright font-mono">Saved.</span>
                      )}
                      <button
                        type="button"
                        onClick={handleSaveAgentSettings}
                        disabled={busy === "agent-settings"}
                        className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-md shadow-cyan-600/20 cursor-pointer"
                      >
                        {busy === "agent-settings" ? "Saving..." : "Save Settings"}
                      </button>
                    </div>
                  </GlassCard>
                )}
              </div>
            )}
          </>
        )}

        {/* Call Detail Drawer */}
        <Drawer
          isOpen={!!selectedCall}
          onClose={() => setSelectedCall(null)}
          title="Voice Call"
          subtitle={`Call with ${selectedCall?.customer_name || "Customer"}${selectedCall?.customer_phone ? ` (${selectedCall.customer_phone})` : ""}`}
          width="md"
        >
          {selectedCall && (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between text-xs font-mono">
                <div>
                  <span className="text-os-text-dim block text-[10px]">Duration</span>
                  <span className="text-white font-bold">
                    {selectedCall.duration_seconds != null ? `${selectedCall.duration_seconds}s` : "—"}
                  </span>
                </div>
                <div>
                  <span className="text-os-text-dim block text-[10px]">Total Cost</span>
                  <span className="text-cyan-400 font-bold">{selectedCall.cost_display}</span>
                </div>
                <div>
                  <span className="text-os-text-dim block text-[10px]">Ended</span>
                  <span className="text-white font-bold">{selectedCall.hangup_cause || "—"}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/[0.06]">
                <a
                  href="/conversations"
                  className="w-full py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center justify-center gap-2"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  View Full Transcript in Conversations
                </a>
              </div>
            </div>
          )}
        </Drawer>
      </div>
    </AppLayout>
  );
}
