"use client";

import React, { useMemo, useState } from "react";
import { FlaskConical, ArrowRight, SkipForward, Clock } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import {
  postCallRules,
  CONDITION_FIELDS,
  type AutomationAction,
  type AutomationChannel,
  type AutomationStepConfig,
  type AutomationTestResult,
  type AutomationTrigger,
} from "@/lib/api";

/**
 * Try a rule before it goes live.
 *
 * A rule saved on this page is immediately live against real customers,
 * and there was no way to check one first. This asks the backend what the
 * rule *would* do against trigger data the business fills in, and shows
 * the answer per step - including the message text with its {{tokens}}
 * resolved, which is the other half of "why did my rule do that".
 *
 * The backend reuses its own condition evaluator and token resolver for
 * this, so the preview cannot drift from what actually runs. Nothing is
 * sent and nothing is written: there is deliberately no "run it for real
 * on one customer" mode, because for a tool whose actions message real
 * people, a dry run that can accidentally not be dry is worse than having
 * no dry run at all.
 */

const VERDICT: Record<
  AutomationTestResult["steps"][number]["verdict"],
  { label: string; variant: "emerald" | "outline" | "cyan"; icon: typeof ArrowRight }
> = {
  would_run: { label: "Would run", variant: "emerald", icon: ArrowRight },
  would_skip: { label: "Would skip", variant: "outline", icon: SkipForward },
  would_wait: { label: "Would wait", variant: "cyan", icon: Clock },
};

export function RuleTester({
  trigger,
  channel,
  steps,
  fieldLabel,
  fieldType,
  actionLabel,
}: {
  trigger: AutomationTrigger;
  channel: AutomationChannel | "";
  steps: AutomationStepConfig[];
  fieldLabel: Record<string, string>;
  fieldType: Record<string, "text" | "number" | "boolean">;
  actionLabel: Record<AutomationAction, string>;
}) {
  const fields = useMemo(() => CONDITION_FIELDS[trigger] ?? [], [trigger]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [result, setResult] = useState<AutomationTestResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setIsRunning(true);
    setError(null);
    try {
      // Only fields the business actually filled in are sent. A blank one
      // is left out rather than sent as "", so the result correctly shows
      // it as missing - which is exactly what would happen at runtime if
      // the trigger didn't carry it.
      const context: Record<string, string | number | boolean> = {};
      for (const field of fields) {
        const raw = values[field];
        if (raw === undefined || raw === "") continue;
        const kind = fieldType[field] ?? "text";
        context[field] =
          kind === "number" ? Number(raw) : kind === "boolean" ? raw === "true" : raw;
      }
      setResult(
        await postCallRules.test({
          trigger_type: trigger,
          channel: channel || null,
          steps,
          context,
        }),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not test this rule");
    } finally {
      setIsRunning(false);
    }
  };

  if (steps.length === 0) return null;

  return (
    <div className="p-4 rounded-xl bg-black/20 border border-white/[0.06] space-y-3">
      <div className="flex items-center gap-2">
        <FlaskConical className="w-3.5 h-3.5 text-cyan-400" />
        <p className="text-xs font-semibold text-white">Try it first</p>
      </div>
      <p className="text-[11px] text-os-text-dim leading-relaxed">
        Fill in what this trigger would carry and see what each step does. Nothing is sent.
      </p>

      {fields.length === 0 ? (
        <p className="text-[11px] text-os-text-dim">
          This trigger carries no data to filter on, so every step runs whenever it fires.
        </p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {fields.map((field) => {
            const kind = fieldType[field] ?? "text";
            return (
              <label key={field} className="space-y-1">
                <span className="text-[11px] text-os-text-dim">{fieldLabel[field] ?? field}</span>
                {kind === "boolean" ? (
                  <select
                    value={values[field] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.08] text-xs text-white cursor-pointer"
                  >
                    <option value="">Not set</option>
                    <option value="true">Yes</option>
                    <option value="false">No</option>
                  </select>
                ) : (
                  <input
                    type={kind === "number" ? "number" : "text"}
                    value={values[field] ?? ""}
                    onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                    placeholder="Leave blank to leave it out"
                    className="w-full px-2.5 py-1.5 rounded-lg bg-black/30 border border-white/[0.08] text-xs text-white placeholder:text-os-text-dim/60"
                  />
                )}
              </label>
            );
          })}
        </div>
      )}

      <button
        type="button"
        onClick={() => void run()}
        disabled={isRunning}
        className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-50 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer"
      >
        {isRunning ? "Checking..." : "See what would happen"}
      </button>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-[11px] text-red-400">
          {error}
        </div>
      )}

      {result && (
        <div className="space-y-2 pt-1">
          {result.missing_fields.length > 0 && (
            // Fails closed at runtime, so this is the difference between a
            // rule that does nothing and a rule the business thinks works.
            <div className="px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 leading-relaxed">
              You left {result.missing_fields.map((f) => fieldLabel[f] ?? f).join(", ")} blank. A
              step whose condition needs a value the trigger doesn&apos;t carry is always skipped -
              which is what would happen for real, too.
            </div>
          )}
          {result.steps.map((step) => {
            const verdict = VERDICT[step.verdict];
            const Icon = verdict.icon;
            return (
              <div
                key={step.position}
                className="p-3 rounded-lg bg-black/30 border border-white/[0.06] space-y-1.5"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <Icon className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
                    <span className="text-[11px] text-white truncate">
                      Step {step.position + 1} · {actionLabel[step.action_type] ?? step.action_type}
                    </span>
                  </div>
                  <Badge variant={verdict.variant}>{verdict.label}</Badge>
                </div>
                {step.detail && (
                  <p className="text-[11px] text-os-text-dim leading-relaxed">{step.detail}</p>
                )}
                {step.preview && (
                  <p className="text-[11px] text-white/80 leading-relaxed px-2.5 py-1.5 rounded-md bg-white/[0.04] border border-white/[0.06] whitespace-pre-wrap">
                    {step.preview}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
