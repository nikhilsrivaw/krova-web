"use client";

import React, { useEffect, useState } from "react";
import {
  Send,
  Users,
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  Plus,
  X,
  Clock3,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  campaigns,
  templates,
  crm,
  flows as flowsApi,
  type AudienceSegment,
  type AudienceKey,
  type CampaignPreview,
  type Campaign,
  type CampaignStep,
  type CampaignStepRequest,
  type Template,
  type WhatsAppFlow,
} from "@/lib/api";

/** The {{placeholders}} in one card's body text, in order, without duplicates - mirrors variables_in() on the backend. */
function cardVariables(template: Template, cardIndex: number): string[] {
  const components = Array.isArray(template.components) ? template.components : [];
  const carousel = components.find(
    (c): c is { type: string; cards: { components: { type: string; text?: string }[] }[] } =>
      typeof c === "object" && c !== null && (c as { type?: string }).type === "CAROUSEL",
  );
  const card = carousel?.cards?.[cardIndex];
  const body = card?.components.find((c) => c.type === "BODY")?.text || "";
  const seen: string[] = [];
  for (const match of body.matchAll(/\{\{\s*([A-Za-z0-9_]+)\s*\}\}/g)) {
    if (!seen.includes(match[1])) seen.push(match[1]);
  }
  return seen;
}

