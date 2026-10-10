"use client";

import React, { useEffect, useState } from "react";
import { Phone, Plus, Trash2, Volume2 } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Skeleton } from "@/components/ui/EmptyState";
import { Badge } from "@/components/ui/Badge";
import { voice, type KeypadMenu, type KeypadOption } from "@/lib/api";

/**
 * The phone keypad menu: "press 1 to talk to our team, press 2 for our address,
 * press 0 for the owner". Announced right after the greeting; a caller who presses
 * nothing just talks to the AI as before, so this never removes that path.
 */

const ACTION_LABEL: Record<KeypadOption["action"], string> = {
  transfer: "Ring a phone number",
  say: "Say a message",
  ai: "Continue with the AI",
};

const FIELD =
  "w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none";

const DIGIT_ORDER = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

export function KeypadMenuCard() {
  const [menu, setMenu] = useState<KeypadMenu | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    voice
      .keypadMenu()
      .then(setMenu)
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load the menu."));
  }, []);

  if (error && !menu) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-sm font-bold text-white mb-1">Keypad menu</h3>
        <p className="text-xs text-os-text-dim">{error}</p>
      </GlassCard>
    );
  }
  if (!menu) return <Skeleton className="h-32 w-full" />;

  const change = (patch: Partial<KeypadMenu>) => {
    setMenu({ ...menu, ...patch });
    setSaved(false);
  };
  const changeOption = (index: number, patch: Partial<KeypadOption>) =>
    change({ options: menu.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) });

  const used = new Set(menu.options.map((o) => o.digit));
  const nextDigit = DIGIT_ORDER.find((d) => !used.has(d));

  const addKey = () => {
    if (!nextDigit) return;
    change({
      options: [...menu.options, { digit: nextDigit, label: "", action: "transfer", number: "", message: "" }],
    });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const { preview: _preview, ...body } = menu;
      void _preview;
      setMenu(await voice.saveKeypadMenu(body));
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the menu.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <GlassCard className="p-6 space-y-4">
      <div className="workspace-card-heading justify-between">
        <div className="flex min-w-0 flex-1 basis-64 items-start gap-3">
          <div className="shrink-0 p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
            <Phone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white">Keypad menu</h3>
            <p className="text-xs text-os-text-dim">
              Let callers press a key: ring your team, hear a fixed message, or stay with the AI.
              Callers who press nothing still talk to the AI.
            </p>
          </div>
        </div>
        <label className="flex items-center gap-2 text-xs text-white shrink-0 cursor-pointer">
          <input
            type="checkbox"
            checked={menu.enabled}
            onChange={(e) => change({ enabled: e.target.checked })}
          />
          {menu.enabled ? <Badge variant="emerald" dot>On</Badge> : <Badge variant="amber" dot>Off</Badge>}
        </label>
      </div>

      <div className="space-y-2">
        {menu.options.length === 0 && (
          <p className="text-xs text-os-text-dim">
            No keys yet. Add one, for example key 1 → ring your sales team.
          </p>
        )}
        {menu.options.map((option, index) => (
          <div key={index} className="p-3 rounded-xl bg-black/20 border border-white/[0.06] space-y-2">
            <div className="grid gap-2 sm:grid-cols-[5rem_1fr_12rem_auto] items-start">
              <select
                value={option.digit}
                onChange={(e) => changeOption(index, { digit: e.target.value })}
                className={FIELD}
                aria-label="Key"
              >
                {DIGIT_ORDER.filter((d) => d === option.digit || !used.has(d)).map((d) => (
                  <option key={d} value={d}>
                    Press {d}
                  </option>
                ))}
              </select>
              <input
                value={option.label}
                onChange={(e) => changeOption(index, { label: e.target.value })}
                placeholder='Name, e.g. "our sales team"'
                maxLength={60}
                className={FIELD}
                aria-label="Name"
              />
              <select
                value={option.action}
                onChange={(e) => changeOption(index, { action: e.target.value as KeypadOption["action"] })}
                className={FIELD}
                aria-label="What it does"
              >
                {(Object.keys(ACTION_LABEL) as KeypadOption["action"][]).map((a) => (
                  <option key={a} value={a}>
                    {ACTION_LABEL[a]}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => change({ options: menu.options.filter((_, i) => i !== index) })}
                className="p-2 rounded-lg bg-white/[0.04] hover:bg-red-500/20 text-os-text-dim hover:text-red-400 border border-white/[0.08] cursor-pointer"
                aria-label="Remove this key"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            {option.action === "transfer" && (
              <input
                type="tel"
                value={option.number ?? ""}
                onChange={(e) => changeOption(index, { number: e.target.value })}
                placeholder="+91 98765 43210"
                className={`${FIELD} font-mono`}
                aria-label="Phone number to ring"
              />
            )}
            {option.action === "say" && (
              <textarea
                value={option.message ?? ""}
                onChange={(e) => changeOption(index, { message: e.target.value })}
                placeholder="What the agent reads out, e.g. our address and opening hours"
                maxLength={400}
                rows={2}
                className={FIELD}
                aria-label="Message"
              />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addKey}
          disabled={!nextDigit}
          className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 disabled:opacity-40 text-cyan-400 text-xs font-semibold border border-cyan-500/20 flex items-center gap-1.5 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" /> Add a key
        </button>
      </div>

      <div>
        <label className="block text-xs font-mono uppercase text-os-text-dim mb-2">
          What callers hear (optional)
        </label>
        <textarea
          value={menu.intro}
          onChange={(e) => change({ intro: e.target.value })}
          placeholder="Leave blank to build it from the keys above"
          maxLength={400}
          rows={2}
          className={FIELD}
        />
        {menu.preview && (
          <p className="mt-2 flex items-start gap-1.5 text-[11px] text-os-text-dim">
            <Volume2 className="w-3.5 h-3.5 shrink-0 mt-px" />
            <span>After the greeting: “{menu.preview}”</span>
          </p>
        )}
        <p className="mt-2 text-[11px] text-os-text-dim">
          If you do not give key 0 a job here, it keeps reaching the staff number from Settings.
        </p>
      </div>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
          {error}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-black text-xs font-bold cursor-pointer"
        >
          {saving ? "Saving…" : "Save menu"}
        </button>
        {saved && <span className="text-xs text-emerald-400">Saved. New calls use it straight away.</span>}
      </div>
    </GlassCard>
  );
}
