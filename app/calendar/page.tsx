"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import { TimeGrid, type GridColumn } from "@/components/calendar/TimeGrid";
import { MonthGrid } from "@/components/calendar/MonthGrid";
import { AppointmentDrawer } from "@/components/calendar/AppointmentDrawer";
import { NewBookingModal, type BookingSeed } from "@/components/calendar/NewBookingModal";
import {
  STATUS_LOOK,
  addDays,
  addMonths,
  dayOf,
  fetchRange,
  formatClock,
  formatDay,
  formatMinutes,
  minutesOf,
  providerColor,
  rangeTitle,
  todayKey,
  weekDays,
  type Availability,
} from "@/components/calendar/calendarUtils";
import {
  account,
  ledger,
  properties as propertiesApi,
  scheduling,
  type Appointment,
  type Capability,
  type CustomerSummary,
  type Doctor,
  type Property,
  type SchedulingLabels,
  type Slot,
} from "@/lib/api";

type View = "day" | "week" | "month";

const DEFAULT_LABELS: SchedulingLabels = {
  provider: "Provider", provider_plural: "Providers", credential_label: "Details", fee_label: "Fee",
  booking_noun: "booking", booking_noun_plural: "bookings",
};

const VIEW_KEY = "krova.calendar.view";

function savedView(): View {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    if (v === "day" || v === "week" || v === "month") return v;
  } catch {
    // storage can be blocked; fall through to the default
  }
  return window.innerWidth < 768 ? "day" : "week";
}

