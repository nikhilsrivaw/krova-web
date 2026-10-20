"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Ticket, UserPlus } from "lucide-react";
import {
  queue as queueApi, scheduling,
  type Doctor, type QueueEntry, type QueueLabels, type QueueStatus, type Shift, type ShiftSession,
} from "@/lib/api";
import { Sheet } from "@/components/app-shell/Sheet";
import { CustomerPicker } from "@/components/app-shell/CustomerPicker";
import { PaymentLinkButton } from "@/components/payments/PaymentLinkButton";
import { EditFees, FeePicker, useFeeRows } from "@/components/fees/FeePicker";

const SHIFTS: Shift[] = ["morning", "evening", "emergency"];
const POLL_MS = 15000;
const field = "w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none";

/**
 * The walk-in queue from the counter phone: open or close a shift, call the next person, mark done or skipped,
 * check someone in. Refreshes on its own, so kiosk and WhatsApp check-ins show up without a reload.
 * The words (token / table, patient / guest, the shift names) are the business's own.
 */
export default function AppQueuePage() {
  const [entries, setEntries] = useState<QueueEntry[] | null>(null);
  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [labels, setLabels] = useState<QueueLabels | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [checking, setChecking] = useState(false);
  const [draft, setDraft] = useState<{ shift: Shift | ""; customer: { id: string; name: string } | null; doctorId: string; feeIds: string[] }>(
    { shift: "", customer: null, doctorId: "", feeIds: [] },
  );
  const feeRows = useFeeRows();
  const replace = (updated: QueueEntry) => setEntries((prev) => prev?.map((x) => (x.id === updated.id ? updated : x)) ?? prev);

  const load = useCallback(async () => {
    try {
      const [rows, s] = await Promise.all([queueApi.list(), queueApi.listShifts()]);
      setEntries(rows);
      setShifts(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the queue.");
    }
  }, []);

  useEffect(() => {
    load();
    queueApi.getSettings().then((s) => setLabels(s.labels)).catch(() => {});
    scheduling.listDoctors().then((d) => setDoctors(d.filter((x) => x.active))).catch(() => {});
    const t = setInterval(load, POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const openSession = useMemo(() => {
    const map = new Map(shifts.filter((s) => !s.closed_at).map((s) => [s.shift, s]));
    return (shift: Shift) => map.get(shift) || null;
  }, [shifts]);

  const shiftName = (s: Shift) => labels?.shifts?.[s] ?? s;
  const ticket = labels?.ticket ?? "token";
  const person = labels?.person ?? "customer";

  const toggleShift = async (shift: Shift) => {
    setBusy(shift); setError(null);
    try {
      const session = openSession(shift);
      if (session) {
        const closed = await queueApi.closeShift(session.id);
        setShifts((prev) => prev.map((s) => (s.id === closed.id ? closed : s)));
      } else {
        const opened = await queueApi.openShift(shift);
        setShifts((prev) => [...prev.filter((s) => s.id !== opened.id), opened]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change that shift.");
    } finally { setBusy(null); }
  };

  const move = async (id: string, status: QueueStatus) => {
    setBusy(id); setError(null);
    try {
      const updated = await queueApi.update(id, status);
      setEntries((prev) => prev?.map((e) => (e.id === id ? { ...updated, customer_name: e.customer_name } : e)) ?? prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update this.");
    } finally { setBusy(null); }
  };

  const all = entries ?? [];
  const serving = all.filter((e) => e.status === "in_consultation");
  const waiting = all.filter((e) => e.status === "waiting").sort((a, b) => (a.shift === b.shift ? a.queue_number - b.queue_number : SHIFTS.indexOf(a.shift) - SHIFTS.indexOf(b.shift)));
  const finished = all.filter((e) => e.status === "done" || e.status === "skipped").length;
  const openShifts = SHIFTS.filter((s) => openSession(s));
  const who = (e: QueueEntry) => e.customer_name || (e.customer_id ? `Unnamed ${person}` : "Walk-in");
  const doctor = (id: string | null) => (id ? doctors.find((d) => d.id === id)?.name : null);

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2"><Ticket className="w-4 h-4 text-teal" /> Queue</h1>
        <button type="button" disabled={openShifts.length === 0}
          onClick={() => { setChecking(true); setDraft({ shift: openShifts[0] ?? "", customer: null, doctorId: "", feeIds: [] }); }}
          className="px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/25 text-[11px] font-semibold text-teal flex items-center gap-1.5 disabled:opacity-40">
          <UserPlus className="w-3.5 h-3.5" /> Check in
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {SHIFTS.map((s) => {
          const on = !!openSession(s);
          return (
            <button key={s} type="button" disabled={busy === s} onClick={() => toggleShift(s)}
              className={`py-2.5 rounded-xl border text-[11px] font-semibold disabled:opacity-40 ${on ? "bg-emerald-500/15 border-emerald-400/30 text-emerald-200" : "bg-os-card border-os-border text-os-text-dim"}`}>
              {shiftName(s)}
              <span className="block text-[9px] font-normal opacity-80">{on ? "Open · tap to close" : "Closed · tap to open"}</span>
            </button>
          );
        })}
      </div>
      {openShifts.length === 0 && <p className="text-[11px] text-os-text-dim">Open a shift before checking anyone in.</p>}
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

      {serving.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-mono uppercase tracking-wide text-os-text-dim">{labels?.serving ?? "Being served"}</p>
          {serving.map((e) => (
            <div key={e.id} className="rounded-2xl bg-teal/[0.08] border border-teal/30 p-3.5 flex items-center gap-3">
              <p className="text-xl font-bold text-teal-bright font-mono w-12">{e.queue_number}</p>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-os-ink truncate">{who(e)}</p>
                <p className="text-[10px] text-os-text-dim">{shiftName(e.shift)}{doctor(e.doctor_id) ? ` · ${doctor(e.doctor_id)}` : ""}</p>
                <EditFees kind="token" booking={e} rows={feeRows} onSaved={replace} />
              </div>
              <button type="button" disabled={busy === e.id} onClick={() => move(e.id, "done")}
                className="px-3.5 py-2 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">Done</button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-mono uppercase tracking-wide text-os-text-dim">Waiting · {waiting.length}</p>
        {entries === null ? (
          <div className="h-16 rounded-2xl bg-os-card animate-pulse" />
        ) : waiting.length === 0 ? (
          <p className="text-center text-xs text-os-text-dim py-6">Nobody waiting.</p>
        ) : (
          waiting.map((e, i) => (
            <div key={e.id} className="rounded-2xl bg-os-card border border-os-border p-3.5 space-y-2.5">
              <div className="flex items-center gap-3">
                <p className="text-lg font-bold text-os-ink font-mono w-12">{e.queue_number}</p>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-os-ink truncate">{who(e)}</p>
                  <p className="text-[10px] text-os-text-dim">
                    {shiftName(e.shift)}{doctor(e.doctor_id) ? ` · ${doctor(e.doctor_id)}` : ""} · since {new Date(e.checked_in_at).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
              </div>
              <EditFees kind="token" booking={e} rows={feeRows} onSaved={replace} />
              <div className="flex gap-2">
                <button type="button" disabled={busy === e.id} onClick={() => move(e.id, "in_consultation")}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold disabled:opacity-40 ${i === 0 ? "bg-teal text-os-bg" : "bg-white/[0.06] text-os-ink"}`}>
                  {i === 0 ? "Call next" : "Call"}
                </button>
                <button type="button" disabled={busy === e.id} onClick={() => move(e.id, "skipped")}
                  className="px-4 py-2 rounded-xl bg-white/[0.05] text-xs text-os-text-dim disabled:opacity-40">Skip</button>
              </div>
              <PaymentLinkButton target={{ kind: "token", id: e.id }} askAmount compact />
            </div>
          ))
        )}
      </div>
      {finished > 0 && <p className="text-center text-[11px] text-os-text-dim">{finished} finished today</p>}

      <Sheet open={checking} title={`Give a ${ticket}`} onClose={() => setChecking(false)}>
        <form
          onSubmit={async (ev) => {
            ev.preventDefault();
            if (!draft.shift) return;
            setBusy("check"); setError(null);
            try {
              const created = await queueApi.checkIn({
                shift: draft.shift, customer_id: draft.customer?.id, doctor_id: draft.doctorId || undefined,
                fee_ids: draft.feeIds.length ? draft.feeIds : undefined,
              });
              setEntries((prev) => [...(prev ?? []), { ...created, customer_name: draft.customer?.name ?? null }]);
              setChecking(false);
            } catch (err) {
              setError(err instanceof Error ? err.message : `Could not check this ${person} in.`);
            } finally { setBusy(null); }
          }}
          className="space-y-3"
        >
          <select value={draft.shift} onChange={(e) => setDraft({ ...draft, shift: e.target.value as Shift })} className={field}>
            {openShifts.map((s) => <option key={s} value={s}>{shiftName(s)}</option>)}
          </select>
          <CustomerPicker optional value={draft.customer} onChange={(c) => setDraft({ ...draft, customer: c })} />
          {doctors.length > 0 && (
            <select value={draft.doctorId} onChange={(e) => setDraft({ ...draft, doctorId: e.target.value })} className={field}>
              <option value="">Anyone</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          )}
          <FeePicker rows={feeRows} value={draft.feeIds} onChange={(feeIds) => setDraft({ ...draft, feeIds })} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={!draft.shift || busy === "check"} className="w-full py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">
            {busy === "check" ? "Checking in…" : `Give ${ticket}`}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
