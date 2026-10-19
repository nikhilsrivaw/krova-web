"use client";

import { useEffect, useState } from "react";
import { Zap } from "lucide-react";
import {
  account, postCallRules,
  type AutomationRule, type AutomationRunLog, type AutomationRunStatus,
} from "@/lib/api";

const RUN: Record<AutomationRunStatus, { label: string; cls: string }> = {
  ran: { label: "Ran", cls: "text-emerald-300" },
  no_action: { label: "Nothing to do", cls: "text-os-text-dim" },
  skipped: { label: "Skipped", cls: "text-amber-300" },
  queued: { label: "Waiting", cls: "text-cyan-300" },
  failed: { label: "Failed", cls: "text-rose-300" },
};

// "lead.received" -> "Lead received": enough to recognise a rule that was never named.
const triggerWords = (t: string) => {
  const s = t.replace(/[._]/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Automations from the phone: switch a rule off (or back on) in a hurry, and see what each one actually did -
 * every step, including the skipped ones with their reason. Building and editing rules stays on the desktop canvas.
 */
export default function AppAutomationsPage() {
  const [rules, setRules] = useState<AutomationRule[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [runs, setRuns] = useState<Record<string, AutomationRunLog[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    account.profile().then((p) => setCanEdit(p.role === "owner" || p.role === "admin")).catch(() => {});
    postCallRules.list().then(setRules).catch((err) => setError(err instanceof Error ? err.message : "Could not load automations."));
  }, []);

  const toggle = async (rule: AutomationRule) => {
    setBusy(rule.id); setError(null);
    try {
      // The update replaces the whole rule - send it back unchanged except is_active.
      const updated = await postCallRules.update(rule.id, {
        name: rule.name ?? null, trigger_type: rule.trigger_type, is_active: !rule.is_active,
        channel: rule.channel ?? null, reentry_days: rule.reentry_days ?? null, steps: rule.steps,
      });
      setRules((prev) => prev?.map((r) => (r.id === rule.id ? updated : r)) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change this rule.");
    } finally { setBusy(null); }
  };

  const expand = (id: string) => {
    setOpen(open === id ? null : id);
    if (!runs[id]) postCallRules.runs({ rule_id: id, limit: 15 }).then((h) => setRuns((p) => ({ ...p, [id]: h.runs }))).catch(() => {});
  };

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><Zap className="w-4 h-4 text-teal" /> Automations</h1>
      <p className="text-[11px] text-os-text-dim">Switch a rule off or on, and see what it did. Build and edit rules on a computer.</p>
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {rules === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-os-card animate-pulse" />)}</div>
      ) : rules.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-10">No automations yet.</p>
      ) : (
        <div className="space-y-2">
          {rules.map((r) => (
            <div key={r.id} className="rounded-2xl bg-os-card border border-os-border overflow-hidden">
              <div className="flex items-center gap-3 px-4 py-3">
                <button type="button" onClick={() => expand(r.id)} className="min-w-0 flex-1 text-left">
                  <p className={`text-sm truncate ${r.is_active ? "text-os-ink" : "text-os-text-dim"}`}>{r.name || triggerWords(r.trigger_type)}</p>
                  <p className="text-[10px] text-os-text-dim">{r.steps.length} step{r.steps.length === 1 ? "" : "s"}{r.is_active ? "" : " · paused"}</p>
                </button>
                {canEdit && (
                  <button type="button" role="switch" aria-checked={r.is_active} aria-label={r.is_active ? "Pause" : "Turn on"}
                    disabled={busy === r.id} onClick={() => toggle(r)}
                    className={`shrink-0 w-11 h-6 rounded-full p-0.5 transition-colors disabled:opacity-40 ${r.is_active ? "bg-teal" : "bg-white/[0.12]"}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${r.is_active ? "translate-x-5" : ""}`} />
                  </button>
                )}
              </div>
              {open === r.id && (
                <div className="px-4 pb-3 border-t border-os-border space-y-1.5 pt-2">
                  {!runs[r.id] ? (
                    <p className="text-[11px] text-os-text-dim">Loading…</p>
                  ) : runs[r.id].length === 0 ? (
                    <p className="text-[11px] text-os-text-dim">It hasn&apos;t run recently.</p>
                  ) : (
                    runs[r.id].map((x) => (
                      <div key={x.id} className="text-[11px]">
                        <span className={RUN[x.status].cls}>{RUN[x.status].label}</span>
                        <span className="text-os-text-dim"> · step {x.step_position + 1} · {new Date(x.occurred_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</span>
                        {x.detail && <p className="text-os-text-dim leading-snug">{x.detail}</p>}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