export default function CalendarPage() {
  const [view, setView] = useState<View>("week");
  const [anchor, setAnchor] = useState(todayKey());
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [labels, setLabels] = useState<SchedulingLabels>(DEFAULT_LABELS);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState<string | null>(null);
  const [loadingRange, setLoadingRange] = useState(false);
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  const [showCancelled, setShowCancelled] = useState(false);
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [selected, setSelected] = useState<Appointment | null>(null);
  const [seed, setSeed] = useState<BookingSeed>(null);
  const [pendingMove, setPendingMove] = useState<{ appointment: Appointment; slot: Slot } | null>(null);
  const [moving, setMoving] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  const today = todayKey();

  useEffect(() => {
    setView(savedView());
  }, []);

  const changeView = (next: View) => {
    setView(next);
    try {
      window.localStorage.setItem(VIEW_KEY, next);
    } catch {
      // per-viewer convenience only
    }
  };

  const say = useCallback((tone: "ok" | "bad", text: string) => {
    setToast({ tone, text });
    window.setTimeout(() => setToast(null), 4000);
  }, []);

  // Things that do not change with the date.
  useEffect(() => {
    (async () => {
      const [profile, docs, lab, cust] = await Promise.allSettled([
        account.profile(), scheduling.listDoctors(), scheduling.getLabels(), ledger.customers(),
      ]);
      if (lab.status === "rejected") {
        setUnavailable("Calendar needs the Scheduling feature, which is not switched on for this business.");
        setReady(true);
        return;
      }
      setLabels(lab.value);
      if (docs.status === "fulfilled") setDoctors(docs.value.filter((d) => d.active));
      if (cust.status === "fulfilled") setCustomers(cust.value);
      if (profile.status === "fulfilled" && (profile.value.capabilities as Capability[]).includes("property_listings")) {
        propertiesApi.list().then(setProperties).catch(() => undefined);
      }
      setReady(true);
    })();
  }, []);

  // The bookings in view.
  const loadRange = useCallback(async () => {
    const { from, to } = fetchRange(view, anchor);
    setLoadingRange(true);
    try {
      setAppointments(await scheduling.listAppointments({ from, to }));
    } catch (e) {
      say("bad", e instanceof Error ? e.message : "Could not load the calendar.");
    } finally {
      setLoadingRange(false);
    }
  }, [view, anchor, say]);

  useEffect(() => {
    if (ready && !unavailable) void loadRange();
  }, [ready, unavailable, loadRange]);

  const visibleDoctors = useMemo(() => doctors.filter((d) => !hidden.has(d.id)), [doctors, hidden]);

  // Working hours, fetched once per provider that is on screen.
  useEffect(() => {
    if (view === "month") return;
    for (const d of visibleDoctors.slice(0, 12)) {
      if (availability[d.id]) continue;
      Promise.all([scheduling.listRules(d.id), scheduling.listExceptions(d.id)])
        .then(([rules, exceptions]) => setAvailability((a) => ({ ...a, [d.id]: { rules, exceptions } })))
        .catch(() => undefined);
    }
  }, [view, visibleDoctors, availability]);

  const colorOf = useCallback(
    (doctorId: string) => providerColor(Math.max(0, doctors.findIndex((d) => d.id === doctorId))),
    [doctors],
  );
  const customerName = useCallback(
    (id: string) => customers.find((c) => c.id === id)?.name || "Customer",
    [customers],
  );

  const shown = useMemo(
    () => appointments.filter((a) => !hidden.has(a.doctor_id) && (showCancelled || a.status !== "cancelled")),
    [appointments, hidden, showCancelled],
  );

  const columns: GridColumn[] = useMemo(() => {
    if (view === "day") {
      if (visibleDoctors.length === 0) return [{ key: "none", dayKey: anchor, title: "", isToday: anchor === today }];
      return visibleDoctors.map((d) => ({
        key: d.id, dayKey: anchor, title: d.name, doctorId: d.id, isToday: anchor === today, shadeFor: d.id,
      }));
    }
    const only = visibleDoctors.length === 1 ? visibleDoctors[0].id : undefined;
    return weekDays(anchor).map((day) => ({
      key: day,
      dayKey: day,
      title: formatDay(day, { weekday: "short" }),
      subtitle: String(Number(day.slice(8))),
      isToday: day === today,
      shadeFor: only,
    }));
  }, [view, anchor, visibleDoctors, today]);

  const step = (dir: 1 | -1) => {
    setAnchor((a) => (view === "day" ? addDays(a, dir) : view === "week" ? addDays(a, 7 * dir) : addMonths(a, dir)));
  };

  // Dropping a booking on a new time: find the real open slot nearest the drop,
  // then ask before moving anything.
  const handleMove = async (appointment: Appointment, dayKey: string, minutes: number, doctorId?: string) => {
    if (doctorId && doctorId !== appointment.doctor_id) {
      say("bad", `A ${labels.booking_noun} stays with its ${labels.provider.toLowerCase()}. Drop it in ${appointment.doctor_name}'s column.`);
      return;
    }
    try {
      const open = await scheduling.openSlots(appointment.doctor_id, dayKey);
      const nearest = open
        .map((s) => ({ s, gap: Math.abs(minutesOf(s.starts_at) - minutes) }))
        .filter((x) => x.gap <= 30)
        .sort((a, b) => a.gap - b.gap)[0];
      if (!nearest) {
        say("bad", `${appointment.doctor_name} has nothing open near ${formatMinutes(minutes)} that day.`);
        return;
      }
      if (nearest.s.starts_at === appointment.starts_at) return;
      setPendingMove({ appointment, slot: nearest.s });
    } catch (e) {
      say("bad", e instanceof Error ? e.message : "Could not check open times.");
    }
  };

  const confirmMove = async () => {
    if (!pendingMove) return;
    setMoving(true);
    try {
      const updated = await scheduling.rescheduleAppointment(pendingMove.appointment.id, pendingMove.slot.starts_at);
      replace(updated);
      say("ok", `Moved to ${formatClock(updated.starts_at)}.`);
      setPendingMove(null);
    } catch (e) {
      say("bad", e instanceof Error ? e.message : "Could not move it.");
    } finally {
      setMoving(false);
    }
  };

  const replace = (updated: Appointment) => {
    setAppointments((list) => list.map((a) => (a.id === updated.id ? updated : a)));
    setSelected((s) => (s && s.id === updated.id ? updated : s));
  };

  const toggleDoctor = (id: string) =>
    setHidden((h) => {
      const next = new Set(h);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const inView = shown.length;
  const waiting = shown.filter((a) => a.status === "requested" || a.status === "awaiting_deposit").length;

  return (
    <AppLayout title="Calendar" subtitle="Every booking from calls, WhatsApp, the website and your team - on one calendar.">
      <div className="space-y-4">
        {!ready ? (
          <Skeleton className="h-96 w-full" />
        ) : unavailable ? (
          <GlassCard className="p-6">
            <EmptyState icon={CalendarDays} title="Calendar is not on yet" description={unavailable} />
          </GlassCard>
        ) : doctors.length === 0 ? (
          <GlassCard className="p-6">
            <EmptyState
              icon={CalendarDays}
              title={`Add your first ${labels.provider.toLowerCase()}`}
              description={`The calendar shows each ${labels.provider.toLowerCase()}'s ${labels.booking_noun_plural}. Add one and set their working hours on the Scheduling page.`}
            />
            <div className="mt-4 text-center">
              <Link href="/scheduling" className="text-xs font-semibold text-cyan-400 hover:underline">Go to Scheduling</Link>
            </div>
          </GlassCard>
        ) : (
          <>
            <GlassCard className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAnchor(today)}
                    className="rounded-lg border border-white/[0.12] px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/[0.06] cursor-pointer"
                  >
                    Today
                  </button>
                  <button type="button" onClick={() => step(-1)} aria-label="Previous" className="rounded-lg border border-white/[0.12] p-1.5 text-white hover:bg-white/[0.06] cursor-pointer">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button type="button" onClick={() => step(1)} aria-label="Next" className="rounded-lg border border-white/[0.12] p-1.5 text-white hover:bg-white/[0.06] cursor-pointer">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <h2 className="ml-1 text-sm font-bold text-white sm:text-base">{rangeTitle(view, anchor)}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex rounded-lg border border-white/[0.12] p-0.5">
                    {(["day", "week", "month"] as View[]).map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => changeView(v)}
                        className={`rounded-md px-3 py-1 text-xs font-semibold capitalize cursor-pointer ${
                          view === v ? "bg-cyan-500/20 text-cyan-300" : "text-os-text-dim hover:text-white"
                        }`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSeed({ dayKey: anchor < today ? today : anchor, minutes: 9 * 60 })}
                    className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3 py-1.5 text-xs font-bold text-black hover:bg-cyan-400 cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" /> New {labels.booking_noun}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className="flex flex-wrap items-center gap-1.5">
                  {doctors.map((d) => {
                    const off = hidden.has(d.id);
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => toggleDoctor(d.id)}
                        aria-pressed={!off}
                        className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] cursor-pointer ${
                          off ? "border-white/[0.08] text-os-text-dim line-through" : "border-white/[0.16] text-white"
                        }`}
                      >
                        <span className="h-2 w-2 rounded-full" style={{ background: off ? "#475569" : colorOf(d.id) }} />
                        {d.name}
                      </button>
                    );
                  })}
                </div>
                <label className="flex items-center gap-1.5 text-[11px] text-os-text-dim cursor-pointer">
                  <input type="checkbox" checked={showCancelled} onChange={(e) => setShowCancelled(e.target.checked)} />
                  Show cancelled
                </label>
                <span className="text-[11px] text-os-text-dim">
                  {loadingRange ? "Loading…" : `${inView} ${inView === 1 ? labels.booking_noun : labels.booking_noun_plural}${waiting ? ` · ${waiting} waiting for confirmation` : ""}`}
                </span>
              </div>

              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {(["confirmed", "requested", "visited", "no_show", "cancelled"] as const).map((s) => (
                  <span key={s} className="flex items-center gap-1.5 text-[10px] text-os-text-dim">
                    <span className="h-2.5 w-2.5 rounded-sm" style={{ background: STATUS_LOOK[s].fill, outline: `1px ${STATUS_LOOK[s].dashed ? "dashed" : "solid"} ${STATUS_LOOK[s].text}` }} />
                    {STATUS_LOOK[s].label}
                  </span>
                ))}
              </div>
            </GlassCard>

            {view === "month" ? (
              <MonthGrid
                anchor={anchor}
                today={today}
                appointments={shown}
                colorOf={colorOf}
                customerName={customerName}
                onOpen={setSelected}
                onPickDay={(day) => { setAnchor(day); changeView("day"); }}
              />
            ) : (
              <TimeGrid
                columns={columns}
                appointments={shown}
                colorOf={colorOf}
                customerName={customerName}
                availability={availability}
                showProvider={view === "week" && visibleDoctors.length > 1}
                minColumnWidth={view === "day" ? 168 : 112}
                onCreate={(dayKey, minutes, doctorId) => setSeed({ dayKey, minutes, doctorId })}
                onOpen={setSelected}
                onMove={handleMove}
              />
            )}

            <p className="text-[11px] text-os-text-dim">
              Click an empty time to add a {labels.booking_noun}. Drag one to move it. Striped areas are outside working hours.
            </p>
          </>
        )}
      </div>

      <AppointmentDrawer
        appointment={selected}
        labels={labels}
        color={selected ? colorOf(selected.doctor_id) : "#22d3ee"}
        customerName={selected ? customerName(selected.customer_id) : ""}
        propertyTitle={selected?.property_id ? properties.find((p) => p.id === selected.property_id)?.title ?? null : null}
        onClose={() => setSelected(null)}
        onChanged={replace}
      />

      <NewBookingModal
        seed={seed}
        onClose={() => setSeed(null)}
        doctors={doctors}
        customers={customers}
        properties={properties}
        labels={labels}
        defaultDoctorId={visibleDoctors[0]?.id}
        onCreated={(created) => {
          setAppointments((list) => [...list, created]);
          setSeed(null);
          say("ok", `Added for ${formatClock(created.starts_at)}.`);
        }}
      />

      <Modal
        isOpen={pendingMove !== null}
        onClose={() => setPendingMove(null)}
        title={`Move this ${labels.booking_noun}?`}
        maxWidth="sm"
      >
        {pendingMove && (
          <div className="space-y-4 text-xs text-white">
            <p>
              {customerName(pendingMove.appointment.customer_id)} with {pendingMove.appointment.doctor_name}
            </p>
            <p className="text-os-text-dim">
              From {formatDay(dayOf(pendingMove.appointment.starts_at), { weekday: "short", day: "numeric", month: "short" })}{" "}
              {formatClock(pendingMove.appointment.starts_at)} to{" "}
              <span className="font-semibold text-cyan-300">
                {formatDay(dayOf(pendingMove.slot.starts_at), { weekday: "short", day: "numeric", month: "short" })}{" "}
                {formatClock(pendingMove.slot.starts_at)}
              </span>
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setPendingMove(null)} className="rounded-lg border border-white/[0.12] px-4 py-2 hover:bg-white/[0.06] cursor-pointer">
                Leave it
              </button>
              <button
                type="button"
                disabled={moving}
                onClick={() => void confirmMove()}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-bold text-black hover:bg-cyan-400 disabled:opacity-50 cursor-pointer"
              >
                {moving ? "Moving…" : "Move it"}
              </button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-[80] -translate-x-1/2 rounded-xl border px-4 py-2.5 text-xs shadow-xl ${
            toast.tone === "ok" ? "border-emerald-500/30 bg-emerald-950 text-emerald-200" : "border-red-500/30 bg-red-950 text-red-200"
          }`}
        >
          {toast.text}
        </div>
      )}
    </AppLayout>
  );
}
