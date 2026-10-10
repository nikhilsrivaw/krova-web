"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Appointment } from "@/lib/api";
import {
  HOUR_PX,
  SNAP_MINUTES,
  STATUS_LOOK,
  dayOf,
  formatClock,
  formatMinutes,
  layoutDay,
  minutesOf,
  nowMinutes,
  workingSpans,
  type Availability,
} from "./calendarUtils";

export type GridColumn = {
  key: string;
  dayKey: string;
  title: string;
  subtitle?: string;
  /** Set when the column belongs to one provider (the day view with a column per provider). */
  doctorId?: string;
  isToday: boolean;
  /** Whose working hours to shade. */
  shadeFor?: string;
};

type Props = {
  columns: GridColumn[];
  appointments: Appointment[];
  colorOf: (doctorId: string) => string;
  customerName: (customerId: string) => string;
  availability: Record<string, Availability>;
  showProvider: boolean;
  minColumnWidth: number;
  onCreate: (dayKey: string, minutes: number, doctorId?: string) => void;
  onOpen: (appointment: Appointment) => void;
  onMove: (appointment: Appointment, dayKey: string, minutes: number, doctorId?: string) => void;
};

const GUTTER = 56;

export function TimeGrid({
  columns, appointments, colorOf, customerName, availability, showProvider, minColumnWidth,
  onCreate, onOpen, onMove,
}: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(nowMinutes());
  const [ghost, setGhost] = useState<{ col: string; minutes: number } | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(nowMinutes()), 60_000);
    return () => clearInterval(t);
  }, []);

  // The visible hours: working hours by default, stretched to fit anything booked outside them.
  const { startMin, endMin } = useMemo(() => {
    let lo = 8 * 60;
    let hi = 20 * 60;
    for (const a of appointments) {
      lo = Math.min(lo, Math.floor(minutesOf(a.starts_at) / 60) * 60);
      hi = Math.max(hi, Math.ceil((minutesOf(a.ends_at) || minutesOf(a.starts_at) + 15) / 60) * 60);
    }
    for (const col of columns) {
      for (const [a, b] of workingSpans(availability[col.shadeFor ?? ""], col.dayKey) ?? []) {
        lo = Math.min(lo, Math.floor(a / 60) * 60);
        hi = Math.max(hi, Math.ceil(b / 60) * 60);
      }
    }
    return { startMin: Math.max(0, lo), endMin: Math.min(24 * 60, Math.max(hi, lo + 60)) };
  }, [appointments, availability, columns]);

  const height = ((endMin - startMin) / 60) * HOUR_PX;
  const hours = Array.from({ length: (endMin - startMin) / 60 }, (_, i) => startMin + i * 60);

  // Open scrolled to now (today) or to the first booking, not to midnight.
  const firstKey = columns[0]?.key;
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const hasToday = columns.some((c) => c.isToday);
    const first = appointments.length ? Math.min(...appointments.map((a) => minutesOf(a.starts_at))) : 9 * 60;
    const focus = hasToday ? nowMinutes() : first;
    el.scrollTop = Math.max(0, ((focus - startMin) / 60) * HOUR_PX - 96);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstKey, columns.length]);

  const minutesAt = (e: { clientY: number }, el: HTMLElement) => {
    const y = e.clientY - el.getBoundingClientRect().top;
    const raw = startMin + (y / HOUR_PX) * 60;
    return Math.min(endMin - SNAP_MINUTES, Math.max(startMin, Math.floor(raw / SNAP_MINUTES) * SNAP_MINUTES));
  };

  return (
    <div
      ref={scroller}
      className="relative overflow-auto rounded-xl border border-white/[0.08] bg-black/20"
      style={{ maxHeight: "calc(100vh - 17rem)", minHeight: 360 }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `${GUTTER}px repeat(${columns.length}, minmax(${minColumnWidth}px, 1fr))`,
          minWidth: GUTTER + columns.length * minColumnWidth,
        }}
      >
        {/* header */}
        <div className="sticky top-0 z-30 h-14 border-b border-white/[0.08] bg-[#0b0f14]" />
        {columns.map((col) => (
          <div
            key={`h-${col.key}`}
            className="sticky top-0 z-30 flex h-14 flex-col items-center justify-center border-b border-l border-white/[0.08] bg-[#0b0f14] px-1"
          >
            <span className={`text-[11px] font-semibold uppercase tracking-wide ${col.isToday ? "text-cyan-400" : "text-os-text-dim"}`}>
              {col.title}
            </span>
            {col.subtitle && (
              <span
                className={`mt-0.5 text-sm font-bold ${
                  col.isToday ? "flex h-7 min-w-7 items-center justify-center rounded-full bg-cyan-500 px-1.5 text-black" : "text-white"
                }`}
              >
                {col.subtitle}
              </span>
            )}
          </div>
        ))}

        {/* time gutter */}
        <div className="relative border-r border-white/[0.06]" style={{ height }}>
          {hours.map((h, i) => (
            <span
              key={h}
              className="absolute right-2 -translate-y-1/2 text-[10px] text-os-text-dim"
              style={{ top: i * HOUR_PX, display: i === 0 ? "none" : undefined }}
            >
              {formatMinutes(h)}
            </span>
          ))}
        </div>

        {/* day / provider columns */}
        {columns.map((col) => {
          const items = appointments.filter(
            (a) => dayOf(a.starts_at) === col.dayKey && (!col.doctorId || a.doctor_id === col.doctorId),
          );
          const placed = layoutDay(items);
          const spans = workingSpans(availability[col.shadeFor ?? ""], col.dayKey);
          const shade = col.shadeFor !== undefined && availability[col.shadeFor] !== undefined;
          return (
            <div
              key={col.key}
              className="relative border-l border-white/[0.06]"
              style={{
                height,
                backgroundImage: `repeating-linear-gradient(to bottom, transparent 0, transparent ${HOUR_PX - 1}px, rgba(255,255,255,0.06) ${HOUR_PX - 1}px, rgba(255,255,255,0.06) ${HOUR_PX}px)`,
              }}
              onClick={(e) => {
                if (e.target !== e.currentTarget) return;
                onCreate(col.dayKey, minutesAt(e, e.currentTarget), col.doctorId);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setGhost({ col: col.key, minutes: minutesAt(e, e.currentTarget) });
              }}
              onDragLeave={() => setGhost((g) => (g?.col === col.key ? null : g))}
              onDrop={(e) => {
                e.preventDefault();
                const id = e.dataTransfer.getData("text/plain");
                const appointment = appointments.find((a) => a.id === id);
                setGhost(null);
                if (appointment) onMove(appointment, col.dayKey, minutesAt(e, e.currentTarget), col.doctorId);
              }}
            >
              {/* outside working hours / day off */}
              {shade && spans === null && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-center bg-white/[0.03] pt-3">
                  <span className="rounded bg-black/40 px-2 py-0.5 text-[10px] text-os-text-dim">Day off</span>
                </div>
              )}
              {shade && spans !== null && shadeGaps(spans, startMin, endMin).map(([a, b]) => (
                <div
                  key={`${a}-${b}`}
                  className="pointer-events-none absolute inset-x-0"
                  style={{
                    top: ((a - startMin) / 60) * HOUR_PX,
                    height: ((b - a) / 60) * HOUR_PX,
                    background: "repeating-linear-gradient(135deg, rgba(255,255,255,0.035) 0 6px, transparent 6px 12px)",
                  }}
                />
              ))}

              {ghost?.col === col.key && (
                <div
                  className="pointer-events-none absolute inset-x-1 z-10 rounded border border-dashed border-cyan-400/70 bg-cyan-400/10"
                  style={{ top: ((ghost.minutes - startMin) / 60) * HOUR_PX, height: HOUR_PX / 2 }}
                >
                  <span className="px-1 text-[10px] text-cyan-300">{formatMinutes(ghost.minutes)}</span>
                </div>
              )}

              {col.isToday && now >= startMin && now <= endMin && (
                <div className="pointer-events-none absolute inset-x-0 z-20" style={{ top: ((now - startMin) / 60) * HOUR_PX }}>
                  <div className="relative h-px bg-rose-500">
                    <span className="absolute -left-1 -top-[3px] h-[7px] w-[7px] rounded-full bg-rose-500" />
                  </div>
                </div>
              )}

              {placed.map((p) => {
                const a = p.appointment;
                const look = STATUS_LOOK[a.status];
                const top = ((p.start - startMin) / 60) * HOUR_PX;
                const h = Math.max(24, ((p.end - p.start) / 60) * HOUR_PX - 2);
                const color = colorOf(a.doctor_id);
                const movable = a.status === "confirmed" || a.status === "requested";
                return (
                  <div
                    key={a.id}
                    role="button"
                    tabIndex={0}
                    draggable={movable}
                    onDragStart={(e) => e.dataTransfer.setData("text/plain", a.id)}
                    onDragEnd={() => setGhost(null)}
                    onClick={(e) => { e.stopPropagation(); onOpen(a); }}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(a); } }}
                    title={`${customerName(a.customer_id)} · ${formatClock(a.starts_at)} · ${look.label}`}
                    className={`absolute overflow-hidden rounded-md px-1.5 py-1 text-left text-[11px] leading-tight outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400 ${
                      movable ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
                    } ${look.faded ? "opacity-60" : ""}`}
                    style={{
                      top,
                      height: h,
                      left: `calc(${(p.lane / p.lanes) * 100}% + 2px)`,
                      width: `calc(${100 / p.lanes}% - 4px)`,
                      background: look.fill,
                      color: look.text,
                      borderLeft: `3px solid ${color}`,
                      outline: look.dashed ? `1px dashed ${look.text}` : undefined,
                    }}
                  >
                    <div className={`truncate font-semibold ${look.strike ? "line-through" : ""}`}>{customerName(a.customer_id)}</div>
                    {h >= 38 && (
                      <div className="truncate opacity-80">
                        {formatClock(a.starts_at)}
                        {showProvider ? ` · ${a.doctor_name}` : ""}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** The parts of the visible day that fall outside the working spans. */
function shadeGaps(spans: [number, number][], from: number, to: number): [number, number][] {
  if (spans.length === 0) return [[from, to]];
  const gaps: [number, number][] = [];
  let cursor = from;
  for (const [a, b] of spans) {
    if (a > cursor) gaps.push([cursor, Math.min(a, to)]);
    cursor = Math.max(cursor, b);
  }
  if (cursor < to) gaps.push([cursor, to]);
  return gaps.filter(([a, b]) => b > a);
}
