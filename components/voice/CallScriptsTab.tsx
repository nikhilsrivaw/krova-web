"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList, Plus, Trash2, X, ChevronDown, ChevronRight } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  callScripts,
  type CallScript,
  type CallScriptPurpose,
  type CallScriptResponseRow,
} from "@/lib/api";

const PURPOSE_LABEL: Record<CallScriptPurpose, string> = {
  lead_qualification: "Lead qualification (scored)",
  survey: "Survey / feedback (no score)",
};

export function CallScriptsTab() {
  const [scripts, setScripts] = useState<CallScript[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isCreating, setIsCreating] = useState(false);
  const [name, setName] = useState("");
  const [purpose, setPurpose] = useState<CallScriptPurpose>("survey");
  const [questions, setQuestions] = useState<string[]>([""]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, CallScriptResponseRow[]>>({});

  const loadData = async () => {
    try {
      setScripts(await callScripts.list());
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load scripts.");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const resetForm = () => {
    setName("");
    setPurpose("survey");
    setQuestions([""]);
    setIsCreating(false);
  };

  const handleCreate = async () => {
    const cleanQuestions = questions.map((q) => q.trim()).filter(Boolean);
    if (!name.trim() || cleanQuestions.length === 0) return;
    setIsSaving(true);
    setSaveError(null);
    try {
      const created = await callScripts.create({
        name: name.trim(),
        purpose,
        questions: cleanQuestions,
      });
      setScripts((prev) => [...prev, created]);
      resetForm();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not create script.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await callScripts.remove(id);
    setScripts((prev) => prev.filter((s) => s.id !== id));
  };

  const toggleExpand = async (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      return;
    }
    setExpandedId(id);
    if (!responses[id]) {
      try {
        const rows = await callScripts.responses(id);
        setResponses((prev) => ({ ...prev, [id]: rows }));
      } catch {
        setResponses((prev) => ({ ...prev, [id]: [] }));
      }
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Call Scripts</h3>
              <p className="text-xs text-os-text-dim">
                A fixed question list an outbound call works through - for lead qualification
                or a feedback survey. Attach one when launching a Call Campaign.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsCreating((v) => !v)}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-semibold border border-cyan-500/20 transition-all cursor-pointer flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> New script
          </button>
        </div>

        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}

        {isCreating && (
          <div className="p-4 rounded-xl bg-black/30 border border-white/[0.08] space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                  Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="New inquiry qualification"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                  Purpose
                </label>
                <select
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value as CallScriptPurpose)}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white font-mono focus:border-cyan-500 focus:outline-none"
                >
                  {(Object.keys(PURPOSE_LABEL) as CallScriptPurpose[]).map((p) => (
                    <option key={p} value={p}>
                      {PURPOSE_LABEL[p]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                Questions, in order
              </label>
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-[11px] text-os-text-dim w-4 shrink-0">{i + 1}.</span>
                    <input
                      type="text"
                      value={q}
                      onChange={(e) =>
                        setQuestions((prev) => prev.map((x, idx) => (idx === i ? e.target.value : x)))
                      }
                      placeholder="What's your budget for this?"
                      className="flex-1 px-3 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setQuestions((prev) => prev.filter((_, idx) => idx !== i))}
                        className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-os-text-dim hover:text-red-400 border border-white/[0.08] transition-all cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setQuestions((prev) => [...prev, ""])}
                className="mt-2 text-[11px] text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                + Add another question
              </button>
            </div>

            {saveError && <p className="text-[11px] text-red-400">{saveError}</p>}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCreate}
                disabled={isSaving || !name.trim() || !questions.some((q) => q.trim())}
                className="px-4 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold border border-cyan-500/30 transition-all cursor-pointer"
              >
                {isSaving ? "Saving…" : "Save script"}
              </button>
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-os-text-dim text-xs font-semibold border border-white/[0.08] transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {scripts.length === 0 && !isCreating && (
          <EmptyState
            icon={ClipboardList}
            title="No scripts yet"
            description="Build a fixed question list for lead qualification calls or a feedback survey."
          />
        )}

        {scripts.length > 0 && (
          <div className="space-y-2">
            {scripts.map((script) => (
              <div key={script.id} className="rounded-xl bg-black/20 border border-white/[0.06] overflow-hidden">
                <div className="p-3.5 flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleExpand(script.id)}
                    className="flex items-center gap-2 min-w-0 text-left cursor-pointer"
                  >
                    {expandedId === script.id ? (
                      <ChevronDown className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-os-text-dim shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-xs text-white truncate">{script.name}</p>
                      <p className="text-[11px] text-os-text-dim">
                        {script.questions.length} question{script.questions.length === 1 ? "" : "s"}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant={script.purpose === "lead_qualification" ? "cyan" : "amber"} dot>
                      {script.purpose === "lead_qualification" ? "Scored" : "Survey"}
                    </Badge>
                    <button
                      type="button"
                      onClick={() => handleDelete(script.id)}
                      className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-red-500/10 text-os-text-dim hover:text-red-400 border border-white/[0.08] transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {expandedId === script.id && (
                  <div className="px-3.5 pb-3.5 space-y-3 border-t border-white/[0.06] pt-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                        Questions
                      </p>
                      <ol className="list-decimal list-inside space-y-0.5">
                        {script.questions.map((q, i) => (
                          <li key={i} className="text-[11px] text-os-text-dim">
                            {q}
                          </li>
                        ))}
                      </ol>
                    </div>

                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-os-text-dim mb-1.5">
                        Responses ({(responses[script.id] || []).length})
                      </p>
                      {(responses[script.id] || []).length === 0 ? (
                        <p className="text-[11px] text-os-text-dim">
                          No completed calls yet for this script.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {(responses[script.id] || []).map((r) => (
                            <div key={r.id} className="p-3 rounded-lg bg-black/30 border border-white/[0.06]">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <p className="text-xs text-white">{r.customer_name || "Unknown caller"}</p>
                                {r.score !== null && (
                                  <Badge variant={r.score >= 70 ? "emerald" : r.score >= 40 ? "amber" : "rose"}>
                                    Score: {r.score}
                                  </Badge>
                                )}
                              </div>
                              {r.summary && <p className="text-[11px] text-os-text-dim mb-2">{r.summary}</p>}
                              <div className="space-y-1">
                                {Object.entries(r.answers).map(([q, a]) => (
                                  <p key={q} className="text-[11px]">
                                    <span className="text-os-text-dim">{q} </span>
                                    <span className="text-white">{a}</span>
                                  </p>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
