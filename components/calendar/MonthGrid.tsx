"use client";

import React from "react";
import type { Appointment } from "@/lib/api";
import { STATUS_LOOK, dayOf, formatClock, formatDay, monthGrid } from "./calendarUtils";

type Props = {
  anchor: string;
  today: string;
  appointments: Appointment[];
  colorOf: (doctorId: string) => string;
  customerName: (customerId: string) => string;
  onOpen: (appointment: Appointment) => void;
  onPickDay: (dayKey: string) => void;
};

const MAX_CHIPS = 3;
const WEEKDAY_HEADS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MonthGrid({ anchor, today, appointments, colorOf, customerName, onOpen, onPickDay }: Props) {
  const weeks = monthGrid(anchor);
  const byDay = new Map<string, Appointment[]>();
  for (const a of appointments) {
    const key = dayOf(a.starts_at);
    byDay.set(key, [...(byDay.get(key) ?? []), a]);
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-black/20">
      <div className="min-w-[640px]">
        <div className="grid grid-cols-7 border-b border-white/[0.08] bg-[#0b0f14]">
          {WEEKDAY_HEADS.map((d) => (
            <div key={d} className="py-2 text-center text-[11px] font-semibold uppercase tracking-wide text-os-text-dim">{d}</div>
          ))}
        </div>
        {weeks.map((week, w) => (
          <div key={w} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = day.slice(0, 7) === anchor.slice(0, 7);
              const items = byDay.get(day) ?? [];
              const extra = items.length - MAX_CHIPS;
              return (
                <div
                  key={day}
                  className={`min-h-[104px] border-l border-t border-white/[0.06] p-1.5 first:border-l-0 ${inMonth ? "" : "bg-white/[0.015]"}`}
                >
                  <button
                    type="button"
                    onClick={() => onPickDay(day)}
                    className={`mb-1 flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold cursor-pointer ${
                      day === today ? "bg-cyan-500 text-black" : inMonth ? "text-white hover:bg-white/10" : "text-os-text-dim hover:bg-white/10"
                    }`}
                    aria-label={`Open ${formatDay(day, { weekday: "long", day: "numeric", month: "long" })}`}
                  >
                    {Number(day.slice(8))}
                  </button>
                  <div className="space-y-0.5">
                    {items.slice(0, MAX_CHIPS).map((a) => {
                      const look = STATUS_LOOK[a.status];
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => onOpen(a)}
                          className={`flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[10px] cursor-pointer ${look.faded ? "opacity-60" : ""}`}
                          style={{ background: look.fill, color: look.text, borderLeft: `2px solid ${colorOf(a.doctor_id)}` }}
                        >
                          <span className="shrink-0 opacity-80">{formatClock(a.starts_at)}</span>
                          <span className={`truncate ${look.strike ? "line-through" : ""}`}>{customerName(a.customer_id)}</span>
                        </button>
                      );
                    })}
                    {extra > 0 && (
                      <button
                        type="button"
                        onClick={() => onPickDay(day)}
                        className="w-full rounded px-1 text-left text-[10px] font-semibold text-cyan-400 hover:underline cursor-pointer"
                      >
                        +{extra} more
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
