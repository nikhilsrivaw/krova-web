"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare, Phone, Plus, Trash2, X } from "lucide-react";
import {
  account, crm, formatPaise, ledger,
  type CustomerDate, type CustomerNote, type CustomerSummary, type CustomerTag,
} from "@/lib/api";
import { appPath } from "@/lib/app-nav";

const field = "w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none";
const card = "rounded-2xl bg-os-card border border-os-border p-4 space-y-3";
const heading = "text-[10px] font-mono uppercase tracking-wide text-os-text-dim";

/**
 * One customer on the phone: who they are, what is open, and the CRM a person updates mid-conversation - stage,
 * tags, notes, key dates (which automations act on) and marketing consent. Every write is the same endpoint the
 * desktop Customers page uses.
 */
export default function AppCustomerPage() {
  const { customerId } = useParams<{ customerId: string }>();
  const router = useRouter();
  const [c, setC] = useState<CustomerSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [stages, setStages] = useState<string[]>([]);
  const [tags, setTags] = useState<CustomerTag[]>([]);
  const [notes, setNotes] = useState<CustomerNote[]>([]);
  const [dates, setDates] = useState<CustomerDate[]>([]);
  const [error, setError] = useState<string | null>(null);
  // Marketing consent is the owner's and admins' to change.
  const [isBoss, setIsBoss] = useState(false);

  const [newTag, setNewTag] = useState("");
  const [newNote, setNewNote] = useState("");
  const [dateForm, setDateForm] = useState<{ label: string; date: string; yearly: boolean } | null>(null);

  useEffect(() => {
    if (!customerId) return;
    account.profile().then((p) => setIsBoss(p.role === "owner" || p.role === "admin")).catch(() => {});
    ledger.customers({ customer_id: customerId, limit: 1 })
      .then((rows) => (rows[0] ? setC(rows[0]) : setLoadError("Customer not found.")))
      .catch((err) => setLoadError(err instanceof Error ? err.message : "Could not load this customer."));
    crm.pipelineStages().then((r) => setStages(r.stages)).catch(() => {});
    crm.tags(customerId).then((t) => setTags(t.filter((x) => x.status !== "rejected"))).catch(() => {});
    crm.notes(customerId).then(setNotes).catch(() => {});
    crm.dates(customerId).then(setDates).catch(() => {});
  }, [customerId]);

  // Every change: on failure, say so - the screen keeps what the server has.
  const run = async (fn: () => Promise<void>) => {
    setError(null);
    try { await fn(); } catch (err) { setError(err instanceof Error ? err.message : "That did not save."); }
  };

  if (loadError) return <p className="px-4 pt-10 text-center text-xs text-rose-400">{loadError}</p>;
  if (!c) return <div className="px-4 pt-5 max-w-md mx-auto"><div className="h-32 rounded-2xl bg-os-card animate-pulse" /></div>;

  const phone = c.identities.find((i) => i.kind === "phone")?.value;

  return (
    <div className="px-4 pt-3 pb-6 max-w-md mx-auto space-y-3">
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => router.back()} aria-label="Back" className="p-1.5 -ml-1.5 rounded-lg active:bg-white/[0.06]">
          <ArrowLeft className="w-4 h-4 text-os-ink" />
        </button>
        <h1 className="text-lg font-semibold text-os-ink truncate">{c.name || "Unnamed customer"}</h1>
      </div>

      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

      <div className={card}>
        <div className="space-y-1">
          {c.identities.map((i) => (
            <p key={`${i.kind}-${i.value}`} className="text-xs text-os-ink font-mono">
              <span className="text-os-text-dim">{i.kind}</span> {i.value}
            </p>
          ))}
        </div>
        <div className="flex gap-2">
          <a href={appPath(`/inbox/${c.id}`)} className="flex-1 py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold flex items-center justify-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Open chat
          </a>
          {phone && (
            <a href={`tel:${phone}`} className="flex-1 py-2.5 rounded-xl bg-white/[0.06] text-os-ink text-xs font-semibold flex items-center justify-center gap-1.5">
              <Phone className="w-3.5 h-3.5" /> Call from my phone
            </a>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3 pt-1">
          <div>
            <p className="text-base font-semibold text-os-ink font-mono">{formatPaise(c.outstanding_paise ?? 0)}</p>
            <p className="text-[10px] text-os-text-dim">Outstanding</p>
          </div>
          <div>
            <p className="text-base font-semibold text-os-ink font-mono">{c.open_commitments}</p>
            <p className="text-[10px] text-os-text-dim">Open promises</p>
          </div>
        </div>
        {c.summary && <p className="text-xs text-os-text-dim leading-relaxed">{c.summary}</p>}
      </div>

      <div className={card}>
        <p className={heading}>Stage</p>
        <select
          value={c.stage ?? ""}
          onChange={(e) => {
            const stage = e.target.value || null;
            run(async () => { const r = await crm.setStage(c.id, stage); setC({ ...c, stage: r.stage }); });
          }}
          className={field}
        >
          <option value="">No stage</option>
          {[...new Set([...(c.stage ? [c.stage] : []), ...stages])].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center justify-between gap-3 text-xs text-os-ink">
          <span>
            Marketing messages allowed
            <span className="block text-[10px] text-os-text-dim">
              {isBoss ? "Only tick this if they agreed. Offers skip everyone else." : "The owner or an admin sets this - it is their consent on record."}
            </span>
          </span>
          <input
            type="checkbox"
            disabled={!isBoss}
            checked={!!c.marketing_opt_in}
            onChange={(e) => {
              const on = e.target.checked;
              run(async () => { const r = await crm.setMarketingOptIn(c.id, on); setC({ ...c, marketing_opt_in: r.marketing_opt_in }); });
            }}
            className="w-5 h-5 accent-teal disabled:opacity-50"
          />
        </label>
      </div>

      <div className={card}>
        <p className={heading}>Tags</p>
        <div className="flex flex-wrap gap-1.5">
          {tags.length === 0 && <span className="text-xs text-os-text-dim">No tags yet.</span>}
          {tags.map((t) => (
            <span key={t.id} className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-full text-[11px] ${t.status === "suggested" ? "bg-amber-500/10 text-amber-200 border border-amber-400/30" : "bg-teal/10 text-teal-bright"}`}>
              {t.label}{t.status === "suggested" && " ?"}
              {t.status === "suggested" && (
                <button type="button" aria-label={`Confirm ${t.label}`} onClick={() => run(async () => { const r = await crm.confirmTag(t.id); setTags((p) => p.map((x) => (x.id === t.id ? r : x))); })} className="px-1 text-emerald-300">✓</button>
              )}
              <button type="button" aria-label={`Remove ${t.label}`} onClick={() => run(async () => { await crm.deleteTag(t.id); setTags((p) => p.filter((x) => x.id !== t.id)); })} className="p-0.5 text-os-text-dim">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const label = newTag.trim();
            if (!label) return;
            run(async () => { const t = await crm.addTag(c.id, label); setTags((p) => [...p, t]); setNewTag(""); });
          }}
          className="flex gap-2"
        >
          <input value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder="Add a tag" maxLength={60} className={field} />
          <button type="submit" disabled={!newTag.trim()} aria-label="Add tag" className="shrink-0 px-3 rounded-xl bg-white/[0.06] text-os-ink disabled:opacity-40"><Plus className="w-4 h-4" /></button>
        </form>
      </div>

      <div className={card}>
        <p className={heading}>Notes for the team</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const body = newNote.trim();
            if (!body) return;
            run(async () => { const n = await crm.addNote(c.id, body); setNotes((p) => [n, ...p]); setNewNote(""); });
          }}
          className="space-y-2"
        >
          <textarea value={newNote} onChange={(e) => setNewNote(e.target.value)} rows={2} placeholder="The customer never sees this" className={field} />
          <button type="submit" disabled={!newNote.trim()} className="w-full py-2 rounded-xl bg-white/[0.06] text-xs font-semibold text-os-ink disabled:opacity-40">Add note</button>
        </form>
        {notes.map((n) => (
          <div key={n.id} className="text-xs border-t border-os-border pt-2">
            <p className="text-os-ink whitespace-pre-wrap">{n.body}</p>
            <p className="text-[10px] text-os-text-dim mt-0.5">
              {n.author_name || "Someone"} · {new Date(n.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
            </p>
          </div>
        ))}
      </div>

      <div className={card}>
        <div className="flex items-center justify-between">
          <p className={heading}>Key dates</p>
          {!dateForm && (
            <button type="button" onClick={() => setDateForm({ label: "", date: "", yearly: false })} className="text-[11px] text-teal-bright font-semibold">+ Add</button>
          )}
        </div>
        {dates.length === 0 && !dateForm && <p className="text-xs text-os-text-dim">Birthday, renewal, AMC expiry - automations can remind on these.</p>}
        {dates.map((d) => (
          <div key={d.id} className="flex items-center justify-between text-xs">
            <span className="text-os-ink">
              {d.label} · {new Date(d.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: d.repeats_yearly ? undefined : "numeric" })}
              {d.repeats_yearly && <span className="text-os-text-dim"> · every year</span>}
            </span>
            <button type="button" aria-label={`Remove ${d.label}`} onClick={() => run(async () => { await crm.deleteDate(d.id); setDates((p) => p.filter((x) => x.id !== d.id)); })} className="p-1 text-os-text-dim">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {dateForm && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!dateForm.label.trim() || !dateForm.date) return;
              run(async () => {
                const d = await crm.addDate(c.id, { label: dateForm.label.trim(), date: dateForm.date, repeats_yearly: dateForm.yearly });
                setDates((p) => [...p, d]);
                setDateForm(null);
              });
            }}
            className="space-y-2"
          >
            <input value={dateForm.label} onChange={(e) => setDateForm({ ...dateForm, label: e.target.value })} placeholder="e.g. Birthday, Renewal" maxLength={60} className={field} />
            <input type="date" value={dateForm.date} onChange={(e) => setDateForm({ ...dateForm, date: e.target.value })} className={field} />
            <label className="flex items-center gap-2 text-xs text-os-ink">
              <input type="checkbox" checked={dateForm.yearly} onChange={(e) => setDateForm({ ...dateForm, yearly: e.target.checked })} className="w-4 h-4 accent-teal" />
              Comes every year
            </label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setDateForm(null)} className="flex-1 py-2 rounded-xl bg-white/[0.05] text-xs text-os-text-dim">Cancel</button>
              <button type="submit" disabled={!dateForm.label.trim() || !dateForm.date} className="flex-1 py-2 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">Save</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
