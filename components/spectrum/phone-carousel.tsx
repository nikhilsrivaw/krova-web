"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  TrendingUp,
  Flame,
  Snowflake,
  IndianRupee,
  Sparkles,
  Wifi,
  BatteryFull,
  SignalHigh,
  Home,
  Sun,
  MessageCircle,
  Activity,
} from "lucide-react";

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
          style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[13px] font-bold text-os-ink">{value}</span>
      </div>
    </div>
  );
}

/** Circular tinted icon chip — the "icon badge" every stat/list row uses. */
function IconBadge({
  icon,
  tint,
  size = 30,
}: {
  icon: React.ReactNode;
  tint: string;
  size?: number;
}) {
  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-full ${tint}`}
      style={{ width: size, height: size }}
    >
      {icon}
    </div>
  );
}

/** Gradient-filled initial avatar with a tiny status dot. */
function Avatar({ letter, from, to, dot }: { letter: string; from: string; to: string; dot: string }) {
  return (
    <div className="relative shrink-0">
      <div
        className="flex size-9 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-md"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      >
        {letter}
      </div>
      <span className={`absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-os-card ${dot}`} />
    </div>
  );
}

const STATS = [
  { label: "Hot leads", value: "3", icon: <Flame size={14} className="text-thread-bright" />, tint: "bg-thread/15", card: "border-thread/30 bg-thread/[0.06]" },
  { label: "Going cold", value: "2", icon: <Snowflake size={14} className="text-os-text-dim" />, tint: "bg-os-border", card: "border-os-border bg-os-card" },
  { label: "Revenue risk", value: "₹47k", icon: <IndianRupee size={14} className="text-thread-bright" />, tint: "bg-thread/15", card: "border-thread/30 bg-thread/[0.06]" },
  { label: "Drafts ready", value: "5", icon: <Sparkles size={14} className="text-teal" />, tint: "bg-teal/15", card: "border-teal/30 bg-teal/[0.06]" },
];

const WEEK_BARS = [40, 65, 50, 80, 60, 90, 70];

function DashboardScreen() {
  return (
    <div className="space-y-3.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
        Good morning
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-os-border bg-os-card p-4 shadow-sm">
        <RadialProgress value={78} />
        <div>
          <div className="text-[12px] font-semibold text-os-ink">Portfolio health</div>
          <div className="text-[10px] text-os-text-dim">78/100 · trending up</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {STATS.map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 shadow-sm ${s.card}`}>
            <IconBadge icon={s.icon} tint={s.tint} />
            <div className="mt-2 text-[17px] font-bold leading-none text-os-ink">{s.value}</div>
            <div className="mt-1 text-[9.5px] text-os-text-dim">{s.label}</div>
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-os-border bg-os-card p-3.5 shadow-sm">
        <div className="mb-2.5 font-mono text-[9.5px] uppercase tracking-widest text-os-text-dim">
          Messages this week
        </div>
        <div className="flex h-11 items-end gap-1.5">
          {WEEK_BARS.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t-sm bg-gradient-to-t from-teal/40 to-teal"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function BriefingScreen() {
  return (
    <div className="space-y-3.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
        8:00 AM · Daily briefing
      </div>
      <div className="flex gap-1.5">
        <span className="rounded-full border border-thread/30 bg-thread/[0.06] px-2.5 py-1 font-mono text-[9.5px] font-bold text-thread-bright">
          3 HOT
        </span>
        <span className="rounded-full border border-os-border bg-os-card px-2.5 py-1 font-mono text-[9.5px] font-bold text-os-text-dim">
          2 COLD
        </span>
        <span className="rounded-full border border-teal/30 bg-teal/[0.06] px-2.5 py-1 font-mono text-[9.5px] font-bold text-teal-bright">
          ₹47K
        </span>
      </div>
      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-teal/30 bg-teal/[0.06] shadow-sm">
          <span className="font-serif text-[10px] text-teal">K</span>
        </div>
        <div className="rounded-xl rounded-bl-sm border border-teal/30 bg-teal/[0.06] px-3.5 py-2.5 text-[12px] leading-relaxed text-os-ink shadow-sm">
          Good morning. 3 hot leads need replies today.
        </div>
      </div>
      <div className="ml-8 rounded-xl rounded-bl-sm border border-os-border bg-os-card px-3.5 py-2.5 text-[12px] leading-relaxed text-os-ink/90 shadow-sm">
        2 going cold: Vikram &amp; Sneha (4+ days silent)
      </div>
      <div className="ml-8 rounded-xl rounded-bl-sm border border-os-border bg-os-card px-3.5 py-2.5 text-[12px] leading-relaxed text-os-ink/90 shadow-sm">
        ₹47,000 in unpaid quotes — reply YES to send reminders.
      </div>
    </div>
  );
}

