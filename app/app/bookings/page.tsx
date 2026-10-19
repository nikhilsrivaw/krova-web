"use client";

import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, MessageSquare, Plus } from "lucide-react";
import {
  scheduling,
  type Appointment, type AppointmentStatus, type Doctor, type SchedulingLabels, type Slot,
} from "@/lib/api";
import { appPath } from "@/lib/app-nav";
import { Sheet } from "@/components/app-shell/Sheet";
import { CustomerPicker } from "@/components/app-shell/CustomerPicker";
import { PaymentLinkButton } from "@/components/payments/PaymentLinkButton";

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const addDays = (key: string, n: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + n); return dayKey(d); };
const time = (iso: string) => new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

const LOOK: Record<AppointmentStatus, { label: string; cls: string }> = {
  requested: { label: "Awaiting confirmation", cls: "bg-amber-500/15 text-amber-300" },
  awaiting_deposit: { label: "Holding for deposit", cls: "bg-amber-500/15 text-amber-300" },
  confirmed: { label: "Confirmed", cls: "bg-cyan-500/15 text-cyan-300" },
  visited: { label: "Came", cls: "bg-emerald-500/15 text-emerald-300" },
  no_show: { label: "No-show", cls: "bg-rose-500/15 text-rose-300" },
  cancelled: { label: "Cancelled", cls: "bg-white/[0.06] text-os-text-dim" },
};

const field = "w-full px-3 py-2.5 rounded-xl bg-black/40 border border-os-border text-sm text-os-ink focus:border-teal focus:outline-none";

/** Open times for one provider on one day, as tappable chips. */
function SlotChips({ doctorId, date, picked, onPick }: { doctorId: string; date: string; picked: string | null; onPick: (s: string) => void }) {
  const [slots, setSlots] = useState<Slot[] | null>(null);
  useEffect(() => {
    if (!doctorId || !date) return;
    setSlots(null);
    scheduling.openSlots(doctorId, date).then(setSlots).catch(() => setSlots([]));
  }, [doctorId, date]);
  if (!doctorId || !date) return null;
  if (slots === null) return <p className="text-[11px] text-os-text-dim">Finding open times…</p>;
  if (slots.length === 0) return <p className="text-[11px] text-os-text-dim">No open times that day.</p>;
  return (
    <div className="flex flex-wrap gap-1.5">
      {slots.map((s) => (
        <button
          key={s.starts_at}
          type="button"
          onClick={() => onPick(s.starts_at)}
          className={`px-2.5 py-1.5 rounded-lg text-xs border ${picked === s.starts_at ? "bg-teal text-os-bg border-teal font-bold" : "bg-black/30 border-os-border text-os-ink"}`}
        >
          {time(s.starts_at)}
        </button>
      ))}
    </div>
  );
}

/**
 * The day's bookings on the phone: who is coming when, mark came / no-show, reschedule, cancel, take a payment,
 * and book someone into a real open slot - the same checks WhatsApp and voice bookings go through.
 */
