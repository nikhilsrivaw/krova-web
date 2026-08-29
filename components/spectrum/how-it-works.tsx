"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from "motion/react";
import { Sun, Sparkles } from "lucide-react";
import { FaWhatsapp, FaInstagram } from "react-icons/fa6";
import { SiGmail } from "react-icons/si";

/** Outlook doesn't have a maintained icon in any open icon set — a small stand-in mark. */
function OutlookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="1" y="4" width="15" height="16" rx="2" fill="#0A66C2" />
      <circle cx="8.5" cy="12" r="4.5" fill="none" stroke="white" strokeWidth="1.6" />
      <path d="M15 7h7.5A1.5 1.5 0 0 1 24 8.5v7A1.5 1.5 0 0 1 22.5 17H15V7Z" fill="#28A8EA" />
      <path d="M15 7h7.5A1.5 1.5 0 0 1 24 8.5v.2l-9 5.4V7Z" fill="#0364B8" />
    </svg>
  );
}

const STEPS = [
  {
    n: "01",
    title: "Connect what you already use",
    body: "Your own WhatsApp Business account, Instagram DMs, Gmail, Outlook. No new inbox to check.",
  },
  {
    n: "02",
    title: "KROVA reads, every night",
    body: "Every conversation gets scored — who's hot, who's going cold, what was promised and never delivered.",
  },
  {
    n: "03",
    title: "You get the brief, not the busywork",
    body: "8 AM on WhatsApp: who to talk to first, drafts ready to approve, money left on the table.",
  },
];

const CHANNELS = [
  { icon: <FaWhatsapp size={18} color="#25D366" />, label: "WhatsApp" },
  { icon: <FaInstagram size={18} color="#E4405F" />, label: "Instagram" },
  { icon: <SiGmail size={18} color="#EA4335" />, label: "Gmail" },
  { icon: <OutlookIcon size={18} />, label: "Outlook" },
];

const LEDGER_ENTRIES = [
  { name: "Priya D.", note: "Going cold — no reply in 4 days", tag: "ACT", tagColor: "text-thread-bright" },
  { name: "Rahul M.", note: "Asked for pricing twice · draft ready", tag: "READY", tagColor: "text-seal-bright" },
  { name: "Anjali K.", note: "Reply drafted, matches your tone", tag: "DRAFT", tagColor: "text-teal-bright" },
  { name: "3 unpaid quotes", note: "₹47,000 stuck · 12+ days old", tag: "₹47,000", tagColor: "text-thread-bright" },
];

