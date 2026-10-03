"use client";

import { useEffect, useState } from "react";
import { commands, type CommandRecord, type RegistrySetting } from "@/lib/api";
import { ConfirmCard } from "./ConfirmCard";

/**
 * Business rules, editable from the app. Each change goes through a preview
 * and a confirm card before it is saved, the same path a typed command takes.
 */
export function SettingsControls({ canEdit }: { canEdit: boolean }) {
  const [settings, setSettings] = useState<RegistrySetting[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [pending, setPending] = useState<CommandRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () =>
    commands
      .settings()
      .then((list) => {
        setSettings(list);
        setDrafts({});
      })
      .catch(() => setError("Could not load business rules."));

  useEffect(() => {
    load();
  }, []);

  const propose = async (setting: RegistrySetting, value: unknown) => {
    setError(null);
    try {
      const record = await commands.preview("set_setting", { key: setting.key, value });
      setPending(record);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare this change.");
    }
  };

  const onDecided = (updated: CommandRecord) => {
    setPending(updated);
    if (updated.status === "done") load();
  };

  return (
    <section className="space-y-2.5">
      <p className="text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Business rules</p>

      <div className="rounded-2xl bg-os-card border border-os-border overflow-hidden">
        {settings.map((s, i) => (
          <div key={s.key} className={`px-4 py-3.5 ${i !== settings.length - 1 ? "border-b border-os-border" : ""}`}>
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-os-ink min-w-0">{s.label}</p>
              <SettingEditor
                setting={s}
                disabled={!canEdit}
                draft={drafts[s.key]}
                onDraft={(v) => setDrafts((d) => ({ ...d, [s.key]: v }))}
                onPropose={(value) => propose(s, value)}
              />
            </div>
          </div>
        ))}
        {settings.length === 0 && <p className="px-4 py-4 text-xs text-os-text-dim">Loading...</p>}
      </div>

      {!canEdit && <p className="text-[11px] text-os-text-dim">Sirf owner ya admin rules badal sakte hain.</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
      {pending && <ConfirmCard command={pending} onDecided={onDecided} />}
    </section>
  );
}

function SettingEditor({
  setting,
  disabled,
  draft,
  onDraft,
  onPropose,
}: {
  setting: RegistrySetting;
  disabled: boolean;
  draft: string | undefined;
  onDraft: (v: string) => void;
  onPropose: (value: unknown) => void;
}) {
  const inputClass =
    "w-24 px-2.5 py-1.5 rounded-lg bg-black/40 border border-os-border text-xs text-os-ink text-right focus:border-teal focus:outline-none disabled:opacity-40";

  if (setting.kind === "bool") {
    const on = Boolean(setting.value);
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onPropose(!on)}
        className={`px-3 py-1.5 rounded-lg text-xs font-bold disabled:opacity-40 ${on ? "bg-teal text-os-bg" : "bg-white/[0.06] text-os-ink"}`}
      >
        {on ? "Haan" : "Nahi"}
      </button>
    );
  }

  if (setting.kind === "choice") {
    return (
      <select
        disabled={disabled}
        value={String(setting.value)}
        onChange={(e) => onPropose(e.target.value)}
        className="px-2.5 py-1.5 rounded-lg bg-black/40 border border-os-border text-xs text-os-ink focus:border-teal focus:outline-none disabled:opacity-40"
      >
        {setting.choices.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    );
  }

  if (setting.kind === "int_list") {
    const current = Array.isArray(setting.value) ? setting.value.join(", ") : "";
    const value = draft ?? current;
    return (
      <div className="flex items-center gap-2">
        <input
          disabled={disabled}
          value={value}
          onChange={(e) => onDraft(e.target.value)}
          className={`${inputClass} w-28`}
          placeholder="24, 2"
        />
        <button
          type="button"
          disabled={disabled || draft === undefined}
          onClick={() => onPropose(value.split(",").map((x) => Number(x.trim())).filter((x) => !Number.isNaN(x)))}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-os-bg bg-teal disabled:opacity-40"
        >
          Set
        </button>
      </div>
    );
  }

  // int
  const value = draft ?? String(setting.value);
  return (
    <div className="flex items-center gap-2">
      <input
        type="number"
        disabled={disabled}
        min={setting.minimum ?? undefined}
        max={setting.maximum ?? undefined}
        value={value}
        onChange={(e) => onDraft(e.target.value)}
        className={inputClass}
      />
      <button
        type="button"
        disabled={disabled || draft === undefined}
        onClick={() => onPropose(Number(value))}
        className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-os-bg bg-teal disabled:opacity-40"
      >
        Set
      </button>
    </div>
  );
}