export default function CampaignsPage() {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [templateList, setTemplateList] = useState<Template[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<Campaign[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Campaign Builder State
  const [selectedAudience, setSelectedAudience] = useState<AudienceKey | "">("");
  const [audienceTag, setAudienceTag] = useState<string>("");
  const [previewData, setPreviewData] = useState<CampaignPreview | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>("");
  const [campaignName, setCampaignName] = useState<string>("");
  const [variableMapping, setVariableMapping] = useState<string[]>([]);
  // One entry per carousel card, only populated when the selected template
  // is a carousel - each inner array is that card's own variable mapping.
  const [cardMapping, setCardMapping] = useState<string[][]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Only meaningful when the chosen template has a FLOW-type button
  // (created that way in Meta's own WhatsApp Manager) - which Flow it
  // opens is set there, not detected here, so it's named explicitly.
  const [publishedFlows, setPublishedFlows] = useState<WhatsAppFlow[]>([]);
  const [attachFlow, setAttachFlow] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string>("");

  // Follow-up steps - a drip sequence is the campaign's own template (sent
  // immediately, unchanged from before) plus zero or more of these, each
  // added to the campaign right after it's created and before it's sent.
  const [draftSteps, setDraftSteps] = useState<CampaignStepRequest[]>([]);
  const [newStepTemplate, setNewStepTemplate] = useState<string>("");
  const [newStepDelay, setNewStepDelay] = useState<number>(3);
  const [newStepCondition, setNewStepCondition] = useState<"always" | "no_reply">("no_reply");
  const [newStepStopOnReply, setNewStepStopOnReply] = useState(true);

  // Follow-ups on past campaigns - loaded on demand per card, not on every
  // page load.
  const [stepsByCampaign, setStepsByCampaign] = useState<Record<string, CampaignStep[]>>({});
  const [loadingStepsFor, setLoadingStepsFor] = useState<string | null>(null);

  const selectedTemplate = templateList.find((t) => t.name === selectedTemplateName) || null;
  const sendableTemplates = templateList.filter((t) => t.sendable);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const [audRes, tplRes, campRes, tagRes, flowRes] = await Promise.allSettled([
      campaigns.audiences(),
      templates.list(),
      campaigns.list(),
      crm.allTags(),
      flowsApi.list(),
    ]);

    if (audRes.status === "fulfilled") {
      setAudiences(audRes.value);
      if (audRes.value.length > 0) setSelectedAudience(audRes.value[0].value);
    }
    if (tplRes.status === "fulfilled") {
      const sendable = tplRes.value.filter((t) => t.sendable);
      setTemplateList(tplRes.value);
      // Arriving from "Use in Campaign" on the WhatsApp Hub (?template=name)
      // - only honoured if it actually names a real, sendable template,
      // never trusted blindly from the URL.
      const requested = new URLSearchParams(window.location.search).get("template");
      const requestedTemplate = requested && sendable.find((t) => t.name === requested);
      if (requestedTemplate) {
        setSelectedTemplateName(requestedTemplate.name);
      } else if (sendable.length > 0) {
        setSelectedTemplateName(sendable[0].name);
      }
    }
    if (campRes.status === "fulfilled") setPastCampaigns(campRes.value);
    if (tagRes.status === "fulfilled") setAvailableTags(tagRes.value);
    if (flowRes.status === "fulfilled") setPublishedFlows(flowRes.value.filter((f) => f.status === "PUBLISHED"));

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
    setCardMapping(
      selectedTemplate?.is_carousel
        ? Array.from({ length: selectedTemplate.card_count }, (_, i) =>
            cardVariables(selectedTemplate, i).map(() => ""),
          )
        : [],
    );
  }, [selectedTemplateName]);

  const audienceParams =
    selectedAudience === "by_tag" && audienceTag ? { tag: audienceTag } : undefined;

  const carouselCardsPayload =
    selectedTemplate?.is_carousel
      ? selectedTemplate.carousel_media_ids.map((mediaId, i) => ({
          media_id: mediaId,
          variable_mapping: cardMapping[i] || [],
        }))
      : undefined;

  // Fetch a live preview whenever the audience or template changes.
  useEffect(() => {
    if (!selectedAudience || !selectedTemplate) {
      setPreviewData(null);
      return;
    }
    // "by_tag" needs a chosen tag before it means anything - previewing with
    // none would just show "reaches 0", which reads as a bug, not a prompt.
    if (selectedAudience === "by_tag" && !audienceTag) {
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
        audience_params: audienceParams,
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language,
        variable_mapping: variableMapping,
        carousel_cards: carouselCardsPayload,
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
  }, [
    selectedAudience, audienceTag, selectedTemplateName,
    JSON.stringify(variableMapping), JSON.stringify(cardMapping),
  ]);

  const addDraftStep = () => {
    if (!newStepTemplate) return;
    setDraftSteps((prev) => [
      ...prev,
      {
        delay_days: newStepDelay,
        condition: newStepCondition,
        stop_on_reply: newStepStopOnReply,
        template_name: newStepTemplate,
        template_language: templateList.find((t) => t.name === newStepTemplate)?.language || "en",
      },
    ]);
    setNewStepTemplate("");
    setNewStepDelay(3);
    setNewStepCondition("no_reply");
    setNewStepStopOnReply(true);
  };

  const removeDraftStep = (index: number) => {
    setDraftSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const toggleCampaignSteps = async (campaignId: string) => {
    if (stepsByCampaign[campaignId]) {
      setStepsByCampaign((prev) => {
        const next = { ...prev };
        delete next[campaignId];
        return next;
      });
      return;
    }
    setLoadingStepsFor(campaignId);
    try {
      const steps = await campaigns.listSteps(campaignId);
      setStepsByCampaign((prev) => ({ ...prev, [campaignId]: steps }));
    } catch {
      // Best-effort - a business without steps on this campaign just sees nothing expand.
    } finally {
      setLoadingStepsFor(null);
    }
  };

  const handleLaunchCampaign = async () => {
    if (!selectedAudience || !selectedTemplate || !campaignName.trim()) return;
    if (selectedAudience === "by_tag" && !audienceTag) return;
    setIsSending(true);
    setActionError(null);
    try {
      const created = await campaigns.create({
        name: campaignName,
        audience: selectedAudience,
        audience_params: audienceParams,
        template_name: selectedTemplate.name,
        template_language: selectedTemplate.language,
        variable_mapping: variableMapping,
        carousel_cards: carouselCardsPayload,
        flow_id: attachFlow && selectedFlowId ? selectedFlowId : undefined,
      });
      // Attach follow-up steps before the first send goes out - step 0
      // (above) is unaffected either way, but a step can only be added
      // while the campaign is still draft.
      for (const step of draftSteps) {
        await campaigns.addStep(created.id, step);
      }
      await campaigns.send(created.id);
      setDraftSteps([]);
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

              {/* Something's down right now - proactive outreach within 5
                  minutes of an incident keeps 3-4x more customers than
                  letting them discover it themselves. One click into what's
                  already built below - no new backend, just skips straight
                  to "everyone." */}
              <button
                type="button"
                onClick={() => {
                  setCampaignName(`Incident update - ${new Date().toLocaleDateString("en-IN")}`);
                  setSelectedAudience("all_customers");
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl bg-red-500/[0.06] hover:bg-red-500/[0.12] border border-red-500/20 text-red-400 text-xs font-semibold transition-all cursor-pointer"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                Something&apos;s down - send an incident update to everyone
              </button>

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

                {selectedAudience === "by_tag" && (
                  <div className="mt-2.5">
                    {availableTags.length > 0 ? (
                      <select
                        value={audienceTag}
                        onChange={(e) => setAudienceTag(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                      >
                        <option value="">Choose a tag...</option>
                        {availableTags.map((t) => (
                          <option key={t} value={t}>{t}</option>
                        ))}
                      </select>
                    ) : (
                      <p className="text-[11px] text-os-text-dim">
                        No confirmed tags yet - tag a customer from the Customers page first.
                      </p>
                    )}
                  </div>
                )}
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

              {/* Optional: this template has a FLOW-type button attached to a
                  published flow (set up in Meta's own WhatsApp Manager) - name
                  which flow it opens so a completion can be matched back. */}
              {publishedFlows.length > 0 && (
                <div>
                  <label className="flex items-center gap-2 text-[11px] text-os-text-dim cursor-pointer mb-1.5">
                    <input
                      type="checkbox"
                      checked={attachFlow}
                      onChange={(e) => { setAttachFlow(e.target.checked); if (!e.target.checked) setSelectedFlowId(""); }}
                    />
                    This template has a Flow button - open a WhatsApp Flow
                  </label>
                  {attachFlow && (
                    <select
                      value={selectedFlowId}
                      onChange={(e) => setSelectedFlowId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                    >
                      <option value="">Choose the flow this button opens...</option>
                      {publishedFlows.map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}

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

              {/* Carousel card variable mapping - each card fills its own {{n}} from the recipient's own ledger data */}
              {selectedTemplate?.is_carousel && cardMapping.length > 0 && (
                <div className="space-y-3">
                  <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                    Map Each Card&apos;s Variables:
                  </label>
                  {cardMapping.map((cardVars, cardIndex) =>
                    cardVars.length === 0 ? null : (
                      <div key={cardIndex} className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                        <span className="text-[10px] font-mono uppercase text-brass-bright">
                          Card {cardIndex + 1}
                        </span>
                        {cardVars.map((val, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <span className="text-xs font-mono text-os-text-dim w-10 shrink-0">
                              {`{{${i + 1}}}`}
                            </span>
                            <input
                              type="text"
                              value={val}
                              onChange={(e) =>
                                setCardMapping((prev) =>
                                  prev.map((card, ci) =>
                                    ci === cardIndex
                                      ? card.map((v, vi) => (vi === i ? e.target.value : v))
                                      : card,
                                  ),
                                )
                              }
                              placeholder="e.g. name, amount, due_date"
                              className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-brass focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    ),
                  )}
                </div>
              )}

              {/* Step 5: Optional follow-up steps - a drip sequence */}
              <div className="space-y-2.5">
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1.5">
                  5. Follow-up steps (optional):
                </label>
                <p className="text-[11px] text-os-text-dim -mt-1">
                  Each step re-checks the same audience before sending - someone who has since
                  paid, opted out, or replied drops out automatically.
                </p>

                {draftSteps.length > 0 && (
                  <div className="space-y-1.5">
                    {draftSteps.map((step, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px]"
                      >
                        <span className="flex items-center gap-1.5 text-os-text-dim font-mono">
                          <Clock3 className="w-3 h-3" />
                          Step {i + 1}: {step.delay_days}d after{" "}
                          {i === 0 ? "step 0" : `step ${i}`} if{" "}
                          {step.condition === "no_reply" ? "no reply" : "always"} →{" "}
                          <span className="text-white">{step.template_name}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeDraftStep(i)}
                          className="text-os-text-dim hover:text-red-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={newStepTemplate}
                      onChange={(e) => setNewStepTemplate(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none"
                    >
                      <option value="">Choose a template...</option>
                      {sendableTemplates.map((t) => (
                        <option key={t.id} value={t.name}>{t.name}</option>
                      ))}
                    </select>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min={1}
                        max={90}
                        value={newStepDelay}
                        onChange={(e) => setNewStepDelay(Math.max(1, Number(e.target.value) || 1))}
                        className="w-16 px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white font-mono focus:border-brass focus:outline-none"
                      />
                      <span className="text-[11px] text-os-text-dim">days later</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <select
                      value={newStepCondition}
                      onChange={(e) => setNewStepCondition(e.target.value as "always" | "no_reply")}
                      className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white focus:border-brass focus:outline-none"
                    >
                      <option value="no_reply">Only if no reply yet</option>
                      <option value="always">Always send</option>
                    </select>
                    <label className="flex items-center gap-1.5 text-[11px] text-os-text-dim cursor-pointer">
                      <input
                        type="checkbox"
                        checked={newStepStopOnReply}
                        onChange={(e) => setNewStepStopOnReply(e.target.checked)}
                      />
                      Stop the sequence for anyone who replies
                    </label>
                    <button
                      type="button"
                      onClick={addDraftStep}
                      disabled={!newStepTemplate}
                      className="px-3 py-1.5 rounded-lg bg-brass/15 hover:bg-brass/25 disabled:opacity-40 text-brass-bright text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" /> Add step
                    </button>
                  </div>
                </div>
              </div>

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

                  {/* Why anyone's skipped - the count above hides the reason
                      otherwise, and "not opted in" vs "no phone number" need
                      different fixes from the business. */}
                  {previewData.skipped_reasons.length > 0 && (
                    <div className="pt-1 space-y-1">
                      {Object.entries(
                        previewData.skipped_reasons.reduce<Record<string, number>>((acc, r) => {
                          acc[r.reason] = (acc[r.reason] || 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([reason, count]) => (
                        <p key={reason} className="text-[11px] text-amber-400/90 font-mono">
                          {count} · {reason}
                        </p>
                      ))}
                    </div>
                  )}

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

                      <button
                        type="button"
                        onClick={() => toggleCampaignSteps(camp.id)}
                        className="w-full text-left text-[11px] text-brass-bright hover:text-brass flex items-center gap-1 cursor-pointer pt-0.5"
                      >
                        <Clock3 className="w-3 h-3" />
                        {loadingStepsFor === camp.id
                          ? "Loading follow-ups..."
                          : stepsByCampaign[camp.id]
                          ? "Hide follow-ups"
                          : "Show follow-up steps"}
                      </button>

                      {stepsByCampaign[camp.id] && (
                        <div className="space-y-1.5 pt-0.5">
                          {stepsByCampaign[camp.id].length === 0 ? (
                            <p className="text-[11px] text-os-text-dim">No follow-up steps on this campaign.</p>
                          ) : (
                            stepsByCampaign[camp.id].map((step) => (
                              <div
                                key={step.id}
                                className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-white/[0.04] text-[10px] font-mono flex items-center justify-between gap-2"
                              >
                                <span className="text-os-text-dim truncate">
                                  Step {step.step_order} · {step.delay_days}d ·{" "}
                                  {step.condition === "no_reply" ? "no reply" : "always"} ·{" "}
                                  <span className="text-white">{step.template_name}</span>
                                </span>
                                <span className="shrink-0 text-seal-bright">
                                  {step.sent_count} sent
                                  {step.skipped_count > 0 && ` · ${step.skipped_count} skipped`}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      )}
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
              {draftSteps.length > 0 && (
                <p className="opacity-90">
                  Plus <strong>{draftSteps.length} follow-up step{draftSteps.length > 1 ? "s" : ""}</strong> scheduled
                  automatically - each only to whoever still matches this audience and hasn&apos;t replied, if set that way.
                </p>
              )}
              {attachFlow && selectedFlowId && (
                <p className="opacity-90">
                  Opens the flow <strong>{publishedFlows.find((f) => f.id === selectedFlowId)?.name}</strong> for
                  anyone who taps the template&apos;s Flow button.
                </p>
              )}
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
