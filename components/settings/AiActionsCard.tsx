"use client";

import React, { useEffect, useState } from "react";
import { Bot, Instagram, MessageSquare, PhoneCall } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/EmptyState";
import { aiActions, type AiActionChannel, type AiActionSettings } from "@/lib/api";

const CHANNELS: { key: AiActionChannel; label: string; icon: React.ElementType }[] = [
  { key: "voice", label: "Calls", icon: PhoneCall },
  { key: "whatsapp", label: "WhatsApp", icon: MessageSquare },
  { key: "instagram", label: "Instagram", icon: Instagram },
];
const CUTOFFS = [null, 1, 2, 4, 12, 24, 48];

/**
 * What the AI may change for a customer by itself, per channel - booking, cancelling or moving a booking, queue
 * tokens, orders. Every change is confirmed with the customer first by KROVA itself, and the team is told.
 * Rules: shared/ai/actions.py. Website chat never changes anything (its numbers are taken on trust).
 */
export function AiActionsCard({ canEdit = true }: { canEdit?: boolean }) {
  const [data, setData] = useState<AiActionSettings | null>(null);
  const [draft, setDraft] = useState<Record<string, AiActionChannel[]>>({});
  const [cutoff, setCutoff] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const take = (d: AiActionSettings) => {
    setData(d);
    setDraft(Object.fromEntries(d.actions.map((a) => [a.key, a.channels])));
    setCutoff(d.cutoff_hours);
  };
  useEffect(() => {
    aiActions.get().then(take).catch((e) => setError(e instanceof Error ? e.message : "Could not load."));
  }, []);

  const toggle = (key: string, channel: AiActionChannel) => {
    const now = draft[key] ?? [];
    setDraft({ ...draft, [key]: now.includes(channel) ? now.filter((c) => c !== channel) : [...now, channel] });
    setSaved(false);
  };
  const save = async () => {
    setSaving(true); setError(null);
    try { take(await aiActions.save({ actions: draft, cutoff_hours: cutoff })); setSaved(true); }
    catch (e) { setError(e instanceof Error ? e.message : "Could not save."); }
    finally { setSaving(false); }
  };

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-start gap-3 pb-4 border-b border-white/[0.06]">
        <div className="p-2 rounded-lg bg-teal/10 border border-teal/20 text-teal"><Bot className="w-5 h-5" /></div>
        <div>
          <h3 className="text-sm font-bold text-white">What the AI can do for customers</h3>
          <p className="text-[11px] text-os-text-dim mt-0.5 leading-relaxed">
            Tick where the AI may do each thing by itself. Before any change - cancelling, moving, ordering - it repeats it back
            and waits for the customer&apos;s &quot;yes&quot;. You get a notification for every change. Anything not ticked goes to your team.
          </p>
        </div>
      </div>

      {!data ? <Skeleton className="h-40 w-full" /> : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-os-text-dim">
                <th className="text-left font-semibold py-2 pr-3">The AI may…</th>
                {CHANNELS.map((c) => (
                  <th key={c.key} className="font-semibold py-2 px-2 w-28 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1"><c.icon className="w-3.5 h-3.5" />{c.label}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {data.actions.map((a) => (
                <tr key={a.key} className={a.available ? "" : "opacity-50"}>
                  <td className="py-2.5 pr-3 text-white">
                    {a.label}
                    {a.asks_to_confirm && <span className="ml-1.5 text-[10px] text-os-text-dim">· asks to confirm</span>}
                    {!a.available && (
                      <span className="block text-[10px] text-os-text-dim">
                        Switch on {a.key.includes("token") ? "the walk-in queue" : a.key.includes("order") ? "Orders and Price list & payments" : "Bookings"} in Features first.
                      </span>
                    )}
                  </td>
                  {CHANNELS.map((c) => (
                    <td key={c.key} className="py-2.5 px-2 text-center">
                      <input type="checkbox" className="w-4 h-4 accent-teal cursor-pointer disabled:cursor-not-allowed"
                        aria-label={`${a.label} on ${c.label}`} disabled={!canEdit || !a.available}
                        checked={(draft[a.key] ?? []).includes(c.key)} onChange={() => toggle(a.key, c.key)} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <label className="flex items-center justify-between gap-3 text-xs text-white">
        <span>
          Last time a booking can be cancelled or moved by the AI
          <span className="block text-[11px] text-os-text-dim">Closer than this to the booking, the AI hands it to your team instead.</span>
        </span>
        <select value={cutoff ?? ""} disabled={!canEdit}
          onChange={(e) => { setCutoff(e.target.value ? Number(e.target.value) : null); setSaved(false); }}
          className="px-2 py-1.5 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-teal focus:outline-none">
          {CUTOFFS.map((h) => <option key={h ?? "any"} value={h ?? ""}>{h ? `${h} hour${h === 1 ? "" : "s"} before` : "Any time"}</option>)}
        </select>
      </label>

      <p className="text-[11px] text-os-text-dim">Website chat only books - changes there always go to your team, because a visitor&apos;s number is not verified.</p>
      {error && <p className="text-xs text-red-400">{error}</p>}
      {canEdit && (
        <div className="flex items-center justify-end gap-3">
          {saved && <span className="text-[11px] text-emerald-400">Saved</span>}
          <button type="button" onClick={save} disabled={saving || !data}
            className="px-5 py-2 rounded-xl bg-brass hover:bg-brass-dim text-white text-xs font-bold disabled:opacity-50 cursor-pointer">
            {saving ? "Saving..." : "Save"}
          </button>
        </div>
      )}
    </GlassCard>
  );
}
