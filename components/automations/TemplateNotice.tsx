"use client";

import React, { useState } from "react";
import { MessageSquare } from "lucide-react";
import { postCallRules, type AutomationTemplate } from "@/lib/api";

const STATE_TEXT: Record<string, string> = {
  missing: "not created yet",
  pending: "waiting for Meta's approval (can take up to a day)",
  rejected: "rejected by Meta",
  other: "not usable right now",
};

/**
 * "Send a WhatsApp follow-up" goes through one approved template. When it is not approved yet, say so where rules
 * are built - and let the owner submit it from here - instead of letting a rule save and then never send.
 */
export function TemplateNotice({ templates, canEdit, onChanged, compact = false }: {
  templates: AutomationTemplate[]; canEdit: boolean; onChanged: () => void; compact?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const t = templates.find((x) => x.name === "post_call_followup");
  if (!t || t.state === "approved") return null;

  const create = async () => {
    setBusy(true); setNote(null);
    try {
      const out = await postCallRules.createTemplates();
      setNote(out.failed.length ? `Meta refused it: ${out.failed[0].error}` : "Sent to Meta for approval.");
      onChanged();
    } catch (err) {
      setNote(err instanceof Error ? err.message : "Could not submit it.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`flex flex-wrap items-start gap-3 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] ${compact ? "p-2.5" : "p-4"}`}>
      <MessageSquare className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 text-[11px] text-amber-100 space-y-1">
        <p className="font-semibold text-amber-200">WhatsApp follow-ups will not send yet</p>
        <p>
          Steps that send a WhatsApp follow-up need one WhatsApp template approved by Meta. Yours is {STATE_TEXT[t.state] ?? t.state}
          {t.state === "rejected" && t.reason ? `: ${t.reason}` : ""}. Until then those steps are skipped.
        </p>
        {note && <p className="text-amber-200">{note}</p>}
      </div>
      {canEdit && (t.state === "missing" || t.state === "rejected") && (
        <button type="button" onClick={create} disabled={busy}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold cursor-pointer disabled:opacity-50">
          {busy ? "Sending..." : t.state === "rejected" ? "Submit again" : "Create it"}
        </button>
      )}
    </div>
  );
}
