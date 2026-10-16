"use client";

import React, { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/EmptyState";
import { knowledge, type KnowledgeTeamPerson } from "@/lib/api";

const MAX_PEOPLE = 10;
const input = "w-full p-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none";
const label = "block text-[10px] font-mono uppercase tracking-wide text-os-text-dim mb-1";
const blank: KnowledgeTeamPerson = { name: "", role: "", handles: "", languages: "" };

/**
 * The Team Card: who customers can ask for, how to reach you, languages, and when you reply. Customer-facing only:
 * the AI uses it to answer "who handles this" and "how do I reach you", never to promise a person is free.
 */
export function TeamCard({ onChanged }: { onChanged: () => void }) {
  const [loaded, setLoaded] = useState(false);
  const [contact, setContact] = useState("");
  const [languages, setLanguages] = useState("");
  const [responseNote, setResponseNote] = useState("");
  const [people, setPeople] = useState<KnowledgeTeamPerson[]>([]);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    knowledge.card().then((c) => {
      setContact(c.team.contact); setLanguages(c.team.languages); setResponseNote(c.team.response_note);
      setPeople(c.team.people.length ? c.team.people : [{ ...blank }]);
      setLoaded(true);
    }).catch((e) => setError(e instanceof Error ? e.message : "Could not load the team card."));
  }, []);

  const update = (i: number, patch: Partial<KnowledgeTeamPerson>) =>
    setPeople((prev) => prev.map((p, j) => (j === i ? { ...p, ...patch } : p)));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError(null); setSaved(false);
    try {
      await knowledge.saveTeamCard({
        contact, languages, response_note: responseNote,
        people: people.filter((p) => p.name.trim()),
      });
      setSaved(true);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  };

  if (error && !loaded) return <p className="text-xs text-red-400">{error}</p>;
  if (!loaded) return <Skeleton className="h-40 w-full" />;

  return (
    <form onSubmit={save} className="space-y-4">
      <GlassCard className="p-5 space-y-3">
        <div>
          <h4 className="text-sm font-bold text-white">Team card</h4>
          <p className="text-[11px] text-os-text-dim">
            Who customers can ask for and how to reach you. Short and customer-facing; the AI never promises that a person is free right now.
          </p>
        </div>
        <div>
          <label className={label} htmlFor="tc-contact">How to reach us</label>
          <input id="tc-contact" value={contact} onChange={(e) => setContact(e.target.value)} maxLength={250}
            placeholder="Example: Call or WhatsApp ... for sales; email ... for billing" className={input} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="tc-lang">Languages we reply in</label>
            <input id="tc-lang" value={languages} onChange={(e) => setLanguages(e.target.value)} maxLength={100} placeholder="Example: Hindi, English" className={input} />
          </div>
          <div>
            <label className={label} htmlFor="tc-resp">When we reply</label>
            <input id="tc-resp" value={responseNote} onChange={(e) => setResponseNote(e.target.value)} maxLength={200}
              placeholder="Example: within an hour, ... to ...; next morning after hours" className={input} />
          </div>
        </div>
      </GlassCard>

      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">People customers can ask for</span>
          <span className="text-[10px] font-mono text-os-text-dim">{people.filter((p) => p.name.trim()).length} of {MAX_PEOPLE}</span>
        </div>
        {people.map((p, i) => (
          <div key={i} className="grid grid-cols-1 md:grid-cols-[1fr_1fr_2fr_1fr_auto] gap-2 items-start">
            <input value={p.name} onChange={(e) => update(i, { name: e.target.value })} maxLength={40} placeholder="Name" className={input} />
            <input value={p.role} onChange={(e) => update(i, { role: e.target.value })} maxLength={60} placeholder="Role" className={input} />
            <input value={p.handles} onChange={(e) => update(i, { handles: e.target.value })} maxLength={150} placeholder="What they handle" className={input} />
            <input value={p.languages} onChange={(e) => update(i, { languages: e.target.value })} maxLength={60} placeholder="Languages" className={input} />
            <button type="button" onClick={() => setPeople((prev) => prev.filter((_, j) => j !== i))}
              className="p-2 text-os-text-dim hover:text-thread-bright cursor-pointer" aria-label="Remove person">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {people.length < MAX_PEOPLE && (
          <button type="button" onClick={() => setPeople((prev) => [...prev, { ...blank }])}
            className="px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs flex items-center gap-1 cursor-pointer">
            <Plus className="w-3.5 h-3.5" /> Add a person
          </button>
        )}
      </GlassCard>

      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className="px-5 py-2 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold cursor-pointer disabled:opacity-50">
          {busy ? "Saving..." : "Save team card"}
        </button>
        {saved && <span className="text-xs text-emerald-300">Saved. The AI uses it from the next message.</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </form>
  );
}
