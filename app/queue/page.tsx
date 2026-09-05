"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Clock, UserPlus, Check, SkipForward, PhoneCall, Sun, Moon, Siren, Lock, LockOpen, Tablet, Copy, RefreshCw } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import { EmptyState, Skeleton } from "@/components/ui/EmptyState";
import {
  queue as queueApi,
  scheduling,
  ledger,
  type QueueEntry,
  type QueueStatus,
  type Shift,
  type ShiftSession,
  type Doctor,
  type CustomerSummary,
} from "@/lib/api";

const STATUS_BADGE: Record<QueueStatus, "emerald" | "amber" | "default" | "rose"> = {
  waiting: "amber",
  in_consultation: "emerald",
  done: "default",
  skipped: "rose",
  cancelled: "rose",
};

const STATUS_LABEL: Record<QueueStatus, string> = {
  waiting: "Waiting",
  in_consultation: "In Consultation",
  done: "Done",
  skipped: "Skipped",
  cancelled: "Cancelled",
};

const SHIFTS: Shift[] = ["morning", "evening", "emergency"];

const SHIFT_META: Record<Shift, { label: string; icon: typeof Sun }> = {
  morning: { label: "Morning", icon: Sun },
  evening: { label: "Evening", icon: Moon },
  emergency: { label: "Emergency", icon: Siren },
};

// Live-list polling, not a WebSocket - matches most of the internal app's
// other pages, and a fresh new-capability page is not the place to
// introduce a second real-time channel (the only existing one is voice
// live-assist).
const POLL_MS = 10000;

