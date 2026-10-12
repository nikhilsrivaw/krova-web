"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Phone, PhoneOff } from "lucide-react";
import { ApiError, assignedToOther, calls, team, type CallState } from "@/lib/api";
import { PhoneField } from "@/components/team/PhoneField";
import { WrapUpForm } from "@/components/team/WrapUpForm";

/**
 * Call a customer from the app. Your own phone rings first; when you pick up you hear who it
 * is and the customer is dialled from the business number. Afterwards you write the call up -
 * one line and any promises - so what was said is never lost.
 *
 * `compact` renders only the button (for a list row); the panel opens inline below it.
 */

type Phase =
  | { kind: "idle" }
  | { kind: "starting" }
  | { kind: "call"; call: CallState }
  | { kind: "done"; filed: number }
  | { kind: "error"; code: string | null; message: string; teammate?: string };

const POLL_MS = 2000;

export function CallCustomer({
  customerId,
  customerName,
  tone = "dark",
  compact = false,
  onFinished,
}: {
  customerId: string;
  customerName?: string | null;
  tone?: "dark" | "light";
  compact?: boolean;
  onFinished?: () => void;
}) {
  const [phase, setPhase] = useState<Phase>({ kind: "idle" });
  const timer = useRef<number | null>(null);

  const stopPolling = () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      timer.current = null;
    }
  };
  useEffect(() => stopPolling, []);

  const poll = useCallback((id: string) => {
    timer.current = window.setTimeout(async () => {
      try {
        const next = await calls.get(id);
        setPhase({ kind: "call", call: next });
        if (next.state !== "ended") poll(id);
      } catch {
        poll(id); // a dropped request must not strand the panel
      }
    }, POLL_MS);
  }, []);

  const start = async () => {
    setPhase({ kind: "starting" });
    try {
      const call = await calls.start(customerId);
      setPhase({ kind: "call", call });
      poll(call.id);
    } catch (e) {
      const mate = assignedToOther(e);
      setPhase({
        kind: "error",
        code: e instanceof ApiError ? e.code : null,
        message: e instanceof Error ? e.message : "The call could not be started.",
        teammate: mate?.name,
      });
    }
  };

  const reset = () => {
    stopPolling();
    setPhase({ kind: "idle" });
  };

  const finish = (filed: number) => {
    setPhase({ kind: "done", filed });
    onFinished?.();
  };

  const light = tone === "light";
  const button = light
    ? "bg-os-card border-os-border text-os-ink"
    : "bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/25";
  const panel = light ? "bg-os-card border-os-border text-os-ink" : "bg-white/[0.03] border-white/[0.1] text-white";

  return (
    <div className={compact ? "" : "space-y-2"}>
      {(phase.kind === "idle" || phase.kind === "starting" || phase.kind === "done" || phase.kind === "error") && (
        <button
          type="button"
          disabled={phase.kind === "starting"}
          onClick={() => void start()}
          className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold disabled:opacity-50 cursor-pointer ${button}`}
        >
          <Phone className="h-3.5 w-3.5" />
          {phase.kind === "starting" ? "Calling…" : "Call"}
        </button>
      )}

      {phase.kind === "done" && (
        <p className="text-[11px] text-emerald-300">
          Saved{phase.filed ? ` - ${phase.filed} promise${phase.filed === 1 ? "" : "s"} added to the ledger` : ""}.
        </p>
      )}

      {phase.kind === "error" && (
        <div className={`space-y-2 rounded-xl border p-3 text-xs ${panel}`}>
          <p className="text-amber-200">
            {phase.teammate ? `This customer is with ${phase.teammate}.` : phase.message}
          </p>
          {phase.code === "no_member_phone" && <AddMyPhone onSaved={() => void start()} tone={tone} />}
          {phase.code === "assigned_to_other" && (
            <p className="text-[11px] text-os-text-dim">Take the chat over first if you need to call them.</p>
          )}
        </div>
      )}

      {phase.kind === "call" && (
        <div className={`space-y-3 rounded-xl border p-3 text-xs ${panel}`}>
          {phase.call.state === "ringing_you" && (
            <>
              <p className="flex items-center gap-2 font-semibold">
                <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                Your phone is ringing - pick up
              </p>
              <p className="text-[11px] text-os-text-dim">
                When you answer, you hear who it is and {customerName || "the customer"} is dialled from the business number.
              </p>
            </>
          )}
          {phase.call.state === "talking" && (
            <p className="flex items-center gap-2 font-semibold">
              <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
              On the call{customerName ? ` with ${customerName}` : ""}
            </p>
          )}
          {phase.call.state === "ended" && (
            <EndedCall call={phase.call} customerName={customerName} tone={tone} onDone={finish} onRetry={reset} />
          )}
        </div>
      )}
    </div>
  );
}

function EndedCall({
  call, customerName, tone, onDone, onRetry,
}: {
  call: CallState; customerName?: string | null; tone: "dark" | "light";
  onDone: (filed: number) => void; onRetry: () => void;
}) {
  // Never reached anyone: nothing to write up, just offer another try.
  if (call.answered_at === null) {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 font-semibold"><PhoneOff className="h-3.5 w-3.5" /> The call did not connect</p>
        <p className="text-[11px] text-os-text-dim">Your phone was not picked up, or the call could not be placed.</p>
        <button type="button" onClick={onRetry} className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-semibold cursor-pointer">Close</button>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      <p className="font-semibold">
        {call.reached_customer ? "Call ended" : `${customerName || "The customer"} did not pick up`}
        {call.duration_seconds ? ` - ${Math.max(1, Math.round(call.duration_seconds / 60))} min` : ""}
      </p>
      <WrapUpForm callId={call.id} customerName={customerName} tone={tone} onDone={onDone} />
      {!call.reached_customer && (
        <button type="button" onClick={onRetry} className="text-[11px] text-os-text-dim underline cursor-pointer">
          Skip notes and close
        </button>
      )}
    </div>
  );
}

function AddMyPhone({ onSaved, tone }: { onSaved: () => void; tone: "dark" | "light" }) {
  return (
    <PhoneField
      tone={tone}
      value={null}
      label="Your phone number (your phone rings first)"
      onSave={async (phone) => {
        const res = await team.setMyPhone(phone);
        if (res.phone) onSaved();
        return res.phone;
      }}
    />
  );
}
