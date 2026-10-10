import type { Appointment, AvailabilityException, AvailabilityRule } from "@/lib/api";

/**
 * Date maths for the calendar. Every business here runs on India time, which has no
 * daylight saving, so a day is simply "YYYY-MM-DD" in IST and a time of day is minutes
 * since midnight. Keeping to that (instead of the browser's own zone) means the grid
 * shows the same hours to everyone, whatever machine they are on.
 */

export const TZ = "Asia/Kolkata";
export const HOUR_PX = 64;
export const SNAP_MINUTES = 15;

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ });
const partsFmt = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

export function todayKey(): string {
  return dayFmt.format(new Date());
}

export function nowMinutes(): number {
  return minutesOf(new Date().toISOString());
}

/** The IST day an instant falls on. */
export function dayOf(iso: string): string {
  return dayFmt.format(new Date(iso));
}

/** Minutes since midnight IST. */
export function minutesOf(iso: string): number {
  const parts = partsFmt.formatToParts(new Date(iso));
  const h = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const m = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  return h * 60 + m;
}

function utc(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function keyOf(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(key: string, n: number): string {
  const d = utc(key);
  d.setUTCDate(d.getUTCDate() + n);
  return keyOf(d);
}

export function addMonths(key: string, n: number): string {
  const d = utc(key);
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + n);
  return keyOf(d);
}

/** Monday of the week containing `key`. */
export function weekStart(key: string): string {
  const d = utc(key);
  const back = (d.getUTCDay() + 6) % 7;
  return addDays(key, -back);
}

/** 0 = Monday ... 6 = Sunday, matching AvailabilityRule.weekday. */
export function weekdayOf(key: string): number {
  return (utc(key).getUTCDay() + 6) % 7;
}

export function weekDays(key: string): string[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Six whole weeks covering the month of `key`, Monday first. */
export function monthGrid(key: string): string[][] {
  const first = `${key.slice(0, 7)}-01`;
  const start = weekStart(first);
  return Array.from({ length: 6 }, (_, w) => Array.from({ length: 7 }, (_, d) => addDays(start, w * 7 + d)));
}

/** An instant for a given IST day and minute-of-day. */
export function toIso(key: string, minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return `${key}T${h}:${m}:00+05:30`;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60) % 24;
  const m = minutes % 60;
  const suffix = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12} ${suffix}` : `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatClock(iso: string): string {
  return formatMinutes(minutesOf(iso));
}

export function formatDay(key: string, opts: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-IN", { timeZone: "UTC", ...opts }).format(utc(key));
}

export function rangeTitle(view: "day" | "week" | "month", key: string): string {
  if (view === "day") return formatDay(key, { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  if (view === "month") return formatDay(key, { month: "long", year: "numeric" });
  const days = weekDays(key);
  const a = days[0];
  const b = days[6];
  const sameMonth = a.slice(0, 7) === b.slice(0, 7);
  return sameMonth
    ? `${formatDay(a, { day: "numeric" })} – ${formatDay(b, { day: "numeric", month: "long", year: "numeric" })}`
    : `${formatDay(a, { day: "numeric", month: "short" })} – ${formatDay(b, { day: "numeric", month: "short", year: "numeric" })}`;
}

/** The dates to fetch for a view, padded a day each side because the API cuts on UTC midnight. */
export function fetchRange(view: "day" | "week" | "month", key: string): { from: string; to: string } {
  if (view === "day") return { from: addDays(key, -1), to: addDays(key, 2) };
  if (view === "week") {
    const s = weekStart(key);
    return { from: addDays(s, -1), to: addDays(s, 8) };
  }
  const grid = monthGrid(key);
  return { from: addDays(grid[0][0], -1), to: addDays(grid[5][6], 2) };
}

// ── looks ───────────────────────────────────────────────────────────────────

/** One colour per provider, so a column of bookings reads at a glance. */
export const PROVIDER_COLORS = [
  "#22d3ee", "#a78bfa", "#f59e0b", "#34d399", "#fb7185", "#60a5fa", "#f472b6", "#a3e635",
];

export function providerColor(index: number): string {
  return PROVIDER_COLORS[index % PROVIDER_COLORS.length];
}

export type StatusLook = { label: string; fill: string; text: string; dashed?: boolean; strike?: boolean; faded?: boolean };

export const STATUS_LOOK: Record<Appointment["status"], StatusLook> = {
  requested: { label: "Awaiting confirmation", fill: "rgba(245,158,11,0.16)", text: "#fbbf24", dashed: true },
  awaiting_deposit: { label: "Holding for deposit", fill: "rgba(245,158,11,0.16)", text: "#fbbf24", dashed: true },
  confirmed: { label: "Confirmed", fill: "rgba(34,211,238,0.16)", text: "#67e8f9" },
  visited: { label: "Visited", fill: "rgba(52,211,153,0.16)", text: "#6ee7b7" },
  no_show: { label: "No-show", fill: "rgba(244,63,94,0.16)", text: "#fda4af", strike: true },
  cancelled: { label: "Cancelled", fill: "rgba(148,163,184,0.10)", text: "#94a3b8", strike: true, faded: true },
};

// ── overlap layout ──────────────────────────────────────────────────────────

export type Placed = { appointment: Appointment; start: number; end: number; lane: number; lanes: number };

/** Side-by-side lanes for bookings that overlap in time, the way week views of busy calendars do. */
export function layoutDay(items: Appointment[]): Placed[] {
  const sorted = items
    .map((appointment) => {
      const start = minutesOf(appointment.starts_at);
      const end = Math.max(start + 15, minutesOf(appointment.ends_at) || start + 15);
      return { appointment, start, end, lane: 0, lanes: 1 };
    })
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: Placed[] = [];
  let clusterEnd = -1;
  const finish = () => {
    const lanes = cluster.reduce((max, p) => Math.max(max, p.lane + 1), 1);
    cluster.forEach((p) => (p.lanes = lanes));
    cluster = [];
  };

  for (const item of sorted) {
    if (cluster.length && item.start >= clusterEnd) finish();
    const taken = new Set(cluster.filter((p) => p.end > item.start).map((p) => p.lane));
    let lane = 0;
    while (taken.has(lane)) lane += 1;
    item.lane = lane;
    cluster.push(item);
    clusterEnd = Math.max(clusterEnd, item.end);
  }
  finish();
  return sorted;
}

// ── working hours ───────────────────────────────────────────────────────────

export type Availability = { rules: AvailabilityRule[]; exceptions: AvailabilityException[] };

const toMinutes = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** The stretches of the day this provider works, or null if they are off. */
export function workingSpans(av: Availability | undefined, key: string): [number, number][] | null {
  if (!av) return [];
  const exceptions = av.exceptions.filter((e) => e.date === key);
  if (exceptions.some((e) => e.is_unavailable)) return null;
  const extra = exceptions
    .filter((e) => !e.is_unavailable && e.start_time && e.end_time)
    .map((e) => [toMinutes(e.start_time as string), toMinutes(e.end_time as string)] as [number, number]);
  const weekly = av.rules
    .filter((r) => r.weekday === weekdayOf(key))
    .map((r) => [toMinutes(r.start_time), toMinutes(r.end_time)] as [number, number]);
  return [...weekly, ...extra].sort((a, b) => a[0] - b[0]);
}
