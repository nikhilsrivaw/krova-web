"use client";

import React, { useEffect, useState } from "react";
import { Blocks, Check } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { features, type FeatureInfo } from "@/lib/api";
import { FeatureTemplates } from "@/components/settings/FeatureTemplates";

/**
 * Which optional modules this business uses.
 *
 * A market type only sets the starting point (see capabilities_for in
 * shared/verticals/__init__.py) - a salon that also sells products, or a
 * distributor that takes appointments, should be able to say so. Changes are
 * batched behind one Save, because the sidebar reads its capabilities once
 * when the app loads: saving reloads the page so the menu matches, and one
 * reload for three switches beats three.
 */
export function FeaturesCard({ canEdit = true }: { canEdit?: boolean }) {
  const [items, setItems] = useState<FeatureInfo[] | null>(null);
  const [draft, setDraft] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = () =>
    features
      .list()
      .then(setItems)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load features."));

  useEffect(() => {
    let mounted = true;
    features
      .list()
      .then((rows) => mounted && setItems(rows))
      .catch((err) => mounted && setError(err instanceof Error ? err.message : "Could not load features."));
    return () => {
      mounted = false;
    };
  }, []);

  const wanted = (f: FeatureInfo) => (f.key in draft ? draft[f.key] : f.enabled);
  const changed = (items ?? []).filter((f) => wanted(f) !== f.enabled);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      for (const f of changed) {
        await features.set(f.key, wanted(f));
      }
      // The sidebar's capability list is fetched once on load.
      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save your changes.");
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="flex items-center gap-3 pb-4 border-b border-white/[0.06]">
        <div className="p-2 rounded-lg bg-brass/10 border border-brass/20 text-brass">
          <Blocks className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Features</h3>
          <p className="text-xs text-os-text-dim">
            What you started with depends on the kind of business you picked. Switch on anything else
            you use, or off anything you don&apos;t.
          </p>
          {!canEdit && (
            <p className="text-[11px] text-amber-300/90 mt-1">
              Only the owner or an admin can change these.
            </p>
          )}
        </div>
      </div>

      {error && (
        <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      {items === null && !error && (
        <p className="text-xs text-os-text-dim font-mono">Loading…</p>
      )}

      <div className="space-y-2.5">
        {(items ?? []).map((f) => {
          const on = wanted(f);
          return (
            <div key={f.key} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="text-xs font-bold text-white">{f.label}</h4>
                    {f.default && <Badge variant="cyan">Included with your type</Badge>}
                    {!f.default && f.enabled && <Badge variant="amber">Added by you</Badge>}
                  </div>
                  <p className="text-[11px] text-os-text-dim mt-1 leading-relaxed">{f.description}</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={on}
                  aria-label={`${f.label} ${on ? "on" : "off"}`}
                  onClick={() => setDraft((prev) => ({ ...prev, [f.key]: !on }))}
                  disabled={saving || !canEdit}
                  className={`relative shrink-0 w-10 h-5 rounded-full border transition-all cursor-pointer disabled:opacity-50 ${
                    on ? "bg-seal/70 border-seal" : "bg-white/[0.06] border-white/[0.12]"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${
                      on ? "left-[22px]" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              {on && (
                <div className="mt-2.5 pt-2.5 border-t border-white/[0.05] space-y-1">
                  <ul className="text-[11px] text-os-text-dim space-y-0.5">
                    {f.adds.map((line) => (
                      <li key={line} className="flex gap-1.5">
                        <Check className="w-3 h-3 mt-0.5 shrink-0 text-seal-bright" />
                        {line}
                      </li>
                    ))}
                  </ul>
                  {f.setup && (
                    <p className="text-[11px] text-amber-300/90">
                      <span className="font-semibold">One-time setup:</span> {f.setup}
                    </p>
                  )}
                </div>
              )}

              {/* Only for what is saved as on - a switch not yet saved sends nothing. */}
              {on && f.enabled && <FeatureTemplates feature={f} canEdit={canEdit} onChanged={reload} />}
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-end gap-3 pt-1">
        {changed.length > 0 && (
          <button
            type="button"
            onClick={() => setDraft({})}
            disabled={saving}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold text-os-text-dim hover:text-white cursor-pointer"
          >
            Undo
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={changed.length === 0 || saving || !canEdit}
          className="px-5 py-2 rounded-xl bg-brass hover:bg-brass-dim disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold transition-all shadow-md shadow-brass/20 cursor-pointer"
        >
          {saving
            ? "Saving…"
            : changed.length > 0
              ? `Save ${changed.length} change${changed.length === 1 ? "" : "s"}`
              : "No changes"}
        </button>
      </div>
    </GlassCard>
  );
}
