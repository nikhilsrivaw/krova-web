"use client";

import { useEffect, useState } from "react";
import { channels, templates as templatesApi, type Template } from "@/lib/api";
import { Sheet } from "./Sheet";

/**
 * Whether the phone can send this template as it is: approved, not a carousel, every variable numbered and in the
 * body only (a send fills body {{1}}..{{n}}), no media header and no button that needs its own value.
 */
export function sendableHere(t: Template): boolean {
  if (!t.sendable || t.is_carousel) return false;
  if (!t.variables.every((v) => /^\d+$/.test(v))) return false;
  const parts = Array.isArray(t.components) ? (t.components as Record<string, unknown>[]) : [];
  for (const c of parts) {
    if (c.type === "HEADER" && (c.format !== "TEXT" || String(c.text ?? "").includes("{{"))) return false;
    if (c.type === "BUTTONS" && JSON.stringify(c.buttons ?? []).includes("{{")) return false;
  }
  return true;
}

const fill = (body: string, values: string[]) =>
  body.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => values[Number(n) - 1] || `[${n}]`);

/**
 * Send an approved WhatsApp template to one customer - how you reach someone whose 24-hour window has closed.
 * Pick a template, fill each {{n}}, see the message as it will arrive, send.
 */
export function TemplateSheet({
  open, phone, onClose, onSent,
}: { open: boolean; phone: string; onClose: () => void; onSent: (text: string) => void }) {
  const [list, setList] = useState<Template[] | null>(null);
  const [picked, setPicked] = useState<Template | null>(null);
  const [values, setValues] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || list) return;
    templatesApi.list().then((all) => setList(all.filter(sendableHere))).catch(() => setList([]));
  }, [open, list]);

  const close = () => { setPicked(null); setValues([]); setError(null); onClose(); };

  const choose = (t: Template) => {
    setPicked(t);
    setValues(t.variables.map(() => ""));
    setError(null);
  };

  const send = async () => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    try {
      await channels.sendTemplate(phone, picked.name, values.map((v) => v.trim()), picked.language);
      onSent(fill(picked.body_text || picked.name, values));
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send this template.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet open={open} title={picked ? picked.name : "Send a template"} onClose={close}>
      {!picked ? (
        list === null ? (
          <p className="text-xs text-os-text-dim">Loading…</p>
        ) : list.length === 0 ? (
          <p className="text-xs text-os-text-dim">
            No approved template that can be sent from the phone yet. Create one on the WhatsApp page on a computer -
            KROVA can write it for you there.
          </p>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-os-text-dim">
              The customer hasn&apos;t written in 24 hours, so WhatsApp only allows an approved template.
            </p>
            {list.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => choose(t)}
                className="w-full text-left p-3 rounded-xl bg-black/30 border border-os-border active:bg-white/[0.04]"
              >
                <p className="text-xs font-semibold text-os-ink">{t.name}</p>
                <p className="text-[11px] text-os-text-dim mt-0.5 line-clamp-2">{t.body_text}</p>
                <p className="text-[10px] font-mono text-os-text-dim mt-1">{t.category.toLowerCase()} · {t.language}</p>
              </button>
            ))}
          </div>
        )
      ) : (
        <div className="space-y-3">
          {picked.variables.map((v, i) => (
            <label key={v} className="block">
              <span className="block text-[10px] font-mono uppercase text-os-text-dim mb-1">{`{{${v}}}`}</span>
              <input
                value={values[i] ?? ""}
                onChange={(e) => setValues((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                className="w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none"
              />
            </label>
          ))}
          <div className="rounded-xl bg-teal/[0.08] border border-teal/25 p-3">
            <p className="text-[10px] font-mono uppercase text-teal-bright mb-1">They will get</p>
            <p className="text-xs text-os-ink whitespace-pre-wrap">{fill(picked.body_text || "", values)}</p>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setPicked(null)} className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-xs font-semibold text-os-text-dim">
              Back
            </button>
            <button
              type="button"
              onClick={send}
              disabled={busy || values.some((v) => !v.trim())}
              className="flex-1 py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40"
            >
              {busy ? "Sending…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </Sheet>
  );
}
