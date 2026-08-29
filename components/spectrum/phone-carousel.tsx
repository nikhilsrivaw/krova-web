"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { TrendingUp, Flame, Snowflake, IndianRupee, Sparkles } from "lucide-react";

/** A small SVG donut used for health/portfolio scores — center text stays upright. */
function RadialProgress({
  value,
  size = 60,
  strokeWidth = 5,
  color = "#00A387",
  trackColor = "#2B2B2B",
}: {
  value: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[12px] font-bold text-os-ink">{value}</span>
      </div>
    </div>
  );
}

const STATS = [
  { label: "Hot leads", value: "3", icon: <Flame size={13} className="text-thread-bright" />, tint: "border-thread/30 bg-thread/[0.06]" },
  { label: "Going cold", value: "2", icon: <Snowflake size={13} className="text-os-text-dim" />, tint: "border-os-border bg-os-card" },
  { label: "Revenue risk", value: "₹47k", icon: <IndianRupee size={13} className="text-thread-bright" />, tint: "border-thread/30 bg-thread/[0.06]" },
  { label: "Drafts ready", value: "5", icon: <Sparkles size={13} className="text-teal" />, tint: "border-teal/30 bg-teal/[0.06]" },
];

const WEEK_BARS = [40, 65, 50, 80, 60, 90, 70];

function DashboardScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        Good morning
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-os-border bg-os-card p-4">
        <RadialProgress value={78} />
        <div>
          <div className="text-[11px] font-semibold text-os-ink">Portfolio health</div>
          <div className="text-[10px] text-os-text-dim">78/100 · trending up</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {STATS.map((s) => (
          <div key={s.label} className={`rounded-lg border p-2.5 ${s.tint}`}>
            {s.icon}
            <div className="mt-1.5 text-[15px] font-bold leading-none text-os-ink">{s.value}</div>
            <div className="mt-1 text-[9px] text-os-text-dim">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-lg border border-os-border bg-os-card p-3">
        <div className="mb-2 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
          Messages this week
        </div>
        <div className="flex h-10 items-end gap-1.5">
          {WEEK_BARS.map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-teal/70" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function BriefingScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        8:00 AM · Daily briefing
      </div>
      <div className="flex gap-1.5">
        <span className="rounded-full border border-thread/30 bg-thread/[0.06] px-2 py-1 font-mono text-[9px] font-bold text-thread-bright">
          3 HOT
        </span>
        <span className="rounded-full border border-os-border bg-os-card px-2 py-1 font-mono text-[9px] font-bold text-os-text-dim">
          2 COLD
        </span>
        <span className="rounded-full border border-teal/30 bg-teal/[0.06] px-2 py-1 font-mono text-[9px] font-bold text-teal-bright">
          ₹47K
        </span>
      </div>
      <div className="flex items-start gap-2">
        <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-teal/30 bg-teal/[0.06]">
          <span className="font-serif text-[9px] text-teal">K</span>
        </div>
        <div className="rounded-lg rounded-bl-sm border border-teal/30 bg-teal/[0.06] px-3 py-2 text-[11px] leading-relaxed text-os-ink">
          Good morning. 3 hot leads need replies today.
        </div>
      </div>
      <div className="ml-7 rounded-lg rounded-bl-sm border border-os-border bg-os-card px-3 py-2 text-[11px] leading-relaxed text-os-ink/90">
        2 going cold: Vikram &amp; Sneha (4+ days silent)
      </div>
      <div className="ml-7 rounded-lg rounded-bl-sm border border-os-border bg-os-card px-3 py-2 text-[11px] leading-relaxed text-os-ink/90">
        ₹47,000 in unpaid quotes — reply YES to send reminders.
      </div>
    </div>
  );
}

const CONVERSATIONS = [
  { name: "Priya D.", note: "Asked for pricing twice", tag: "HOT", tagColor: "text-thread-bright", ring: "bg-thread/15", dot: "bg-thread" },
  { name: "Rahul M.", note: "Ready to book a demo", tag: "READY", tagColor: "text-seal-bright", ring: "bg-seal/15", dot: "bg-seal" },
  { name: "Vikram S.", note: "No reply in 4 days", tag: "COLD", tagColor: "text-os-text-dim", ring: "bg-os-border", dot: "bg-os-border-bright" },
  { name: "Anjali K.", note: "Wants a callback", tag: "HOT", tagColor: "text-thread-bright", ring: "bg-thread/15", dot: "bg-thread" },
];

function ConversationsScreen() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-1.5">
        {["All", "Hot", "Cold"].map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-wider ${
              i === 0 ? "bg-teal text-os-bg" : "border border-os-border text-os-text-dim"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="space-y-1.5">
        {CONVERSATIONS.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-2.5 rounded-lg border border-os-border bg-os-card px-3 py-2.5"
          >
            <div
              className={`relative flex size-8 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-os-ink ${c.ring}`}
            >
              {c.name[0]}
              <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-os-card ${c.dot}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[11px] font-medium text-os-ink">{c.name}</div>
              <div className="truncate text-[10px] text-os-text-dim">{c.note}</div>
            </div>
            <span className={`shrink-0 font-mono text-[9px] font-bold tracking-wider ${c.tagColor}`}>{c.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const CUSTOMERS = [
  { name: "Priya D.", score: 82, color: "#5B8A72", status: "Healthy", statusColor: "text-seal-bright" },
  { name: "Vikram S.", score: 28, color: "#B5473D", status: "At risk", statusColor: "text-thread-bright" },
];

function IntelligenceScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        Customer intelligence
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg border border-seal/30 bg-seal/[0.06] p-2 text-center">
          <div className="text-[15px] font-bold text-seal-bright">24</div>
          <div className="text-[8px] text-os-text-dim">Healthy</div>
        </div>
        <div className="rounded-lg border border-thread/30 bg-thread/[0.06] p-2 text-center">
          <div className="text-[15px] font-bold text-thread-bright">3</div>
          <div className="text-[8px] text-os-text-dim">At risk</div>
        </div>
        <div className="rounded-lg border border-os-border bg-os-card p-2 text-center">
          <div className="text-[15px] font-bold text-os-ink">1</div>
          <div className="text-[8px] text-os-text-dim">Churned</div>
        </div>
      </div>
      <div className="space-y-1.5">
        {CUSTOMERS.map((c) => (
          <div key={c.name} className="flex items-center gap-3 rounded-lg border border-os-border bg-os-card p-3">
            <RadialProgress value={c.score} size={38} strokeWidth={4} color={c.color} />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-semibold text-os-ink">{c.name}</div>
              <div className={`font-mono text-[9px] uppercase tracking-widest ${c.statusColor}`}>{c.status}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10px] text-os-text-dim">
        <TrendingUp size={12} className="shrink-0 text-teal" /> Energy trending up this week
      </div>
    </div>
  );
}

const QUOTES = [
  { name: "Sharma & Co.", amount: "₹18,000", overdue: "14 days overdue" },
  { name: "Kapoor Interiors", amount: "₹22,500", overdue: "9 days overdue" },
  { name: "Verma Textiles", amount: "₹6,500", overdue: "21 days overdue" },
];

const LEAK_BARS = [30, 45, 35, 55, 40, 65, 50];

function RevenueScreen() {
  return (
    <div className="space-y-3">
      <div className="mb-1 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
        Revenue leaks
      </div>
      <div className="rounded-xl border border-thread/30 bg-thread/[0.06] p-4">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[22px] font-bold leading-none text-thread-bright">₹47,000</div>
            <div className="mt-1 text-[10px] text-os-text-dim">stuck in unpaid quotes</div>
          </div>
          <span className="flex items-center gap-0.5 rounded-full bg-thread/15 px-2 py-1 font-mono text-[9px] font-bold text-thread-bright">
            <TrendingUp size={10} /> +12%
          </span>
        </div>
        <div className="mt-3 flex h-8 items-end gap-1">
          {LEAK_BARS.map((h, i) => (
            <div key={i} className="flex-1 rounded-t bg-thread/50" style={{ height: `${h}%` }} />
          ))}
        </div>
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
  { id: "dashboard", label: "Overview", node: <DashboardScreen /> },
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
        className="relative overflow-hidden rounded-[2rem] border border-os-border bg-os-card shadow-2xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="absolute left-1/2 top-0 z-20 flex h-5 w-20 -translate-x-1/2 items-center justify-end rounded-b-xl bg-os-bg pr-3">
          <span className="size-1.5 animate-pulse rounded-full bg-teal" />
        </div>

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

        <div className="relative h-[440px] overflow-hidden bg-os-bg/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal/10 to-transparent" />
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
    </div>
  );
}
