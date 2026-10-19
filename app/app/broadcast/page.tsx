"use client";

import { useEffect, useState } from "react";
import { Megaphone } from "lucide-react";
import {
  account, campaigns, crm, templates as templatesApi,
  type CampaignPreview, type CampaignRequest, type Template,
} from "@/lib/api";
import { sendableHere } from "@/components/app-shell/TemplateSheet";

// What a {{n}} can be filled with - each recipient's own value (shared/campaigns/audience.py).
const FIELDS: { key: string; label: string }[] = [
  { key: "customer_name", label: "Their name" },
  { key: "amount", label: "Amount they owe" },
  { key: "due_date", label: "When it is due" },
  { key: "description", label: "What it is for" },
];
const field = "w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none";

/**
 * Send one approved template to everyone with a tag, from the phone - see who it reaches and who is skipped (no
 * phone, no marketing consent), try it on your own number, then send. Follow-up steps and the other audiences stay
 * on the desktop Campaigns page. Owner and admins only, like campaigns everywhere.
 */
export default function AppBroadcastPage() {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tags, setTags] = useState<string[]>([]);
  const [list, setList] = useState<Template[]>([]);
  const [tag, setTag] = useState("");
  const [tpl, setTpl] = useState<Template | null>(null);
  const [mapping, setMapping] = useState<string[]>([]);
  const [preview, setPreview] = useState<CampaignPreview | null>(null);
  const [myNumber, setMyNumber] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    account.profile().then((p) => setAllowed(p.role === "owner" || p.role === "admin")).catch(() => setAllowed(false));
    crm.allTags().then(setTags).catch(() => {});
    templatesApi.list().then((all) => setList(all.filter(sendableHere))).catch(() => {});
  }, []);

  useEffect(() => { setPreview(null); setConfirming(false); setNote(null); }, [tag, tpl, mapping]);

  const request = (audience: "by_tag" | "numbers"): CampaignRequest => ({
    name: `${tpl?.name ?? "Broadcast"} to ${audience === "numbers" ? "my number (test)" : tag}`,
    audience,
    audience_params: audience === "numbers" ? { numbers: [myNumber.trim()] } : { tag },
    template_name: tpl?.name ?? "",
    template_language: tpl?.language,
    variable_mapping: mapping,
  });

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key); setError(null); setNote(null);
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : "That did not work."); } finally { setBusy(null); }
  };

  const send = (audience: "by_tag" | "numbers") => run(audience, async () => {
    const created = await campaigns.create(request(audience));
    const done = await campaigns.send(created.id);
    setNote(audience === "numbers"
      ? "Test sent to your number - check how it looks on WhatsApp."
      : `Sending to ${done.recipients} people. Progress shows on the Campaigns page.`);
    setConfirming(false);
  });

  if (allowed === false) {
    return <p className="px-4 pt-10 text-center text-xs text-os-text-dim">Broadcasts are for the owner and admins.</p>;
  }

  const ready = !!tag && !!tpl && mapping.every(Boolean);

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><Megaphone className="w-4 h-4 text-teal" /> Quick broadcast</h1>
      <p className="text-[11px] text-os-text-dim">One approved template to everyone with a tag. A broadcast can&apos;t be taken back - test it on your own number first.</p>

      <label className="block space-y-1">
        <span className="text-[10px] font-mono uppercase text-os-text-dim">Who</span>
        <select value={tag} onChange={(e) => setTag(e.target.value)} className={field}>
          <option value="">Choose a tag…</option>
          {tags.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {tags.length === 0 && <span className="block text-[11px] text-os-text-dim">No tags yet - tag customers on their screen first.</span>}
      </label>

      <label className="block space-y-1">
        <span className="text-[10px] font-mono uppercase text-os-text-dim">Message</span>
        <select value={tpl?.id ?? ""} onChange={(e) => {
          const t = list.find((x) => x.id === e.target.value) ?? null;
          setTpl(t);
          setMapping(t ? t.variables.map(() => "customer_name") : []);
        }} className={field}>
          <option value="">Choose an approved template…</option>
          {list.map((t) => <option key={t.id} value={t.id}>{t.name} ({t.category.toLowerCase()})</option>)}
        </select>
      </label>
      {tpl && (
        <div className="rounded-xl bg-black/30 border border-os-border p-3 space-y-2">
          <p className="text-xs text-os-ink whitespace-pre-wrap">{tpl.body_text}</p>
          {tpl.variables.map((v, i) => (
            <label key={v} className="flex items-center gap-2 text-xs text-os-text-dim">
              <span className="font-mono w-10">{`{{${v}}}`}</span>
              <select value={mapping[i] ?? ""} onChange={(e) => setMapping((m) => m.map((x, j) => (j === i ? e.target.value : x)))}
                className="flex-1 px-2.5 py-2 rounded-lg bg-black/40 border border-os-border text-xs text-os-ink">
                {FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
              </select>
            </label>
          ))}
        </div>
      )}

      <button type="button" disabled={!ready || busy !== null}
        onClick={() => run("preview", async () => setPreview(await campaigns.preview(request("by_tag"))))}
        className="w-full py-2.5 rounded-xl bg-white/[0.06] text-xs font-semibold text-os-ink disabled:opacity-40">
        {busy === "preview" ? "Checking…" : "Check who it reaches"}
      </button>

      {preview && (
        <div className="rounded-2xl bg-os-card border border-os-border p-4 space-y-2">
          <p className="text-sm text-os-ink"><span className="font-semibold">{preview.will_reach}</span> will get it · {preview.will_skip} skipped</p>
          {preview.skipped_reasons.slice(0, 3).map((r, i) => <p key={i} className="text-[11px] text-os-text-dim">Skipped: {r.reason}</p>)}
          {preview.sample[0] && <p className="text-xs text-os-text-dim whitespace-pre-wrap border-t border-os-border pt-2">{preview.sample[0].message_preview}</p>}
          {preview.cost_note && <p className="text-[11px] text-amber-200">{preview.cost_note}</p>}
          {preview.daily_limit_note && <p className="text-[11px] text-amber-200">{preview.daily_limit_note}</p>}

          <div className="flex gap-2 pt-1">
            <input value={myNumber} onChange={(e) => setMyNumber(e.target.value)} inputMode="tel" placeholder="Your number, +91…" className={field} />
            <button type="button" disabled={!myNumber.trim() || busy !== null} onClick={() => send("numbers")}
              className="shrink-0 px-3 rounded-xl bg-white/[0.06] text-xs font-semibold text-os-ink disabled:opacity-40">
              {busy === "numbers" ? "…" : "Test"}
            </button>
          </div>

          {!confirming ? (
            <button type="button" disabled={preview.will_reach === 0 || busy !== null} onClick={() => setConfirming(true)}
              className="w-full py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">Send to {preview.will_reach}</button>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-amber-100">Send &quot;{tpl?.name}&quot; to {preview.will_reach} people now? This can&apos;t be undone.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirming(false)} className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-xs text-os-text-dim">Cancel</button>
                <button type="button" disabled={busy !== null} onClick={() => send("by_tag")} className="flex-1 py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">
                  {busy === "by_tag" ? "Sending…" : "Yes, send"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      {note && <p className="text-xs text-emerald-300">{note}</p>}
      {error && <p className="text-xs text-rose-400">{error}</p>}
    </div>
  );
}