export default function AppBookingsPage() {
  const [day, setDay] = useState(dayKey(new Date()));
  const [rows, setRows] = useState<Appointment[] | null>(null);
  const [labels, setLabels] = useState<SchedulingLabels | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const [moving, setMoving] = useState<{ id: string; doctorId: string; date: string; slot: string | null } | null>(null);
  const [cancelling, setCancelling] = useState<{ id: string; reason: string } | null>(null);
  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ customer: { id: string; name: string } | null; doctorId: string; date: string; slot: string | null; notes: string }>(
    { customer: null, doctorId: "", date: dayKey(new Date()), slot: null, notes: "" },
  );

  const load = useCallback(() => {
    scheduling.listAppointments({ from: addDays(day, -1), to: addDays(day, 2) })
      .then((all) => setRows(all.filter((a) => dayKey(new Date(a.starts_at)) === day)))
      .catch((err) => setError(err instanceof Error ? err.message : "Could not load bookings."));
  }, [day]);

  useEffect(() => { setRows(null); load(); }, [load]);
  useEffect(() => {
    scheduling.getLabels().then(setLabels).catch(() => {});
    scheduling.listDoctors().then((d) => setDoctors(d.filter((x) => x.active))).catch(() => {});
  }, []);

  const act = async (id: string, fn: () => Promise<Appointment>) => {
    setBusy(id); setError(null);
    try {
      const updated = await fn();
      setRows((prev) => prev?.map((a) => (a.id === id ? { ...updated, customer_name: a.customer_name } : a)) ?? prev);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That did not work.");
      return false;
    } finally { setBusy(null); }
  };

  const noun = labels?.booking_noun_plural ?? "Bookings";
  const today = dayKey(new Date());
  const title = day === today ? "Today" : day === addDays(today, 1) ? "Tomorrow" : day === addDays(today, -1) ? "Yesterday"
    : new Date(`${day}T12:00:00`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });
  const shown = (rows ?? []).filter((a) => a.status !== "cancelled");
  const cancelled = (rows ?? []).filter((a) => a.status === "cancelled");

  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-os-ink flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-teal" /> {noun}
        </h1>
        <button type="button" onClick={() => { setCreating(true); setDraft({ customer: null, doctorId: doctors[0]?.id ?? "", date: day, slot: null, notes: "" }); }}
          className="px-3 py-1.5 rounded-lg bg-teal/10 border border-teal/25 text-[11px] font-semibold text-teal flex items-center gap-1.5">
          <Plus className="w-3.5 h-3.5" /> New
        </button>
      </div>

      <div className="flex items-center justify-between rounded-xl bg-os-card border border-os-border px-2 py-1.5">
        <button type="button" aria-label="Previous day" onClick={() => setDay(addDays(day, -1))} className="p-2 text-os-text-dim"><ChevronLeft className="w-4 h-4" /></button>
        <button type="button" onClick={() => setDay(today)} className="text-sm font-semibold text-os-ink">{title}</button>
        <button type="button" aria-label="Next day" onClick={() => setDay(addDays(day, 1))} className="p-2 text-os-text-dim"><ChevronRight className="w-4 h-4" /></button>
      </div>

      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}

      {rows === null ? (
        <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 rounded-2xl bg-os-card animate-pulse" />)}</div>
      ) : shown.length === 0 ? (
        <p className="text-center text-xs text-os-text-dim py-10">Nothing booked {day === today ? "today" : "this day"}.</p>
      ) : (
        <div className="space-y-2">
          {shown.map((a) => {
            const look = LOOK[a.status];
            const isOpen = open === a.id;
            const done = a.status === "visited" || a.status === "no_show";
            return (
              <div key={a.id} className="rounded-2xl bg-os-card border border-os-border overflow-hidden">
                <button type="button" onClick={() => setOpen(isOpen ? null : a.id)} className="w-full text-left px-4 py-3 flex items-center gap-3">
                  <p className="w-[4.5rem] shrink-0 whitespace-nowrap text-xs font-semibold text-os-ink font-mono">{time(a.starts_at)}</p>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-os-ink truncate">{a.customer_name || "Customer"}</p>
                    <p className="text-[11px] text-os-text-dim truncate">{a.doctor_name}</p>
                  </div>
                  <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-semibold ${look.cls}`}>{look.label}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-1 border-t border-os-border space-y-2.5">
                    {a.notes && <p className="text-xs text-os-text-dim pt-2">{a.notes}</p>}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      {!done ? (
                        <>
                          <button type="button" disabled={busy === a.id} onClick={() => act(a.id, () => scheduling.setAppointmentStatus(a.id, "visited"))}
                            className="py-2.5 rounded-xl bg-emerald-500/15 border border-emerald-400/30 text-xs font-semibold text-emerald-200 disabled:opacity-40">They came</button>
                          <button type="button" disabled={busy === a.id} onClick={() => act(a.id, () => scheduling.setAppointmentStatus(a.id, "no_show"))}
                            className="py-2.5 rounded-xl bg-rose-500/10 border border-rose-400/30 text-xs font-semibold text-rose-200 disabled:opacity-40">No-show</button>
                        </>
                      ) : (
                        <button type="button" disabled={busy === a.id} onClick={() => act(a.id, () => scheduling.setAppointmentStatus(a.id, "confirmed"))}
                          className="col-span-2 py-2.5 rounded-xl bg-white/[0.05] text-xs font-semibold text-os-text-dim disabled:opacity-40">Undo - back to confirmed</button>
                      )}
                      {!done && (
                        <>
                          <button type="button" onClick={() => setMoving({ id: a.id, doctorId: a.doctor_id, date: day, slot: null })}
                            className="py-2.5 rounded-xl bg-white/[0.05] text-xs font-semibold text-os-ink">Reschedule</button>
                          <button type="button" onClick={() => setCancelling({ id: a.id, reason: "" })}
                            className="py-2.5 rounded-xl bg-white/[0.05] text-xs font-semibold text-os-text-dim">Cancel</button>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap items-start gap-2">
                      <PaymentLinkButton target={{ kind: "appointment", id: a.id }} askAmount compact />
                      <a href={appPath(`/inbox/${a.customer_id}`)} className="ml-auto px-2.5 py-1.5 rounded-lg bg-white/[0.06] text-[11px] font-semibold text-os-ink flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Open chat
                      </a>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {cancelled.length > 0 && <p className="text-[11px] text-os-text-dim text-center pt-1">{cancelled.length} cancelled</p>}
        </div>
      )}

      <Sheet open={!!moving} title="Reschedule" onClose={() => setMoving(null)}>
        {moving && (
          <div className="space-y-3">
            <input type="date" value={moving.date} min={today} onChange={(e) => setMoving({ ...moving, date: e.target.value, slot: null })} className={field} />
            <SlotChips doctorId={moving.doctorId} date={moving.date} picked={moving.slot} onPick={(s) => setMoving({ ...moving, slot: s })} />
            <p className="text-[11px] text-os-text-dim">The customer is not messaged by this - tell them, or have an automation do it.</p>
            <button type="button" disabled={!moving.slot || busy === moving.id}
              onClick={async () => { if (await act(moving.id, () => scheduling.rescheduleAppointment(moving.id, moving.slot as string))) { setMoving(null); load(); } }}
              className="w-full py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">Move it here</button>
          </div>
        )}
      </Sheet>

      <Sheet open={!!cancelling} title="Cancel this booking?" onClose={() => setCancelling(null)}>
        {cancelling && (
          <div className="space-y-3">
            <input value={cancelling.reason} onChange={(e) => setCancelling({ ...cancelling, reason: e.target.value })} placeholder="Reason (optional)" className={field} />
            <p className="text-[11px] text-os-text-dim">The slot is freed and your "appointment cancelled" automations run.</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setCancelling(null)} className="flex-1 py-2.5 rounded-xl bg-white/[0.05] text-xs text-os-text-dim">Keep it</button>
              <button type="button" disabled={busy === cancelling.id}
                onClick={async () => { if (await act(cancelling.id, () => scheduling.cancelAppointment(cancelling.id, cancelling.reason.trim() || undefined))) setCancelling(null); }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500/20 border border-rose-400/30 text-xs font-bold text-rose-100 disabled:opacity-40">Yes, cancel it</button>
            </div>
          </div>
        )}
      </Sheet>

      <Sheet open={creating} title={`New ${labels?.booking_noun ?? "booking"}`} onClose={() => setCreating(false)}>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!draft.customer || !draft.slot) return;
            setBusy("new"); setError(null);
            try {
              await scheduling.createAppointment({ doctor_id: draft.doctorId, customer_id: draft.customer.id, starts_at: draft.slot, notes: draft.notes.trim() || undefined });
              setCreating(false);
              setDay(draft.date);
              load();
            } catch (err) {
              setError(err instanceof Error ? err.message : "That slot may have just been taken - pick another.");
            } finally { setBusy(null); }
          }}
          className="space-y-3"
        >
          <CustomerPicker value={draft.customer} onChange={(c) => setDraft({ ...draft, customer: c })} />
          <select value={draft.doctorId} onChange={(e) => setDraft({ ...draft, doctorId: e.target.value, slot: null })} className={field}>
            <option value="">{labels?.provider ?? "Provider"}…</option>
            {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <input type="date" value={draft.date} min={today} onChange={(e) => setDraft({ ...draft, date: e.target.value, slot: null })} className={field} />
          <SlotChips doctorId={draft.doctorId} date={draft.date} picked={draft.slot} onPick={(s) => setDraft({ ...draft, slot: s })} />
          <input value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} placeholder="Notes (optional)" className={field} />
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <button type="submit" disabled={!draft.customer || !draft.slot || busy === "new"}
            className="w-full py-2.5 rounded-xl bg-teal text-os-bg text-xs font-bold disabled:opacity-40">
            {busy === "new" ? "Booking…" : "Book"}
          </button>
        </form>
      </Sheet>
    </div>
  );
}
