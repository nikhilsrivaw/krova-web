"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, RotateCcw, Sparkles } from "lucide-react";
import { postCallRules, type RuleDraftOut, type RuleDraftTurn } from "@/lib/api";

type Rule = NonNullable<RuleDraftOut["rule"]>;

const EXAMPLES = [
  "Jo naya lead aaye usko turant WhatsApp bhejo, 1 din baad reply na kare to call karo",
  "Payment 3 din overdue ho jaye to customer ko payment link bhejo",
  "Complaint aaye to owner ko alert karo",
];

const formatWait = (s: number) =>
  s % 86400 === 0 ? `${s / 86400} day${s === 86400 ? "" : "s"}`
    : s % 3600 === 0 ? `${s / 3600} hour${s === 3600 ? "" : "s"}`
      : `${Math.round(s / 60)} min`;

/**
 * "Describe it": the owner says what they want in English or Hinglish, KROVA asks what is missing, then hands back
 * a rule that opens on the canvas unsaved - the owner reads it there and presses Save. Nothing is saved from here.
 */
export function DescribeRule({
  triggerLabel, actionLabel, onOpen,
}: {
  triggerLabel: Record<string, string>;
  actionLabel: Record<string, string>;
  onOpen: (rule: Rule) => void;
}) {
  const [turns, setTurns] = useState<RuleDraftTurn[]>([]);
  const [options, setOptions] = useState<string[]>([]);
  const [rule, setRule] = useState<Rule | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [left, setLeft] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  const send = async (text: string) => {
    const said = text.trim();
    if (!said || busy) return;
    const next: RuleDraftTurn[] = [...turns, { role: "owner", text: said.slice(0, 1000) }];
    setTurns(next);
    setInput("");
    setOptions([]);
    setRule(null);
    setError(null);
    setBusy(true);
    try {
      const out = await postCallRules.aiDraft(next.slice(-16));
      setTurns([...next, { role: "ai", text: out.text }]);
      setOptions(out.kind === "ask" ? out.options : []);
      setRule(out.kind === "rule" ? out.rule : null);
      setLeft(`${Math.max(0, out.limit - out.used)} of ${out.limit} AI replies left this month`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach KROVA - try again.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setTurns([]); setOptions([]); setRule(null); setError(null); setInput("");
  };

  return (
    <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Describe it, KROVA builds it</h3>
            <p className="text-xs text-os-text-dim">
              Say what should happen, in English or Hinglish. Nothing is saved until you check it and press Save.
            </p>
          </div>
        </div>
        {turns.length > 0 && (
          <button
            type="button"
            onClick={reset}
            className="shrink-0 flex items-center gap-1 text-[11px] text-os-text-dim hover:text-white cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" /> Start over
          </button>
        )}
      </div>

      {turns.length === 0 ? (
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => send(e)}
              className="text-left px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] text-os-text-dim hover:text-white cursor-pointer"
            >
              {e}
            </button>
          ))}
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {turns.map((t, i) => (
            <div key={i} className={`flex ${t.role === "owner" ? "justify-end" : "justify-start"}`}>
              <p
                className={`max-w-[85%] px-3 py-2 rounded-xl text-xs whitespace-pre-wrap break-words ${
                  t.role === "owner"
                    ? "bg-cyan-500/15 text-white border border-cyan-500/20"
                    : "bg-white/[0.05] text-white/90 border border-white/[0.08]"
                }`}
              >
                {t.text}
              </p>
            </div>
          ))}
          {busy && <p className="text-[11px] text-os-text-dim animate-pulse">KROVA is thinking…</p>}
          <div ref={endRef} />
        </div>
      )}

      {rule && (
        <div className="rounded-lg border border-white/[0.1] bg-black/40 p-3 space-y-2">
          <p className="text-[10px] uppercase tracking-wide text-os-text-dim">Draft rule{rule.name ? ` · ${rule.name}` : ""}</p>
          <p className="text-xs text-white">
            <span className="text-cyan-400 font-semibold">When</span> {triggerLabel[rule.trigger_type] ?? rule.trigger_type}
          </p>
          <ol className="space-y-1">
            {rule.steps.map((s, i) => (
              <li key={i} className="text-xs text-white/90">
                {i + 1}. {s.delay_seconds ? `Wait ${formatWait(s.delay_seconds)}, then ` : ""}
                {actionLabel[s.action_type] ?? s.action_type}
                {s.conditions && s.conditions.length > 0 && (
                  <span className="text-os-text-dim"> (only if {s.conditions.length} condition{s.conditions.length === 1 ? "" : "s"} hold)</span>
                )}
                {s.action_config?.stop_if && (
                  <span className="text-os-text-dim"> · stops if they {String(s.action_config.stop_if).split(",").join(" / ")}</span>
                )}
              </li>
            ))}
          </ol>
          <button
            type="button"
            onClick={() => onOpen(rule)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-semibold border border-cyan-500/30 cursor-pointer"
          >
            Open on canvas to check and save
          </button>
        </div>
      )}

      {options.length > 0 && !busy && (
        <div className="flex flex-wrap gap-2">
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => send(o)}
              className="px-3 py-1.5 rounded-full bg-white/[0.06] hover:bg-cyan-500/20 border border-white/[0.12] text-xs text-white cursor-pointer"
            >
              {o}
            </button>
          ))}
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex items-end gap-2"
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); }
          }}
          rows={1}
          maxLength={1000}
          placeholder={turns.length ? "Reply…" : "e.g. jo customer 30 din se nahi aaya usko offer bhejo"}
          className="flex-1 resize-none px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white placeholder:text-os-text-dim focus:border-cyan-500 focus:outline-none"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="p-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-default"
        >
          <ArrowUp className="w-4 h-4" />
        </button>
      </form>
      {left && <p className="text-[10px] text-os-text-dim">{left}</p>}
    </div>
  );
}
