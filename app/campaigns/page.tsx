"use client";

import React, { useEffect, useState } from "react";
import {
  Send,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  campaigns,
  templates,
  type AudienceSegment,
  type AudienceKey,
  type CampaignPreview,
  type Campaign,
  type Template,
} from "@/lib/api";

export default function CampaignsPage() {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<Campaign[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Campaign Builder State
  const [selectedAudience, setSelectedAudience] = useState<AudienceKey | "">("");
  const [previewData, setPreviewData] = useState<CampaignPreview | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [variableMapping, setVariableMapping] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const selectedTemplate = templateList.find((t) => t.name === selectedTemplateName) || null;

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [audRes, tplRes, campRes] = await Promise.allSettled([
      campaigns.audiences(),
      templates.list(),
      campaigns.list(),
    ]);

    if (audRes.status === "fulfilled") {
      setAudiences(audRes.value);
      if (audRes.value.length > 0) setSelectedAudience(audRes.value[0].value);
    }
    if (tplRes.status === "fulfilled") {
      const sendable = tplRes.value.filter((t) => t.sendable);
      setTemplateList(tplRes.value);
      if (sendable.length > 0) setSelectedTemplateName(sendable[0].name);
    }
    if (campRes.status === "fulfilled") setPastCampaigns(campRes.value);

    const failed = [audRes, tplRes, campRes].find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(
        failed.reason instanceof Error ? failed.reason.message : "Could not load campaign data.",
      );
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  // Keep the variable-mapping inputs in sync with the selected template's placeholder count.
  useEffect(() => {
    setVariableMapping(selectedTemplate ? selectedTemplate.variables.map(() => "") : []);
  }, [selectedTemplateName]);

  // Fetch a live preview whenever the audience or template changes.
  useEffect(() => {
    if (!selectedAudience || !selectedTemplate) {
      setPreviewData(null);
      return;
    }
    let cancelled = false;
    setIsLoadingPreview(true);
    setActionError(null);

    campaigns
      .preview({
        name: campaignName || "Untitled campaign",
        audience: selectedAudience,
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language,
        variable_mapping: variableMapping,
      })
      .then((p) => {
        if (!cancelled) setPreviewData(p);
      })
      .catch((err) => {
        if (!cancelled) {
          setPreviewData(null);
          setActionError(err instanceof Error ? err.message : "Could not preview this campaign.");
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingPreview(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAudience, selectedTemplateName, JSON.stringify(variableMapping)]);

  const handleLaunchCampaign = async () => {
    if (!selectedAudience || !selectedTemplate || !campaignName.trim()) return;
    setIsSending(true);
    setActionError(null);
    try {
      const created = await campaigns.create({
        name: campaignName,
        audience: selectedAudience,
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language,
        variable_mapping: variableMapping,
      });
      await campaigns.send(created.id);
      setIsConfirmModalOpen(false);
      loadData();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not send this campaign.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <AppLayout
      title="Broadcast Campaigns"
      subtitle="Template-based WhatsApp outreach to segmented customer audiences"
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Campaign Creator Wizard */}
          <div className="lg:col-span-2 space-y-6">
            <GlassCard className="p-6 space-y-6">
              <div>
                <h3 className="text-sm font-bold text-white mb-1">
                  Launch New Broadcast Campaign
                </h3>
                <p className="text-xs text-os-text-dim">
                  Campaigns use pre-approved Meta WhatsApp templates to reach clients outside the 24-hour messaging window.
                </p>
              </div>

              {/* Step 1: Campaign Name */}
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                  1. Campaign Internal Title:
                </label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Q1 Overdue Follow-up"
                  className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none font-sans"
                />
              </div>

              {/* Step 2: Choose Audience Segment */}
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                  2. Select Target Audience Segment:
                </label>
                <div className="space-y-2">
                  {audiences.map((aud) => (
                    <div
                      key={aud.value}
                      onClick={() => setSelectedAudience(aud.value)}
                      className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                        selectedAudience === aud.value
                          ? "border-brass/50 bg-brass/10"
                          : "border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04]"
                      }`}
                    >
                      <span className="text-xs font-bold text-white">{aud.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Step 3: Choose Template */}
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                  3. Select Approved WhatsApp Template:
                </label>
                {templateList.filter((t) => t.sendable).length === 0 ? (
                  <p className="text-xs text-os-text-dim">
                    No approved templates yet — create one from the WhatsApp tab first.
                  </p>
                ) : (
                  <select
                    value={selectedTemplateName}
                    onChange={(e) => setSelectedTemplateName(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                  >
                    {templateList.filter((t) => t.sendable).map((t) => (
                      <option key={t.id} value={t.name}>
                        {t.name} ({t.category})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Step 4: Variable mapping - which recipient field fills each {{n}} */}
              {selectedTemplate && variableMapping.length > 0 && (
                <div className="space-y-2">
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                    4. Map Template Variables to Recipient Fields:
                  </label>
                  {variableMapping.map((val, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-os-text-dim w-10 shrink-0">
                        {`{{${i + 1}}}`}
                      </span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) =>
                          setVariableMapping((prev) =>
                            prev.map((v, idx) => (idx === i ? e.target.value : v)),
                          )
                        }
                        placeholder="e.g. name, amount, due_date"
                        className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* Live Preview */}
              {isLoadingPreview ? (
                <Skeleton className="h-24 w-full" />
              ) : previewData ? (
                <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-os-text-dim">
                      Will reach: <strong className="text-white">{previewData.will_reach}</strong>
                      {previewData.will_skip > 0 && (
                        <span className="text-amber-400"> · {previewData.will_skip} skipped</span>
                      )}
                    </span>
                    {previewData.total_outstanding && (
                      <span className="text-[11px] font-mono text-seal-bright">
                        {previewData.total_outstanding} outstanding
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-os-text-dim">{previewData.cost_note}</p>
                  {previewData.daily_limit_note && (
                    <p className="text-[11px] text-amber-400">{previewData.daily_limit_note}</p>
                  )}

                  {previewData.sample.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      {previewData.sample.map((r) => (
                        <div
                          key={r.customer_id}
                          className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.04] text-xs"
                        >
                          <div className="flex items-center justify-between font-mono mb-1">
                            <span className="text-white">{r.name || "Customer"}</span>
                            <span className="text-os-text-dim">{r.phone_masked}</span>
                          </div>
                          <p className="text-os-text-dim italic">"{r.message_preview}"</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Launch CTA */}
              <button
                type="button"
                disabled={!previewData || !campaignName.trim()}
                onClick={() => setIsConfirmModalOpen(true)}
                className="w-full py-3 rounded-xl bg-brass hover:bg-brass-dim disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-lg shadow-brass/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                Review & Confirm Broadcast ({previewData?.will_reach ?? 0} Recipients)
              </button>
            </GlassCard>
          </div>

          {/* Right Col: Past Campaigns Performance */}
          <div className="space-y-6">
            <GlassCard className="p-6">
              <h4 className="text-sm font-bold text-white mb-1">
                Campaign History
              </h4>
              <p className="text-xs text-os-text-dim mb-4">
                Send outcomes from past WhatsApp broadcasts.
              </p>

              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : pastCampaigns.length === 0 ? (
                <EmptyState
                  icon={Users}
                  title="No campaigns yet"
                  description="Launched campaigns will show up here."
                />
              ) : (
                <div className="space-y-3">
                  {pastCampaigns.map((camp) => (
                    <div
                      key={camp.id}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white">{camp.name}</h5>
                        <Badge
                          variant={
                            camp.status === "sent"
                              ? "emerald"
                              : camp.status === "failed"
                              ? "rose"
                              : "amber"
                          }
                          size="sm"
                        >
                          {camp.status.toUpperCase()}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono pt-1">
                        <div className="p-2 rounded bg-black/40">
                          <span className="text-os-text-dim text-[10px] block">Recipients</span>
                          <span className="font-bold text-white">{camp.recipients}</span>
                        </div>
                        <div className="p-2 rounded bg-black/40">
                          <span className="text-os-text-dim text-[10px] block">Sent</span>
                          <span className="font-bold text-seal-bright">{camp.sent_count}</span>
                        </div>
                        <div className="p-2 rounded bg-black/40">
                          <span className="text-os-text-dim text-[10px] block">Failed</span>
                          <span className="font-bold text-thread-bright">{camp.failed_count}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>
          </div>
        </div>

        {/* High-Trust Confirmation Modal (Irreversible broadcast check) */}
        <Modal
          isOpen={isConfirmModalOpen}
          onClose={() => setIsConfirmModalOpen(false)}
          title="Confirm Real Customer Broadcast"
          subtitle="Please double-check before dispatching. WhatsApp broadcasts are irreversible at scale."
          maxWidth="md"
        >
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                Meta WABA Notice:
              </div>
              <p className="opacity-90">
                This will send <strong>{previewData?.will_reach ?? 0} real WhatsApp messages</strong> using the template{" "}
                <code>{selectedTemplateName}</code>.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSending}
                onClick={handleLaunchCampaign}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim transition-all shadow-md shadow-brass/20 cursor-pointer"
              >
                {isSending ? "Dispatching..." : "Confirm & Send Broadcast"}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </AppLayout>
  );
}
