"use client";

import React, { useEffect, useState } from "react";
import { CalendarClock, CheckCircle2, Clock, Home, Phone, Repeat, UserX, Undo2, XCircle } from "lucide-react";
import { Drawer } from "@/components/ui/Drawer";
import { scheduling, type Appointment, type SchedulingLabels, type Slot } from "@/lib/api";
import { STATUS_LOOK, formatClock, formatDay, dayOf, todayKey } from "./calendarUtils";

type Props = {
  appointment: Appointment | null;
  labels: SchedulingLabels;
  color: string;
  customerName: string;
  propertyTitle: string | null;
  onClose: () => void;
  onChanged: (updated: Appointment) => void;
};

const CHANNEL_LABEL: Record<string, string> = {
  voice: "Phone call", whatsapp: "WhatsApp", manual: "Added by staff", web: "Website chat",
};

export function AppointmentDrawer({ appointment, labels, color, customerName, propertyTitle, onClose, onChanged }: Props) {
  const [mode, setMode] = useState<"view" | "reschedule" | "cancel">("view");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [date, setDate] = useState(todayKey());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [slot, setSlot] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  useEffect(() => {
    setMode("view");
    setError(null);
    setReason("");
    setSlot(null);
    if (appointment) setDate(dayOf(appointment.starts_at));
  }, [appointment?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!appointment || mode !== "reschedule") return;
    let live = true;
    setSlots([]);
    setSlot(null);
    scheduling.openSlots(appointment.doctor_id, date)
      .then((s) => { if (live) setSlots(s); })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load open times."); });
    return () => { live = false; };
  }, [appointment, mode, date]);

  const run = async (work: () => Promise<Appointment>) => {
    setBusy(true);
    setError(null);
    try {
      onChanged(await work());
      setMode("view");
    } catch (e) {
      setError(e instanceof Error ? e.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  };

  if (!appointment) return <Drawer isOpen={false} onClose={onClose} title="">{null}</Drawer>;

  const look = STATUS_LOOK[appointment.status];
  const started = new Date(appointment.starts_at).getTime() <= Date.now();
  const open = appointment.status === "confirmed" || appointment.status === "requested";
  const noun = labels.booking_noun;

  return (
    <Drawer
      isOpen
      onClose={onClose}
      title={customerName}
      subtitle={`${formatDay(dayOf(appointment.starts_at), { weekday: "long", day: "numeric", month: "long" })} · ${formatClock(appointment.starts_at)} – ${formatClock(appointment.ends_at)}`}
      width="sm"
    >
      <div className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold" style={{ background: look.fill, color: look.text }}>
            {look.label}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.05] px-2.5 py-1 text-[11px] text-os-text-dim">
            <span className="h-2 w-2 rounded-full" style={{ background: color }} />
            {appointment.doctor_name}
          </span>
        </div>

        <dl className="space-y-2.5 text-xs">
          <Row icon={<Clock className="h-3.5 w-3.5" />} label="When">
            {formatClock(appointment.starts_at)} – {formatClock(appointment.ends_at)}
          </Row>
          <Row icon={<Phone className="h-3.5 w-3.5" />} label="Booked through">
            {CHANNEL_LABEL[appointment.intake_channel] ?? appointment.intake_channel}
          </Row>
          {propertyTitle && (
            <Row icon={<Home className="h-3.5 w-3.5" />} label="Property">{propertyTitle}</Row>
          )}
          {appointment.notes && <Row icon={<CalendarClock className="h-3.5 w-3.5" />} label="Notes">{appointment.notes}</Row>}
        </dl>

        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>
        )}

        {mode === "view" && (
          <div className="space-y-2">
            {open && started && (
              <div className="grid grid-cols-2 gap-2">
                <ActionButton tone="emerald" disabled={busy} onClick={() => run(() => scheduling.setAppointmentStatus(appointment.id, "visited"))}>
                  <CheckCircle2 className="h-3.5 w-3.5" /> They came
                </ActionButton>
                <ActionButton tone="rose" disabled={busy} onClick={() => run(() => scheduling.setAppointmentStatus(appointment.id, "no_show"))}>
                  <UserX className="h-3.5 w-3.5" /> No-show
                </ActionButton>
              </div>
            )}
            {open && !started && (
              <ActionButton tone="emerald" disabled={busy} onClick={() => run(() => scheduling.setAppointmentStatus(appointment.id, "visited"))}>
                <CheckCircle2 className="h-3.5 w-3.5" /> Arrived early - mark as came
              </ActionButton>
            )}
            {(appointment.status === "visited" || appointment.status === "no_show") && (
              <ActionButton tone="neutral" disabled={busy} onClick={() => run(() => scheduling.setAppointmentStatus(appointment.id, "confirmed"))}>
                <Undo2 className="h-3.5 w-3.5" /> Undo - back to confirmed
              </ActionButton>
            )}
            {open && (
              <div className="grid grid-cols-2 gap-2">
                <ActionButton tone="neutral" disabled={busy} onClick={() => setMode("reschedule")}>
                  <Repeat className="h-3.5 w-3.5" /> Reschedule
                </ActionButton>
                <ActionButton tone="rose" disabled={busy} onClick={() => setMode("cancel")}>
                  <XCircle className="h-3.5 w-3.5" /> Cancel {noun}
                </ActionButton>
              </div>
            )}
            <p className="pt-1 text-[11px] text-os-text-dim">
              Tip: drag a {noun} to another time on the calendar to move it.
            </p>
          </div>
        )}

        {mode === "reschedule" && (
          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-wide text-os-text-dim">New date</label>
            <input
              type="date"
              value={date}
              min={todayKey()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {slots.length === 0 && <p className="text-xs text-os-text-dim">No open times that day.</p>}
              {slots.map((s) => (
                <button
                  key={s.starts_at}
                  type="button"
                  onClick={() => setSlot(s.starts_at)}
                  className={`rounded-lg border px-2.5 py-1 text-xs cursor-pointer ${
                    slot === s.starts_at ? "border-cyan-400 bg-cyan-400/15 text-cyan-300" : "border-white/[0.12] text-white hover:bg-white/[0.06]"
                  }`}
                >
                  {formatClock(s.starts_at)}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <ActionButton tone="primary" disabled={busy || !slot} onClick={() => slot && run(() => scheduling.rescheduleAppointment(appointment.id, slot))}>
                Move {noun}
              </ActionButton>
              <ActionButton tone="neutral" disabled={busy} onClick={() => setMode("view")}>Back</ActionButton>
            </div>
          </div>
        )}

        {mode === "cancel" && (
          <div className="space-y-3">
            <label className="block text-[10px] uppercase tracking-wide text-os-text-dim">Reason (optional)</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. customer asked to cancel"
              className="w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <p className="text-[11px] text-os-text-dim">
              The slot is freed. The customer is not messaged automatically - tell them yourself if needed.
            </p>
            <div className="flex gap-2">
              <ActionButton tone="rose" disabled={busy} onClick={() => run(() => scheduling.cancelAppointment(appointment.id, reason.trim() || undefined))}>
                Yes, cancel it
              </ActionButton>
              <ActionButton tone="neutral" disabled={busy} onClick={() => setMode("view")}>Keep it</ActionButton>
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 text-os-text-dim">{icon}</span>
      <div>
        <dt className="text-[10px] uppercase tracking-wide text-os-text-dim">{label}</dt>
        <dd className="text-white">{children}</dd>
      </div>
    </div>
  );
}

const TONES = {
  primary: "bg-cyan-500 text-black hover:bg-cyan-400 border-transparent",
  emerald: "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25 border-emerald-500/30",
  rose: "bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border-rose-500/30",
  neutral: "bg-white/[0.04] text-white hover:bg-white/[0.08] border-white/[0.12]",
};

function ActionButton({
  tone, disabled, onClick, children,
}: { tone: keyof typeof TONES; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`flex w-full items-center justify-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold disabled:opacity-50 cursor-pointer ${TONES[tone]}`}
    >
      {children}
    </button>
  );
}
