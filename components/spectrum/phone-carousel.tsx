"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp } from "lucide-react";

const CONVERSATIONS = [
  { name: "Priya D.", note: "Asked for pricing twice", tag: "HOT", color: "text-thread-bright" },
  { name: "Rahul M.", note: "Ready to book a demo", tag: "READY", color: "text-seal-bright" },
  { name: "Vikram S.", note: "No reply in 4 days", tag: "COLD", color: "text-os-text-dim" },
  { name: "Anjali K.", note: "Wants a callback", tag: "HOT", color: "text-thread-bright" },
];

const QUOTES = [
  { name: "Sharma & Co.", amount: "₹18,000", overdue: "14 days overdue" },
  { name: "Kapoor Interiors", amount: "₹22,500", overdue: "9 days overdue" },
  { name: "Verma Textiles", amount: "₹6,500", overdue: "21 days overdue" },
];

function BriefingScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        8:00 AM · Daily briefing
      </div>
      <div className="rounded-lg rounded-bl-sm border border-teal/30 bg-teal/[0.06] px-3 py-2 text-[11px] leading-relaxed text-os-ink">
        Good morning. 3 hot leads need replies today.
      </div>
      <div className="rounded-lg rounded-bl-sm border border-os-border bg-os-card px-3 py-2 text-[11px] leading-relaxed text-os-ink/90">
        2 going cold: Vikram &amp; Sneha (4+ days silent)
      </div>
      <div className="rounded-lg rounded-bl-sm border border-os-border bg-os-card px-3 py-2 text-[11px] leading-relaxed text-os-ink/90">
        ₹47,000 in unpaid quotes — reply YES to send reminders.
      </div>
    </div>
  );
}

function ConversationsScreen() {
  return (
    <div className="space-y-1.5">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        Conversations · All channels
      </div>
      {CONVERSATIONS.map((c) => (
        <div
          key={c.name}
          className="flex items-center gap-2.5 rounded-lg border border-os-border bg-os-card px-3 py-2.5"
        >
          <div className="flex size-7 shrink-0 items-center justify-center rounded-full border border-os-border bg-os-bg text-[10px] font-semibold text-os-ink">
            {c.name[0]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-[11px] font-medium text-os-ink">{c.name}</div>
            <div className="truncate text-[10px] text-os-text-dim">{c.note}</div>
          </div>
          <span className={`shrink-0 font-mono text-[9px] font-bold tracking-wider ${c.color}`}>{c.tag}</span>
        </div>
      ))}
    </div>
  );
}

function IntelligenceScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        Customer intelligence
      </div>
      <div className="rounded-lg border border-os-border bg-os-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-os-ink">Priya D.</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-seal-bright">Healthy</span>
        </div>
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-os-bg">
          <div className="h-full w-[82%] rounded-full bg-seal" />
        </div>
        <div className="text-[9px] text-os-text-dim">Health score · 82/100</div>
      </div>
      <div className="rounded-lg border border-os-border bg-os-card p-3.5">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-[11px] font-semibold text-os-ink">Vikram S.</span>
          <span className="font-mono text-[9px] uppercase tracking-widest text-thread-bright">At risk</span>
        </div>
        <div className="mb-1.5 h-1.5 overflow-hidden rounded-full bg-os-bg">
          <div className="h-full w-[28%] rounded-full bg-thread" />
        </div>
        <div className="text-[9px] text-os-text-dim">Health score · 28/100 · churn risk high</div>
      </div>
      <div className="flex items-center gap-2 text-[10px] text-os-text-dim">
        <TrendingUp size={12} className="shrink-0 text-teal" /> Energy trending up this week
      </div>
    </div>
  );
}

function RevenueScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        Revenue leaks
      </div>
      <div className="rounded-lg border border-thread/30 bg-thread/[0.06] px-3 py-2.5 text-[11px] text-os-ink">
        ₹47,000 stuck in unpaid quotes
      </div>
      <div className="space-y-1.5">
        {QUOTES.map((q) => (
          <div
            key={q.name}
            className="flex items-center justify-between rounded-lg border border-os-border bg-os-card px-3 py-2.5"
          >
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium text-os-ink">{q.name}</div>
              <div className="text-[10px] text-os-text-dim">{q.overdue}</div>
            </div>
            <span className="shrink-0 font-mono text-[10px] font-bold text-thread-bright">{q.amount}</span>
          </div>
        ))}
      </div>
      <button className="w-full rounded-lg bg-teal py-2 text-[11px] font-semibold text-os-bg">
        Send reminders
      </button>
    </div>
  );
}

const SCREENS = [
  { id: "briefing", label: "Briefing", node: <BriefingScreen /> },
  { id: "conversations", label: "Inbox", node: <ConversationsScreen /> },
  { id: "intelligence", label: "Health", node: <IntelligenceScreen /> },
  { id: "revenue", label: "Revenue", node: <RevenueScreen /> },
];

const AUTOPLAY_MS = 4000;

/**
 * A single phone frame cycling through several KROVA product screens —
 * demo-reel style, not a static screenshot. Auto-advances, pauses on hover,
 * and the dots below double as manual controls.
 */
export function PhoneCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setActive((a) => (a + 1) % SCREENS.length), AUTOPLAY_MS);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <div className="relative mx-auto w-[280px]">
      <div
        className="relative overflow-hidden rounded-[2rem] border border-os-border bg-os-card"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute left-1/2 top-0 z-20 h-5 w-20 -translate-x-1/2 rounded-b-xl bg-os-bg" />

        <div className="flex items-center justify-between border-b border-os-border px-4 pb-3 pt-9">
          <div className="flex items-center gap-2">
            <div className="flex size-7 items-center justify-center rounded-full border border-os-border">
              <span className="font-serif text-[10px] text-teal">K</span>
            </div>
            <span className="text-xs font-semibold text-os-ink">KROVA</span>
          </div>
          <span className="font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
            {SCREENS[active].label}
          </span>
        </div>

        <div className="relative h-[420px] overflow-hidden bg-os-bg/60">
          <AnimatePresence mode="wait">
            <motion.div
              key={SCREENS[active].id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 px-3 py-4"
            >
              {SCREENS[active].node}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-center gap-1.5">
        {SCREENS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => setActive(i)}
            aria-label={`Show ${s.label} screen`}
            className={`h-1.5 rounded-full transition-all duration-300 ${
              i === active ? "w-6 bg-teal" : "w-1.5 bg-os-border hover:bg-os-border-bright"
            }`}
          />
        ))}
      </div>

      <div className="absolute -right-8 top-16 rounded-md border border-os-border bg-os-card px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        8 AM IST
      </div>
    </div>
  );
}
