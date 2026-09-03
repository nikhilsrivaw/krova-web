"use client";

import React, { useEffect, useState } from "react";
import { PhoneOutgoing, AlertTriangle } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  callCampaigns,
  type AudienceSegment,
  type AudienceKey,
  type CallCampaignPreview,
  type CallCampaign,
} from "@/lib/api";

const STATUS_VARIANT: Record<CallCampaign["status"], "emerald" | "amber" | "rose" | "cyan"> = {
  draft: "amber",
  sending: "cyan",
  sent: "emerald",
  paused: "amber",
  cancelled: "amber",
  failed: "rose",
};

export function CallCampaignsTab() {
  const [audiences, setAudiences] = useState<AudienceSegment[]>([]);
  const [pastCampaigns, setPastCampaigns] = useState<CallCampaign[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [audience, setAudience] = useState<AudienceKey | null>(null);
  const [tag, setTag] = useState("");
  const [gonequietDays, setGoneQuietDays] = useState("30");
  const [objective, setObjective] = useState("");

  const [previewData, setPreviewData] = useState<CallCampaignPreview | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const [a, c] = await Promise.all([callCampaigns.audiences(), callCampaigns.list()]);
      setAudiences(a);
      setPastCampaigns(c);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load call campaigns.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const audienceParams = (): Record<string, unknown> => {
    if (audience === "by_tag") return { tag };
    if (audience === "gone_quiet") return { days: Number(gonequietDays) || 30 };
    return {};
  };

  useEffect(() => {
    if (!audience || !objective.trim()) {
      setPreviewData(null);
      return;
    }
    if (audience === "by_tag" && !tag.trim()) {
      setPreviewData(null);
      return;
    }

    let cancelled = false;
    const run = async () => {
      setIsPreviewing(true);
      setPreviewError(null);
      try {
        const result = await callCampaigns.preview({
          name: name || "Untitled",
          audience,
          audience_params: audienceParams(),
          objective,
        });
        if (!cancelled) setPreviewData(result);
      } catch (err) {
        if (!cancelled) {
          setPreviewError(err instanceof Error ? err.message : "Could not preview this campaign.");
        }
      } finally {
        if (!cancelled) setIsPreviewing(false);
      }
    };
    const t = setTimeout(run, 400);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audience, tag, gonequietDays, objective]);

  const handleLaunch = async () => {
    if (!audience) return;
    setIsLaunching(true);
    setLaunchError(null);
    try {
      const created = await callCampaigns.create({
        name: name.trim() || "Untitled call campaign",
        audience,
        audience_params: audienceParams(),
        objective: objective.trim(),
      });
      await callCampaigns.send(created.id);
      setIsConfirmOpen(false);
      setName("");
      setAudience(null);
      setObjective("");
      setPreviewData(null);
      await loadData();
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : "Could not launch this call campaign.");
    } finally {
      setIsLaunching(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            Automated outbound calling in India needs a business number in the right
            TRAI-registered series (140 for promotional, 160 for BFSI-only transactional/service)
            plus DLT registration - neither is available as an instant purchase the way a regular
            local number is. This places calls on whatever voice number is currently connected;
            getting a compliant number connected is a separate step, coordinated directly with
            Plivo, not something done here.
          </p>
        </div>

        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}

        <GlassCard className="p-6 space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <PhoneOutgoing className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">New Call Campaign</h3>
              <p className="text-xs text-os-text-dim mt-0.5">
                Who to call, and why - the AI drafts the opening line from your objective.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
              Campaign name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Appointment reminders - this week"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
              Who to call
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {audiences.map((a) => (
                <button
                  key={a.value}
                  type="button"
                  onClick={() => setAudience(a.value)}
                  className={`px-3 py-2.5 rounded-lg text-xs font-semibold border text-left transition-all ${
                    audience === a.value
                      ? "bg-cyan-500/10 border-cyan-500/50 text-white"
                      : "bg-white/[0.02] border-white/[0.06] text-os-text-dim hover:text-white"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            {audience === "by_tag" && (
              <input
                type="text"
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder="Tag label"
                className="mt-2 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            )}
            {audience === "gone_quiet" && (
              <input
                type="number"
                value={gonequietDays}
                onChange={(e) => setGoneQuietDays(e.target.value)}
                placeholder="Days of silence"
                className="mt-2 w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
              />
            )}
          </div>

          <div>
            <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
              Objective - a brief, not a script
            </label>
            <textarea
              value={objective}
              onChange={(e) => setObjective(e.target.value)}
              rows={3}
              maxLength={500}
              placeholder="Remind them about their outstanding balance and offer to help them pay it"
              className="w-full px-4 py-2.5 rounded-xl bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none resize-none"
            />
            <p className="text-[11px] text-os-text-dim mt-1.5">
              The AI drafts the actual opening line from this plus what it knows about each
              customer - never invents a figure or date that isn't real.
            </p>
          </div>

          {previewError && <p className="text-xs text-red-400">{previewError}</p>}

          {previewData && (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] space-y-3">
              <div className="flex items-center gap-4 text-xs">
                <span className="text-white font-bold">{previewData.will_reach} to call</span>
                {previewData.will_skip > 0 && (
                  <span className="text-os-text-dim">{previewData.will_skip} skipped</span>
                )}
              </div>
              {previewData.sample.length > 0 && (
                <div className="space-y-1.5">
                  {previewData.sample.map((s) => (
                    <div key={s.customer_id} className="flex items-center justify-between text-[11px] font-mono text-os-text-dim">
                      <span>{s.name || "Unnamed"}</span>
                      <span>{s.phone_masked}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="pt-2 flex justify-end">
            <button
              type="button"
              disabled={!previewData || previewData.will_reach === 0 || isPreviewing}
              onClick={() => setIsConfirmOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold shadow-md shadow-cyan-600/20 cursor-pointer"
            >
              Review & Launch
            </button>
          </div>
        </GlassCard>
      </div>

      <div>
        <GlassCard className="p-6">
          <h4 className="text-sm font-bold text-white mb-4">Campaign History</h4>
          {pastCampaigns.length === 0 ? (
            <EmptyState
              icon={PhoneOutgoing}
              title="No call campaigns yet"
              description="Launched campaigns and their outcomes will show up here."
            />
          ) : (
            <div className="space-y-3">
              {pastCampaigns.map((c) => (
                <div key={c.id} className="p-3.5 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-white truncate">{c.name}</span>
                    <Badge variant={STATUS_VARIANT[c.status]} size="sm">{c.status}</Badge>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-[10px] font-mono text-os-text-dim">
                    <span>{c.recipients} total</span>
                    <span>{c.sent_count} placed</span>
                    <span>{c.failed_count} failed</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      <Modal
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        title="Launch this call campaign?"
        subtitle={`${previewData?.will_reach ?? 0} customers will be called shortly after you confirm`}
      >
        <div className="space-y-4">
          <div className="px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-200/90">
            Real calls will only place successfully once a compliant voice number is connected
            and has Plivo credits - see the notice above the campaign builder.
          </div>
          {launchError && <p className="text-xs text-red-400">{launchError}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleLaunch}
              disabled={isLaunching}
              className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-cyan-600 hover:bg-cyan-500 shadow-md cursor-pointer disabled:opacity-50"
            >
              {isLaunching ? "Launching..." : "Confirm & Launch"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
