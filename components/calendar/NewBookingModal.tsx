"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  scheduling,
  type Appointment,
  type CustomerSummary,
  type Doctor,
  type Property,
  type SchedulingLabels,
  type Slot,
} from "@/lib/api";
import { formatClock, formatDay, minutesOf, todayKey } from "./calendarUtils";

export type BookingSeed = { dayKey: string; minutes: number; doctorId?: string } | null;

type Props = {
  seed: BookingSeed;
  onClose: () => void;
  doctors: Doctor[];
  customers: CustomerSummary[];
  properties: Property[];
  labels: SchedulingLabels;
  defaultDoctorId?: string;
  onCreated: (appointment: Appointment) => void;
};

const FIELD =
  "w-full rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none";

export function NewBookingModal({
  seed, onClose, doctors, customers, properties, labels, defaultDoctorId, onCreated,
}: Props) {
  const [doctorId, setDoctorId] = useState("");
  const [date, setDate] = useState(todayKey());
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slot, setSlot] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [propertyId, setPropertyId] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start from where the person clicked on the calendar.
  useEffect(() => {
    if (!seed) return;
    setDoctorId(seed.doctorId ?? defaultDoctorId ?? doctors[0]?.id ?? "");
    setDate(seed.dayKey);
    setSlot(null);
    setQuery("");
    setCustomerId(null);
    setPropertyId("");
    setNotes("");
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seed]);

  useEffect(() => {
    if (!seed || !doctorId) return;
    let live = true;
    setLoadingSlots(true);
    scheduling.openSlots(doctorId, date)
      .then((s) => {
        if (!live) return;
        setSlots(s);
        // The slot that was clicked, if it is actually open.
        const clicked = seed.dayKey === date ? s.find((x) => minutesOf(x.starts_at) === seed.minutes) : undefined;
        setSlot(clicked ? clicked.starts_at : null);
      })
      .catch((e) => { if (live) setError(e instanceof Error ? e.message : "Could not load open times."); })
      .finally(() => { if (live) setLoadingSlots(false); });
    return () => { live = false; };
  }, [seed, doctorId, date]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers.slice(0, 6);
    return customers
      .filter((c) => (c.name ?? "").toLowerCase().includes(q) || c.identities.some((i) => i.value.includes(q)))
      .slice(0, 6);
  }, [customers, query]);

  const chosen = customers.find((c) => c.id === customerId);
  const noun = labels.booking_noun;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slot || !customerId || !doctorId) return;
    setBusy(true);
    setError(null);
    try {
      const created = await scheduling.createAppointment({
        doctor_id: doctorId,
        customer_id: customerId,
        starts_at: slot,
        property_id: propertyId || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(created);
    } catch (err) {
      setError(err instanceof Error ? err.message : `Could not add this ${noun}.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={seed !== null}
      onClose={onClose}
      title={`New ${noun}`}
      subtitle={seed ? formatDay(seed.dayKey, { weekday: "long", day: "numeric", month: "long" }) : undefined}
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-os-text-dim">{labels.provider}</label>
            <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className={FIELD}>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-os-text-dim">Date</label>
            <input type="date" value={date} min={todayKey()} onChange={(e) => setDate(e.target.value)} className={FIELD} />
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-os-text-dim">Open times</label>
          {loadingSlots ? (
            <p className="text-xs text-os-text-dim">Loading…</p>
          ) : slots.length === 0 ? (
            <p className="text-xs text-os-text-dim">
              Nothing open on this day. Check this {labels.provider.toLowerCase()}&apos;s working hours on the Scheduling page.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
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
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-os-text-dim">Customer</label>
          {chosen ? (
            <div className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-white">
              <span>{chosen.name || "Unnamed customer"}</span>
              <button type="button" onClick={() => setCustomerId(null)} className="text-cyan-300 hover:underline cursor-pointer">Change</button>
            </div>
          ) : (
            <>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-os-text-dim" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by name or phone"
                  className={`${FIELD} pl-8`}
                />
              </div>
              <ul className="mt-1.5 max-h-40 overflow-auto rounded-lg border border-white/[0.08]">
                {matches.length === 0 && <li className="px-3 py-2 text-xs text-os-text-dim">No one matches. Add them on the Customers page first.</li>}
                {matches.map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => setCustomerId(c.id)}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-xs text-white hover:bg-white/[0.06] cursor-pointer"
                    >
                      <span>{c.name || "Unnamed customer"}</span>
                      <span className="text-os-text-dim">{c.identities[0]?.value ?? ""}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        {properties.length > 0 && (
          <div>
            <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-os-text-dim">Property (optional)</label>
            <select value={propertyId} onChange={(e) => setPropertyId(e.target.value)} className={FIELD}>
              <option value="">None</option>
              {properties.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="mb-1.5 block text-[10px] uppercase tracking-wide text-os-text-dim">Notes (optional)</label>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className={FIELD} placeholder="Anything the team should know" />
        </div>

        {error && <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">{error}</div>}

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-lg border border-white/[0.12] px-4 py-2 text-xs text-white hover:bg-white/[0.06] cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !slot || !customerId}
            className="rounded-lg bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-40 cursor-pointer"
          >
            {busy ? "Adding…" : `Add ${noun}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