function ChannelsVisual() {
  return (
    <div className="w-full rounded-lg border border-os-border bg-os-card p-8">
      <div className="grid grid-cols-2 gap-4">
        {CHANNELS.map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-md border border-os-border bg-os-bg px-4 py-3.5">
            <span className="shrink-0">{c.icon}</span>
            <span className="text-sm font-medium text-os-ink">{c.label}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest text-os-text-dim">
        <span className="size-1.5 rounded-full bg-seal" />
        All four feed one AI brain
      </div>
    </div>
  );
}

function ScoringVisual() {
  return (
    <div className="w-full rounded-lg border border-os-border bg-os-card overflow-hidden">
      <div className="h-10 border-b border-os-border flex items-center justify-between px-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim">Tonight&rsquo;s scoring</span>
        <div className="flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-seal animate-pulse" />
          <span className="font-mono text-[9px] uppercase tracking-widest text-os-text-dim">Reading</span>
        </div>
      </div>
      <div className="divide-y divide-os-border">
        {LEDGER_ENTRIES.map((entry) => (
          <div key={entry.name} className="flex items-center gap-3 px-4 py-3.5">
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium text-os-ink truncate">{entry.name}</div>
              <div className="text-[11px] text-os-text-dim truncate">{entry.note}</div>
            </div>
            <span className={`font-mono text-[10px] font-bold tracking-wider shrink-0 ${entry.tagColor}`}>{entry.tag}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BriefingVisual() {
  return (
    <div className="w-full rounded-lg border border-os-border bg-os-card p-6">
      <div className="flex items-center gap-2 mb-4">
        <Sun size={14} className="text-teal" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
          8:00 AM · Delivered on WhatsApp
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="rounded-lg rounded-bl-sm border border-teal/30 bg-teal/[0.06] px-3 py-2 text-[13px] text-os-ink">
          3 hot leads need replies today. 2 going cold — act in 24h.
        </div>
        <div className="rounded-lg rounded-bl-sm border border-os-border bg-os-bg px-3 py-2 text-[13px] text-os-ink/90 flex items-center gap-2">
          <Sparkles size={12} className="text-teal shrink-0" />
          3 drafts ready — just approve.
        </div>
      </div>
    </div>
  );
}

const VISUALS = [<ChannelsVisual key="channels" />, <ScoringVisual key="scoring" />, <BriefingVisual key="briefing" />];

/**
 * The whole section pins in the middle of the viewport for STEPS.length
 * screens' worth of scroll — only the active step (and its visual) swaps as
 * you scroll, then the section releases and the page continues normally.
 * Driven by scroll progress through the tall wrapper, not a real pin/unpin
 * library (no GSAP ScrollTrigger dependency here) — `position: sticky` plus
 * `useScroll` gets the same effect without adding a new dependency.
 */
export function HowItWorks() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const idx = Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)));
    setActive(idx);
  });

  return (
    <div ref={containerRef} className="relative" style={{ height: `${STEPS.length * 100}vh` }}>
      <div className="sticky top-0 min-h-screen flex items-center pt-44 sm:pt-48 md:pt-52 pb-16 px-6">
        <div className="max-w-5xl w-full mx-auto">
          <div className="relative max-w-xl mb-12">
            <Image
              src="/images/how-it-works-mascot.webp"
              alt=""
              width={1536}
              height={1024}
              quality={95}
              className="absolute left-0 -top-[5.3rem] sm:-top-[6.5rem] md:-top-32 w-32 sm:w-40 md:w-48 h-auto z-10 select-none pointer-events-none"
            />
            <div className="font-mono text-sm sm:text-base uppercase tracking-[0.2em] text-teal-bright mb-4">
              How it works
            </div>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              Channels in. Decisions out.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-10 md:gap-16 items-center">
            {/* Mobile: progress bar + active step only */}
            <div className="md:hidden">
              <div className="flex items-center mb-6">
                {STEPS.map((step, i) => (
                  <div key={step.n} className="flex items-center flex-1 last:flex-none">
                    <span
                      className={`shrink-0 flex items-center justify-center size-6 rounded-full border font-mono text-[10px] font-bold transition-colors duration-300 ${
                        i <= active ? "bg-teal border-teal text-os-bg" : "bg-transparent border-os-border-bright text-os-text-dim"
                      }`}
                    >
                      {i + 1}
                    </span>
                    {i < STEPS.length - 1 && (
                      <span
                        className={`h-px flex-1 mx-1.5 transition-colors duration-300 ${
                          i < active ? "bg-teal" : "bg-os-border"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="font-serif text-xl text-teal mb-1">{STEPS[active].n}</div>
                  <h3 className="text-base font-semibold mb-1.5 text-os-ink">{STEPS[active].title}</h3>
                  <p className="text-sm text-os-text-dim leading-relaxed">{STEPS[active].body}</p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Desktop: full numbered stepper, active one highlighted */}
            <div className="hidden md:block space-y-10">
              {STEPS.map((step, i) => {
                const isActive = active === i;
                return (
                  <div key={step.n} className="flex gap-5">
                    <div className="flex flex-col items-center pt-1">
                      <span
                        className={`size-2.5 rounded-full border transition-colors duration-300 ${
                          isActive ? "bg-teal border-teal" : "bg-transparent border-os-border-bright"
                        }`}
                      />
                      {i < STEPS.length - 1 && <span className="w-px flex-1 mt-2 bg-os-border" />}
                    </div>
                    <div className={`pb-2 transition-opacity duration-300 ${isActive ? "opacity-100" : "opacity-40"}`}>
                      <div className={`font-serif text-xl mb-1 transition-colors duration-300 ${isActive ? "text-teal" : "text-os-text-dim"}`}>
                        {step.n}
                      </div>
                      <h3 className={`text-base font-semibold mb-1.5 transition-colors duration-300 ${isActive ? "text-os-ink" : "text-os-text-dim"}`}>
                        {step.title}
                      </h3>
                      <p className="text-sm text-os-text-dim leading-relaxed max-w-xs">{step.body}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="relative h-[260px] sm:h-[300px] md:h-[320px]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-0"
                >
                  {VISUALS[active]}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