const CONVERSATIONS = [
  { name: "Priya D.", note: "Asked for pricing twice", tag: "HOT", tagColor: "text-thread-bright", from: "#D0655A", to: "#8A362F", dot: "bg-thread" },
  { name: "Rahul M.", note: "Ready to book a demo", tag: "READY", tagColor: "text-seal-bright", from: "#79AB90", to: "#466B58", dot: "bg-seal" },
  { name: "Vikram S.", note: "No reply in 4 days", tag: "COLD", tagColor: "text-os-text-dim", from: "#3D3D3D", to: "#1A1A1A", dot: "bg-os-border-bright" },
  { name: "Anjali K.", note: "Wants a callback", tag: "HOT", tagColor: "text-thread-bright", from: "#D0655A", to: "#8A362F", dot: "bg-thread" },
];

function ConversationsScreen() {
  return (
    <div className="space-y-3.5">
      <div className="flex items-center gap-1.5">
        {["All", "Hot", "Cold"].map((t, i) => (
          <span
            key={t}
            className={`rounded-full px-3 py-1 font-mono text-[9.5px] font-bold uppercase tracking-wider ${
              i === 0 ? "bg-teal text-os-bg shadow-sm" : "border border-os-border text-os-text-dim"
            }`}
          >
            {t}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {CONVERSATIONS.map((c) => (
          <div
            key={c.name}
            className="flex items-center gap-3 rounded-xl border border-os-border bg-os-card px-3.5 py-3 shadow-sm"
          >
            <Avatar letter={c.name[0]} from={c.from} to={c.to} dot={c.dot} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-medium text-os-ink">{c.name}</div>
              <div className="truncate text-[10px] text-os-text-dim">{c.note}</div>
            </div>
            <span className={`shrink-0 font-mono text-[9.5px] font-bold tracking-wider ${c.tagColor}`}>{c.tag}</span>
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
    <div className="space-y-3.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
        Customer intelligence
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div className="rounded-xl border border-seal/30 bg-seal/[0.06] p-2.5 text-center shadow-sm">
          <div className="text-[17px] font-bold text-seal-bright">24</div>
          <div className="text-[8.5px] text-os-text-dim">Healthy</div>
        </div>
        <div className="rounded-xl border border-thread/30 bg-thread/[0.06] p-2.5 text-center shadow-sm">
          <div className="text-[17px] font-bold text-thread-bright">3</div>
          <div className="text-[8.5px] text-os-text-dim">At risk</div>
        </div>
        <div className="rounded-xl border border-os-border bg-os-card p-2.5 text-center shadow-sm">
          <div className="text-[17px] font-bold text-os-ink">1</div>
          <div className="text-[8.5px] text-os-text-dim">Churned</div>
        </div>
      </div>
      <div className="space-y-2">
        {CUSTOMERS.map((c) => (
          <div key={c.name} className="flex items-center gap-3.5 rounded-xl border border-os-border bg-os-card p-3.5 shadow-sm">
            <RadialProgress value={c.score} size={42} strokeWidth={4.5} color={c.color} />
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold text-os-ink">{c.name}</div>
              <div className={`font-mono text-[9.5px] uppercase tracking-widest ${c.statusColor}`}>{c.status}</div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-2 text-[10.5px] text-os-text-dim">
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
    <div className="space-y-3.5">
      <div className="mb-1 font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
        Revenue leaks
      </div>
      <div className="rounded-xl border border-thread/30 bg-thread/[0.06] p-4 shadow-sm">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[24px] font-bold leading-none text-thread-bright">₹47,000</div>
            <div className="mt-1.5 text-[10px] text-os-text-dim">stuck in unpaid quotes</div>
          </div>
          <span className="flex items-center gap-0.5 rounded-full bg-thread/15 px-2 py-1 font-mono text-[9.5px] font-bold text-thread-bright">
            <TrendingUp size={10} /> +12%
          </span>
        </div>
        <div className="mt-3.5 flex h-9 items-end gap-1">
          {LEAK_BARS.map((h, i) => (
            <div key={i} className="flex-1 rounded-t-sm bg-gradient-to-t from-thread/30 to-thread" style={{ height: `${h}%` }} />
          ))}
        </div>
      </div>
      <div className="space-y-2">
        {QUOTES.map((q) => (
          <div
            key={q.name}
            className="flex items-center justify-between rounded-xl border border-os-border bg-os-card px-3.5 py-3 shadow-sm"
          >
            <div className="min-w-0">
              <div className="truncate text-[12px] font-medium text-os-ink">{q.name}</div>
              <div className="text-[10px] text-os-text-dim">{q.overdue}</div>
            </div>
            <span className="shrink-0 font-mono text-[10.5px] font-bold text-thread-bright">{q.amount}</span>
          </div>
        ))}
      </div>
      <button className="w-full rounded-xl bg-teal py-2.5 text-[12px] font-semibold text-os-bg shadow-sm">
        Send reminders
      </button>
    </div>
  );
}

const SCREENS = [
  { id: "dashboard", label: "Overview", tabIcon: <Home size={17} />, node: <DashboardScreen /> },
  { id: "briefing", label: "Briefing", tabIcon: <Sun size={17} />, node: <BriefingScreen /> },
  { id: "conversations", label: "Inbox", tabIcon: <MessageCircle size={17} />, node: <ConversationsScreen /> },
  { id: "intelligence", label: "Health", tabIcon: <Activity size={17} />, node: <IntelligenceScreen /> },
  { id: "revenue", label: "Revenue", tabIcon: <IndianRupee size={17} />, node: <RevenueScreen /> },
];

const AUTOPLAY_MS = 4000;

/**
 * A single phone frame cycling through several KROVA product screens —
 * demo-reel style, not a static screenshot. Real app chrome (status bar,
 * bottom tab bar) instead of a generic carousel, so it reads as product UI
 * rather than a slideshow. Auto-advances, pauses on hover; the tab bar
 * doubles as manual navigation.
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

        {/* Status bar */}
        <div className="flex items-center justify-between px-5 pb-1 pt-2.5 text-os-ink">
          <span className="text-[11px] font-semibold tabular-nums">9:41</span>
          <div className="flex items-center gap-1.5">
            <SignalHigh size={12} />
            <Wifi size={12} />
            <BatteryFull size={14} />
          </div>
        </div>

        <div className="flex items-center justify-between border-b border-os-border px-4 pb-3 pt-1.5">
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

        <div className="relative h-[400px] overflow-hidden bg-os-bg/60">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-teal/10 to-transparent" />
          <AnimatePresence mode="wait">
            <motion.div
              key={SCREENS[active].id}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.35 }}
              className="absolute inset-0 px-3.5 py-4"
            >
              {SCREENS[active].node}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Bottom tab bar */}
        <div className="flex items-center justify-around border-t border-os-border bg-os-card/80 px-2 py-3 backdrop-blur">
          {SCREENS.map((s, i) => {
            const isActive = active === i;
            return (
              <button
                key={s.id}
                onClick={() => setActive(i)}
                aria-label={`Show ${s.label} screen`}
                className={`flex flex-col items-center gap-1 rounded-lg px-2.5 py-1 transition-colors duration-300 ${
                  isActive ? "text-teal" : "text-os-text-dim hover:text-os-ink"
                }`}
              >
                {s.tabIcon}
                {isActive && <span className="size-1 rounded-full bg-teal" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
