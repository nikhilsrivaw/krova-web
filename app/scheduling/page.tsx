"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  Plus,
  Trash2,
  Clock,
  User,
  Home,
} from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  account,
  scheduling,
  ledger,
  properties as propertiesApi,
  type Doctor,
  type AvailabilityRule,
  type Appointment,
  type Slot,
  type CustomerSummary,
  type Property,
} from "@/lib/api";

const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Businesses on this platform run on India time - a browser's own local
// calendar day (which a headless/CI browser often reports in UTC) can
// already be tomorrow, or still yesterday, relative to that. Defaulting a
// date picker off the wrong "today" means it opens already showing a day
// that's partly or fully in the past, which real_slots() then (correctly)
// reports as empty - confusing, and avoidable.
function todayInIST(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());
}

const APPOINTMENT_BADGE: Record<Appointment["status"], "emerald" | "amber" | "rose" | "default"> = {
  requested: "amber",
  confirmed: "emerald",
  visited: "default",
  no_show: "rose",
  cancelled: "rose",
};

export default function SchedulingPage() {
  const [vertical, setVertical] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"providers" | "appointments">("providers");

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [propertyList, setPropertyList] = useState<Property[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Provider modal
  const [isProviderModalOpen, setIsProviderModalOpen] = useState(false);
  const [providerName, setProviderName] = useState("");
  const [providerQualifications, setProviderQualifications] = useState("");
  const [providerFee, setProviderFee] = useState("");
  const [isSavingProvider, setIsSavingProvider] = useState(false);

  // Hours modal
  const [hoursDoctor, setHoursDoctor] = useState<Doctor | null>(null);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [ruleWeekday, setRuleWeekday] = useState(0);
  const [ruleStart, setRuleStart] = useState("10:00");
  const [ruleEnd, setRuleEnd] = useState("18:00");
  const [ruleDuration, setRuleDuration] = useState("30");
  const [isSavingRule, setIsSavingRule] = useState(false);

  // Book modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookDoctorId, setBookDoctorId] = useState("");
  const [bookCustomerId, setBookCustomerId] = useState("");
  const [bookPropertyId, setBookPropertyId] = useState("");
  const [bookDate, setBookDate] = useState("");
  const [openSlots, setOpenSlots] = useState<Slot[]>([]);
  const [bookSlot, setBookSlot] = useState("");
  const [bookNotes, setBookNotes] = useState("");
  const [isBooking, setIsBooking] = useState(false);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);

  const hasPropertyListings = vertical === "real_estate";
  const providerLabel = hasPropertyListings ? "Agent" : "Doctor";
  const providerLabelPlural = hasPropertyListings ? "Agents" : "Doctors";

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed customer"]));
    return (id: string) => map.get(id) || id.slice(0, 8);
  }, [customers]);

  const propertyTitle = useMemo(() => {
    const map = new Map(propertyList.map((p) => [p.id, p.title]));
    return (id: string | null) => (id ? map.get(id) || null : null);
  }, [propertyList]);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    const calls: Promise<unknown>[] = [
      account.profile(),
      scheduling.listDoctors(),
      scheduling.listAppointments(),
      ledger.customers(),
    ];
    const results = await Promise.allSettled(calls);
    const [profileRes, doctorsRes, apptRes, customersRes] = results;

    if (profileRes.status === "fulfilled") {
      const v = (profileRes.value as { vertical: string | null }).vertical;
      setVertical(v);
      if (v === "real_estate") {
        try {
          setPropertyList(await propertiesApi.list());
        } catch {
          // Property list is a nice-to-have here (labelling a viewing) - a
          // failure here should not block the scheduling page itself.
        }
      }
    }
    if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value as Doctor[]);
    if (apptRes.status === "fulfilled") setAppointments(apptRes.value as Appointment[]);
    if (customersRes.status === "fulfilled") setCustomers(customersRes.value as CustomerSummary[]);

    const failed = results.find((r) => r.status === "rejected");
    if (failed && failed.status === "rejected") {
      setLoadError(failed.reason instanceof Error ? failed.reason.message : "Could not load scheduling.");
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openProviderModal = () => {
    setProviderName("");
    setProviderQualifications("");
    setProviderFee("");
    setIsProviderModalOpen(true);
  };

  const handleCreateProvider = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProvider(true);
    setActionError(null);
    try {
      const created = await scheduling.createDoctor({
        name: providerName,
        qualifications: providerQualifications || undefined,
        consultation_fee_paise: providerFee ? Math.round(parseFloat(providerFee) * 100) : undefined,
      });
      setDoctors((prev) => [...prev, created]);
      setIsProviderModalOpen(false);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : `Could not add this ${providerLabel.toLowerCase()}.`);
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleDeactivateProvider = async (id: string) => {
    setActionError(null);
    try {
      await scheduling.updateDoctor(id, { active: false });
      setDoctors((prev) => prev.map((d) => (d.id === id ? { ...d, active: false } : d)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not deactivate.");
    }
  };

  const openHoursModal = async (doctor: Doctor) => {
    setHoursDoctor(doctor);
    setRules([]);
    try {
      setRules(await scheduling.listRules(doctor.id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not load hours.");
    }
  };

  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hoursDoctor) return;
    setIsSavingRule(true);
    setActionError(null);
    try {
      const created = await scheduling.createRule(hoursDoctor.id, {
        weekday: ruleWeekday,
        start_time: `${ruleStart}:00`,
        end_time: `${ruleEnd}:00`,
        slot_duration_minutes: parseInt(ruleDuration, 10) || 30,
      });
      setRules((prev) => [...prev, created]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not add these hours.");
    } finally {
      setIsSavingRule(false);
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    setActionError(null);
    try {
      await scheduling.deleteRule(ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not remove these hours.");
    }
  };

  const openBookModal = () => {
    setBookDoctorId(doctors.find((d) => d.active)?.id || "");
    setBookCustomerId("");
    setBookPropertyId("");
    setBookDate(todayInIST());
    setOpenSlots([]);
    setBookSlot("");
    setBookNotes("");
    setIsBookModalOpen(true);
  };

  useEffect(() => {
    if (!isBookModalOpen || !bookDoctorId || !bookDate) return;
    setIsLoadingSlots(true);
    setBookSlot("");
    scheduling
      .openSlots(bookDoctorId, bookDate)
      .then(setOpenSlots)
      .catch(() => setOpenSlots([]))
      .finally(() => setIsLoadingSlots(false));
  }, [isBookModalOpen, bookDoctorId, bookDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookSlot) return;
    setIsBooking(true);
    setActionError(null);
    try {
      const created = await scheduling.createAppointment({
        doctor_id: bookDoctorId,
        customer_id: bookCustomerId,
        starts_at: bookSlot,
        property_id: bookPropertyId || undefined,
        notes: bookNotes || undefined,
      });
      setAppointments((prev) => [...prev, created].sort((a, b) => a.starts_at.localeCompare(b.starts_at)));
      setIsBookModalOpen(false);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "That slot may have just been taken - pick another.",
      );
    } finally {
      setIsBooking(false);
    }
  };

  return (
    <AppLayout
      title="Scheduling"
      subtitle={`Manage ${providerLabelPlural.toLowerCase()}, their hours, and the appointment book.`}
      actions={
        <div className="flex items-center gap-2">
          {doctors.some((d) => d.active) && (
            <button
              type="button"
              onClick={openBookModal}
              className="px-3 py-1.5 rounded-lg bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <CalendarClock className="w-3.5 h-3.5" />
              Book Appointment
            </button>
          )}
          <button
            type="button"
            onClick={openProviderModal}
            className="px-3 py-1.5 rounded-lg bg-brass hover:bg-brass-dim text-white text-xs font-bold shadow-md flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add {providerLabel}
          </button>
        </div>
      }
    >
      <div className="space-y-6 max-w-6xl mx-auto">
        {loadError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {loadError}
          </div>
        )}
        {actionError && (
          <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400">
            {actionError}
          </div>
        )}

        <div className="flex items-center gap-2 border-b border-white/[0.06] pb-3">
          {[
            { key: "providers", label: `${providerLabelPlural} (${doctors.filter((d) => d.active).length})` },
            { key: "appointments", label: `Appointments (${appointments.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === tab.key
                  ? "bg-white/[0.08] text-white border border-white/[0.1] shadow-inner font-bold"
                  : "text-os-text-dim hover:text-white hover:bg-white/[0.03]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === "providers" && (
          <div className="space-y-4">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            ) : doctors.length === 0 ? (
              <EmptyState
                icon={User}
                title={`No ${providerLabelPlural.toLowerCase()} yet`}
                description={`Add a ${providerLabel.toLowerCase()} and their weekly hours so customers can actually book a real slot.`}
                action={{ label: `Add ${providerLabel}`, onClick: openProviderModal }}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {doctors.map((d) => (
                  <GlassCard key={d.id} className={`p-5 ${!d.active ? "opacity-50" : ""}`}>
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{d.name}</span>
                          {!d.active && <Badge variant="outline" size="sm">Inactive</Badge>}
                        </div>
                        {d.qualifications && (
                          <p className="text-xs text-os-text-dim mt-0.5">{d.qualifications}</p>
                        )}
                      </div>
                      {d.consultation_fee_paise !== null && (
                        <Badge variant="indigo" size="sm">
                          ₹{(d.consultation_fee_paise / 100).toLocaleString("en-IN")}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
                      <button
                        type="button"
                        onClick={() => openHoursModal(d)}
                        className="text-xs font-semibold text-brass-bright hover:text-brass flex items-center gap-1.5 cursor-pointer"
                      >
                        <Clock className="w-3.5 h-3.5" />
                        Manage Hours
                      </button>
                      {d.active && (
                        <button
                          type="button"
                          onClick={() => handleDeactivateProvider(d.id)}
                          className="text-xs text-os-text-dim hover:text-thread-bright transition-colors flex items-center gap-1"
                        >
                          <Trash2 className="w-3 h-3" />
                          Deactivate
                        </button>
                      )}
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="space-y-3">
            {isLoading ? (
              <Skeleton className="h-40 w-full" />
            ) : appointments.length === 0 ? (
              <EmptyState
                icon={CalendarClock}
                title="No appointments yet"
                description="Bookings made by voice, WhatsApp, or entered here directly will show up on this calendar."
              />
            ) : (
              <div className="rounded-2xl border border-os-border overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-white/[0.03] text-os-text-dim uppercase font-mono text-[10px]">
                    <tr>
                      <th className="text-left px-4 py-2.5">When</th>
                      <th className="text-left px-4 py-2.5">{providerLabel}</th>
                      <th className="text-left px-4 py-2.5">Customer</th>
                      {hasPropertyListings && <th className="text-left px-4 py-2.5">Property</th>}
                      <th className="text-left px-4 py-2.5">Channel</th>
                      <th className="text-left px-4 py-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map((a) => (
                      <tr key={a.id} className="border-t border-white/[0.05] hover:bg-white/[0.02]">
                        <td className="px-4 py-3 text-white font-mono">
                          {new Date(a.starts_at).toLocaleString("en-IN", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </td>
                        <td className="px-4 py-3 text-white/90">{a.doctor_name}</td>
                        <td className="px-4 py-3 text-white/90">{customerName(a.customer_id)}</td>
                        {hasPropertyListings && (
                          <td className="px-4 py-3 text-os-text-dim">
                            {propertyTitle(a.property_id) || "—"}
                          </td>
                        )}
                        <td className="px-4 py-3 text-os-text-dim capitalize">{a.intake_channel}</td>
                        <td className="px-4 py-3">
                          <Badge variant={APPOINTMENT_BADGE[a.status]} size="sm">
                            {a.status.replace("_", " ")}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Add Provider Modal */}
        <Modal
          isOpen={isProviderModalOpen}
          onClose={() => setIsProviderModalOpen(false)}
          title={`Add ${providerLabel}`}
          subtitle={`They'll show up in real availability the moment their weekly hours are set.`}
        >
          <form onSubmit={handleCreateProvider} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Name</label>
              <input
                type="text" required value={providerName} onChange={(e) => setProviderName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                {hasPropertyListings ? "Registration / license no. (optional)" : "Qualifications (optional)"}
              </label>
              <input
                type="text" value={providerQualifications} onChange={(e) => setProviderQualifications(e.target.value)}
                placeholder={hasPropertyListings ? "e.g. RERA Agent Reg. No. A5210001234" : "e.g. MBBS, MD (Cardiology)"}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">
                Consultation fee, ₹ (optional)
              </label>
              <input
                type="number" min="0" step="1" value={providerFee} onChange={(e) => setProviderFee(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsProviderModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={isSavingProvider} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                {isSavingProvider ? "Saving..." : "Add"}
              </button>
            </div>
          </form>
        </Modal>

        {/* Manage Hours Modal */}
        <Modal
          isOpen={!!hoursDoctor}
          onClose={() => setHoursDoctor(null)}
          title={`${hoursDoctor?.name || ""}'s weekly hours`}
          subtitle="Every real slot a customer can book comes from these rows - nothing else."
          maxWidth="lg"
        >
          <div className="space-y-4">
            {rules.length === 0 ? (
              <p className="text-xs text-os-text-dim">No hours set yet - add at least one below.</p>
            ) : (
              <div className="space-y-2">
                {rules
                  .slice()
                  .sort((a, b) => a.weekday - b.weekday)
                  .map((r) => (
                    <div key={r.id} className="flex items-center justify-between px-3 py-2 rounded-lg bg-white/[0.03] border border-white/[0.06]">
                      <span className="text-xs text-white">
                        <strong>{WEEKDAYS[r.weekday]}</strong>{" "}
                        <span className="font-mono text-os-text-dim">
                          {r.start_time.slice(0, 5)}–{r.end_time.slice(0, 5)} · {r.slot_duration_minutes}min slots
                        </span>
                      </span>
                      <button type="button" onClick={() => handleDeleteRule(r.id)} className="text-os-text-dim hover:text-thread-bright">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
              </div>
            )}

            <form onSubmit={handleAddRule} className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-white/[0.06]">
              <div>
                <label className="block text-[10px] font-mono uppercase text-os-text-dim mb-1">Day</label>
                <select value={ruleWeekday} onChange={(e) => setRuleWeekday(parseInt(e.target.value, 10))} className="w-full px-2 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  {WEEKDAYS.map((w, i) => <option key={w} value={i}>{w}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-os-text-dim mb-1">Start</label>
                <input type="time" value={ruleStart} onChange={(e) => setRuleStart(e.target.value)} className="w-full px-2 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-os-text-dim mb-1">End</label>
                <input type="time" value={ruleEnd} onChange={(e) => setRuleEnd(e.target.value)} className="w-full px-2 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase text-os-text-dim mb-1">Slot (min)</label>
                <input type="number" min="5" step="5" value={ruleDuration} onChange={(e) => setRuleDuration(e.target.value)} className="w-full px-2 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
              </div>
              <div className="col-span-2 sm:col-span-4 flex justify-end">
                <button type="submit" disabled={isSavingRule} className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer">
                  {isSavingRule ? "Adding..." : "Add Hours"}
                </button>
              </div>
            </form>
          </div>
        </Modal>

        {/* Book Appointment Modal */}
        <Modal
          isOpen={isBookModalOpen}
          onClose={() => setIsBookModalOpen(false)}
          title="Book an appointment"
          subtitle="Only real, currently open slots can be booked - the same check WhatsApp and voice go through."
          maxWidth="lg"
        >
          <form onSubmit={handleBook} className="space-y-4">
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">{providerLabel}</label>
              <select value={bookDoctorId} onChange={(e) => setBookDoctorId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                {doctors.filter((d) => d.active).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Customer</label>
              <select required value={bookCustomerId} onChange={(e) => setBookCustomerId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                <option value="">Select a customer...</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.id.slice(0, 8)}</option>)}
              </select>
            </div>
            {hasPropertyListings && (
              <div>
                <label className="block text-xs font-mono uppercase text-os-text-dim mb-1 flex items-center gap-1.5">
                  <Home className="w-3 h-3" /> Property (optional)
                </label>
                <select value={bookPropertyId} onChange={(e) => setBookPropertyId(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none">
                  <option value="">Not tied to a listing</option>
                  {propertyList.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Date</label>
              <input type="date" value={bookDate} onChange={(e) => setBookDate(e.target.value)} className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Open slots</label>
              {isLoadingSlots ? (
                <Skeleton className="h-10 w-full" />
              ) : openSlots.length === 0 ? (
                <p className="text-xs text-os-text-dim italic">Nothing free this day - try another date.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {openSlots.map((s) => (
                    <button
                      type="button" key={s.starts_at} onClick={() => setBookSlot(s.starts_at)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-mono border cursor-pointer ${
                        bookSlot === s.starts_at
                          ? "bg-brass text-white border-brass"
                          : "bg-white/[0.03] text-white/80 border-white/[0.1] hover:border-brass/50"
                      }`}
                    >
                      {new Date(s.starts_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-os-text-dim mb-1">Notes (optional)</label>
              <textarea rows={2} value={bookNotes} onChange={(e) => setBookNotes(e.target.value)} className="w-full p-3 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button type="button" onClick={() => setIsBookModalOpen(false)} className="px-4 py-2 rounded-lg text-xs font-semibold text-os-text-dim hover:text-white">
                Cancel
              </button>
              <button type="submit" disabled={!bookSlot || !bookCustomerId || isBooking} className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim disabled:opacity-50 shadow-md cursor-pointer">
                {isBooking ? "Booking..." : "Book"}
              </button>
            </div>
          </form>
        </Modal>
      </div>
    </AppLayout>
  );
}
