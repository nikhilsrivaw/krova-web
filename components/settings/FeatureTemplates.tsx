"use client";

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, MessageSquare, XCircle } from "lucide-react";
import { features, type FeatureInfo, type FeatureTemplate } from "@/lib/api";

const STATUS: Record<FeatureTemplate["status"], { label: string; tone: string; Icon: typeof Clock3 }> = {
  approved: { label: "Approved", tone: "text-seal-bright", Icon: CheckCircle2 },
  pending: { label: "With Meta (up to 24h)", tone: "text-amber-300", Icon: Clock3 },
  rejected: { label: "Rejected", tone: "text-red-400", Icon: XCircle },
  missing: { label: "Not created", tone: "text-red-400", Icon: AlertTriangle },
  other: { label: "Not usable", tone: "text-amber-300", Icon: AlertTriangle },
};

/**
 * The WhatsApp templates a switched-on feature sends its messages as.
 *
 * Without an approved template each of these messages is silently skipped, so
 * the feature looks on and does nothing - this is where that stops being
 * invisible. Missing ones that KROVA can write itself are submitted in one
 * click; the rest say why they cannot be.
 */
export function FeatureTemplates({
  feature,
  canEdit,
  onChanged,
}: {
  feature: FeatureInfo;
  canEdit: boolean;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (feature.templates.length === 0) return null;

  const missingOneClick = feature.templates.filter((t) => t.one_click && t.status === "missing");
  const marketing = missingOneClick.filter((t) => t.category === "MARKETING");
  const allReady = feature.templates.every((t) => t.status === "approved");

  const create = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const res = await features.createTemplates(feature.key);
      const parts: string[] = [];
      if (res.created.length) parts.push(`${res.created.length} sent to Meta for review`);
      if (res.failed.length) parts.push(`${res.failed.length} refused: ${res.failed.map((f) => `${f.name} (${f.error})`).join("; ")}`);
      setMessage(parts.join(" - ") || "Nothing to create.");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the templates.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 pt-3 border-t border-white/[0.05] space-y-2">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-white/90">
        <MessageSquare className="w-3.5 h-3.5 text-teal-bright" />
        WhatsApp messages this sends
        {allReady && <span className="font-mono font-normal text-seal-bright">- all ready</span>}
      </div>
      {!allReady && (
        <p className="text-[11px] text-amber-300/90">
          Each message goes out as an approved Meta template. Until it is approved, that message is
          skipped without any error.
        </p>
      )}

      <ul className="space-y-1.5">
        {feature.templates.map((t) => {
          const state = STATUS[t.status];
          return (
            <li key={t.name} className="rounded-lg bg-black/20 border border-white/[0.05] px-3 py-2">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-[11px] text-white">{t.name}</span>
                  <span className="ml-2 text-[10px] font-mono text-os-text-dim">
                    {t.category === "MARKETING" ? "Marketing - Meta charges per message" : "Utility"}
                  </span>
                  <p className="text-[11px] text-os-text-dim">{t.purpose}</p>
                </div>
                <span className={`flex items-center gap-1 shrink-0 text-[10px] font-mono ${state.tone}`}>
                  <state.Icon className="w-3 h-3" />
                  {state.label}
                </span>
              </div>
              {t.status === "rejected" && t.rejection_reason && (
                <p className="text-[11px] text-red-300/90 mt-1">Meta said: {t.rejection_reason}</p>
              )}
              {t.status !== "approved" && t.note && (
                <p className="text-[11px] text-amber-300/90 mt-1">
                  {t.one_click ? "" : "Create this one yourself in WhatsApp Manager. "}
                  {t.note}
                </p>
              )}
              {t.status !== "approved" && (
                <details className="mt-1">
                  <summary className="text-[10px] font-mono text-os-text-dim cursor-pointer hover:text-white select-none">
                    Wording and what each number means
                  </summary>
                  <p className="text-[11px] text-white/80 mt-1 whitespace-pre-wrap">{t.body}</p>
                  <ul className="mt-1 text-[10px] font-mono text-os-text-dim">
                    {t.variables.map((v, i) => (
                      <li key={v}>
                        {`{{${i + 1}}}`} = {v}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </li>
          );
        })}
      </ul>

      {error && <p className="text-[11px] text-red-400">{error}</p>}
      {message && <p className="text-[11px] text-seal-bright">{message}</p>}

      {missingOneClick.length > 0 &&
        (feature.can_create_templates ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={create}
              disabled={busy || !canEdit}
              className="px-3.5 py-1.5 rounded-lg bg-teal/20 hover:bg-teal/30 border border-teal/40 text-white text-[11px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {busy ? "Sending to Meta…" : `Create the ${missingOneClick.length} missing for me`}
            </button>
            {marketing.length > 0 && (
              <p className="text-[10px] text-os-text-dim">
                {marketing.length} of these {marketing.length === 1 ? "is a promotion" : "are promotions"}, so
                Meta bills for every message sent with {marketing.length === 1 ? "it" : "them"}.
              </p>
            )}
            {!canEdit && <p className="text-[10px] text-os-text-dim">Only the owner or an admin can do this.</p>}
          </div>
        ) : (
          <p className="text-[11px] text-amber-300/90">
            Connect WhatsApp (Settings, Connected Channels) first - then KROVA can create the missing ones.
          </p>
        ))}
    </div>
  );
}