export default function QueuePage() {
  const [entries, setEntries] = useState<QueueEntry[]>([]);
  const [shifts, setShifts] = useState<ShiftSession[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [customers, setCustomers] = useState<CustomerSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [shiftActionPending, setShiftActionPending] = useState<Shift | null>(null);

  const [checkInShift, setCheckInShift] = useState<Shift | "">("");
  const [checkInCustomerId, setCheckInCustomerId] = useState("");
  const [checkInDoctorId, setCheckInDoctorId] = useState("");
  const [isCheckingIn, setIsCheckingIn] = useState(false);

  const [kioskToken, setKioskToken] = useState<string | null>(null);
  const [isKioskLoading, setIsKioskLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const openSessionFor = useMemo(() => {
    const map = new Map(shifts.filter((s) => !s.closed_at).map((s) => [s.shift, s]));
    return (shift: Shift) => map.get(shift) || null;
  }, [shifts]);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name || "Unnamed patient"]));
    return (id: string | null) => (id ? map.get(id) || "Walk-in" : "Walk-in");
  }, [customers]);

  const doctorName = useMemo(() => {
    const map = new Map(doctors.map((d) => [d.id, d.name]));
    return (id: string | null) => (id ? map.get(id) || null : null);
  }, [doctors]);

  const loadLive = useCallback(async () => {
    try {
      const [rows, shiftRows] = await Promise.all([queueApi.list(), queueApi.listShifts()]);
      setEntries(rows);
      setShifts(shiftRows);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load the queue.");
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setIsLoading(true);
      const results = await Promise.allSettled([
        queueApi.list(), queueApi.listShifts(), scheduling.listDoctors(), ledger.customers(),
      ]);
      const [queueRes, shiftsRes, doctorsRes, customersRes] = results;
      if (queueRes.status === "fulfilled") setEntries(queueRes.value);
      if (shiftsRes.status === "fulfilled") setShifts(shiftsRes.value);
      if (doctorsRes.status === "fulfilled") setDoctors(doctorsRes.value);
      if (customersRes.status === "fulfilled") setCustomers(customersRes.value);
      const failed = results.find((r) => r.status === "rejected");
      if (failed && failed.status === "rejected") {
        setLoadError(failed.reason instanceof Error ? failed.reason.message : "Could not load the queue.");
      }
      setIsLoading(false);
    };
    init();
    queueApi.getKioskConfig().then((c) => setKioskToken(c.token)).catch(() => {});
    const interval = setInterval(loadLive, POLL_MS);
    return () => clearInterval(interval);
  }, [loadLive]);

  const waiting = entries.filter((e) => e.status === "waiting").sort((a, b) => a.queue_number - b.queue_number);
  const active = entries.filter((e) => e.status === "in_consultation");
  const finished = entries.filter((e) => ["done", "skipped", "cancelled"].includes(e.status));

  const toggleShift = async (shift: Shift) => {
    setActionError(null);
    setShiftActionPending(shift);
    try {
      const session = openSessionFor(shift);
      if (session) {
        const updated = await queueApi.closeShift(session.id);
        setShifts((prev) => prev.map((s) => (s.id === updated.id ? updated : s)));
      } else {
        const opened = await queueApi.openShift(shift);
        setShifts((prev) => [...prev.filter((s) => s.shift !== shift || s.id !== opened.id), opened]);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update that shift.");
    } finally {
      setShiftActionPending(null);
    }
  };

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkInShift) return;
    setIsCheckingIn(true);
    setActionError(null);
    try {
      const created = await queueApi.checkIn({
        shift: checkInShift,
        customer_id: checkInCustomerId || undefined,
        doctor_id: checkInDoctorId || undefined,
      });
      setEntries((prev) => [...prev, created]);
      setCheckInCustomerId("");
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not check this patient in.");
    } finally {
      setIsCheckingIn(false);
    }
  };

  const advance = async (id: string, status: QueueStatus) => {
    setActionError(null);
    try {
      const updated = await queueApi.update(id, status);
      setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update this entry.");
    }
  };

  const anyShiftOpen = SHIFTS.some((s) => openSessionFor(s));

  const kioskUrl = kioskToken && typeof window !== "undefined" ? `${window.location.origin}/kiosk/${kioskToken}` : null;

  const handleToggleKiosk = async () => {
    setIsKioskLoading(true);
    setActionError(null);
    try {
      if (kioskToken) {
        await queueApi.disableKiosk();
        setKioskToken(null);
      } else {
        const result = await queueApi.enableKiosk();
        setKioskToken(result.token);
      }
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not update the kiosk link.");
    } finally {
      setIsKioskLoading(false);
    }
  };

  const handleRegenerateKiosk = async () => {
    setIsKioskLoading(true);
    setActionError(null);
    try {
      const result = await queueApi.enableKiosk();
      setKioskToken(result.token);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Could not regenerate the kiosk link.");
    } finally {
      setIsKioskLoading(false);
    }
  };

  const handleCopyKioskUrl = async () => {
    if (!kioskUrl) return;
    try {
      await navigator.clipboard.writeText(kioskUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail quietly (permissions, non-secure context) -
      // the URL is still visible on screen to copy by hand.
    }
  };

  return (
    <AppLayout
      title="Queue"
      subtitle="Who's waiting right now, and how many are ahead of them - a shift token, not a booked slot."
    >
      <div className="space-y-6 max-w-4xl mx-auto">
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

        <div className="grid grid-cols-3 gap-3">
          {SHIFTS.map((shift) => {
            const session = openSessionFor(shift);
            const isOpen = !!session;
            const Icon = SHIFT_META[shift].icon;
            return (
              <GlassCard key={shift} className={`p-4 ${isOpen ? "border-emerald-500/30" : ""}`}>
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-4 h-4 text-brass" />
                  <span className="text-xs font-bold text-white">{SHIFT_META[shift].label}</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleShift(shift)}
                  disabled={shiftActionPending === shift}
                  className={`w-full py-1.5 rounded-lg text-[11px] font-semibold flex items-center justify-center gap-1.5 cursor-pointer ${
                    isOpen ? "bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20" : "bg-white/[0.06] text-os-text-dim hover:text-white"
                  }`}
                >
                  {isOpen ? <LockOpen className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
                  {shiftActionPending === shift ? "..." : isOpen ? "Open - tap to close" : "Closed - tap to open"}
                </button>
              </GlassCard>
            );
          })}
        </div>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Tablet className="w-4 h-4 text-brass" />
            <h4 className="text-xs font-bold text-white">Self-service kiosk</h4>
          </div>
          {kioskUrl ? (
            <div className="space-y-2">
              <p className="text-[11px] text-os-text-dim">
                Open this link on a tablet at the front desk - patients check themselves in, no login needed.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-[11px] text-white/80 truncate">
                  {kioskUrl}
                </code>
                <button
                  type="button"
                  onClick={handleCopyKioskUrl}
                  className="p-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white cursor-pointer shrink-0"
                  title="Copy link"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleRegenerateKiosk}
                  disabled={isKioskLoading}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-white/[0.06] hover:bg-white/[0.1] text-os-text-dim hover:text-white cursor-pointer flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3 h-3" /> Regenerate link
                </button>
                <button
                  type="button"
                  onClick={handleToggleKiosk}
                  disabled={isKioskLoading}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 cursor-pointer"
                >
                  Disable kiosk
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleToggleKiosk}
              disabled={isKioskLoading}
              className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim cursor-pointer"
            >
              {isKioskLoading ? "Enabling..." : "Enable Kiosk Check-in"}
            </button>
          )}
        </GlassCard>

        <GlassCard className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <UserPlus className="w-4 h-4 text-brass" />
            <h4 className="text-xs font-bold text-white">Check in a patient</h4>
          </div>
          {!anyShiftOpen ? (
            <p className="text-xs text-os-text-dim">Open a shift above before checking anyone in.</p>
          ) : (
            <form onSubmit={handleCheckIn} className="flex flex-col sm:flex-row gap-3">
              <select
                required
                value={checkInShift}
                onChange={(e) => setCheckInShift(e.target.value as Shift)}
                className="px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              >
                <option value="">Select shift...</option>
                {SHIFTS.filter((s) => openSessionFor(s)).map((s) => (
                  <option key={s} value={s}>{SHIFT_META[s].label}</option>
                ))}
              </select>
              <select
                value={checkInCustomerId}
                onChange={(e) => setCheckInCustomerId(e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
              >
                <option value="">Walk-in (no patient record)</option>
                {customers.map((c) => <option key={c.id} value={c.id}>{c.name || c.id.slice(0, 8)}</option>)}
              </select>
              {doctors.length > 0 && (
                <select
                  value={checkInDoctorId}
                  onChange={(e) => setCheckInDoctorId(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-brass focus:outline-none"
                >
                  <option value="">Any doctor</option>
                  {doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              <button
                type="submit"
                disabled={isCheckingIn || !checkInShift}
                className="px-5 py-2 rounded-lg text-xs font-bold text-white bg-brass hover:bg-brass-dim shadow-md cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                {isCheckingIn ? "Checking in..." : "Check In"}
              </button>
            </form>
          )}
        </GlassCard>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : entries.length === 0 ? (
          <EmptyState
            icon={Clock}
            title="Nobody in the queue today"
            description="Open a shift and check a patient in above to start today's queue."
          />
        ) : (
          <>
            {active.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase text-os-text-dim">In Consultation</h4>
                {active.map((entry) => (
                  <GlassCard key={entry.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-brass-bright">{SHIFT_META[entry.shift].label} #{entry.queue_number}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{customerName(entry.customer_id)}</p>
                        {doctorName(entry.doctor_id) && <p className="text-[10px] text-os-text-dim">{doctorName(entry.doctor_id)}</p>}
                      </div>
                      <Badge variant={STATUS_BADGE[entry.status]} size="sm">{STATUS_LABEL[entry.status]}</Badge>
                    </div>
                    <button
                      type="button"
                      onClick={() => advance(entry.id, "done")}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-white/[0.06] text-emerald-400 hover:bg-emerald-500/10 cursor-pointer flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" /> Done
                    </button>
                  </GlassCard>
                ))}
              </div>
            )}

            {waiting.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase text-os-text-dim">Waiting ({waiting.length})</h4>
                {waiting.map((entry) => (
                  <GlassCard key={entry.id} className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold font-mono text-white">{SHIFT_META[entry.shift].label} #{entry.queue_number}</span>
                      <div>
                        <p className="text-sm font-semibold text-white">{customerName(entry.customer_id)}</p>
                        {doctorName(entry.doctor_id) && <p className="text-[10px] text-os-text-dim">{doctorName(entry.doctor_id)}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => advance(entry.id, "in_consultation")}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-brass hover:bg-brass-dim text-white cursor-pointer flex items-center gap-1.5"
                      >
                        <PhoneCall className="w-3.5 h-3.5" /> Call Next
                      </button>
                      <button
                        type="button"
                        onClick={() => advance(entry.id, "skipped")}
                        title="Skip"
                        className="p-2 rounded-lg text-os-text-dim hover:text-white hover:bg-white/[0.06] cursor-pointer"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </GlassCard>
                ))}
              </div>
            )}

            {finished.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[10px] font-mono uppercase text-os-text-dim">Completed today ({finished.length})</h4>
                {finished.map((entry) => (
                  <GlassCard key={entry.id} className="p-3 flex items-center justify-between gap-4 opacity-60">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-mono text-os-text-dim">{SHIFT_META[entry.shift].label} #{entry.queue_number}</span>
                      <p className="text-xs text-white">{customerName(entry.customer_id)}</p>
                    </div>
                    <Badge variant={STATUS_BADGE[entry.status]} size="sm">{STATUS_LABEL[entry.status]}</Badge>
                  </GlassCard>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
