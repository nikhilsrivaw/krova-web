"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { MessageSquare, Instagram, Mail, Inbox, Sun, Sparkles } from "lucide-react";

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
  { icon: <MessageSquare size={18} />, label: "WhatsApp" },
  { icon: <Instagram size={18} />, label: "Instagram" },
  { icon: <Mail size={18} />, label: "Gmail" },
  { icon: <Inbox size={18} />, label: "Outlook" },
];

const LEDGER_ENTRIES = [
  { name: "Priya D.", note: "Going cold — no reply in 4 days", tag: "ACT", tagColor: "text-thread-bright" },
  { name: "Rahul M.", note: "Asked for pricing twice · draft ready", tag: "READY", tagColor: "text-seal-bright" },
  { name: "Anjali K.", note: "Reply drafted, matches your tone", tag: "DRAFT", tagColor: "text-brass-bright" },
  { name: "3 unpaid quotes", note: "₹47,000 stuck · 12+ days old", tag: "₹47,000", tagColor: "text-thread-bright" },
];

function ChannelsVisual() {
  return (
    <div className="w-full rounded-lg border border-os-border bg-os-card p-8">
      <div className="grid grid-cols-2 gap-4">
        {CHANNELS.map((c) => (
          <div key={c.label} className="flex items-center gap-3 rounded-md border border-os-border bg-os-bg px-4 py-3.5">
            <span className="text-brass">{c.icon}</span>
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
        <Sun size={14} className="text-brass" />
        <span className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
          8:00 AM · Delivered on WhatsApp
        </span>
      </div>
      <div className="space-y-2.5">
        <div className="rounded-lg rounded-bl-sm border border-brass/30 bg-brass/[0.06] px-3 py-2 text-[13px] text-os-ink">
          3 hot leads need replies today. 2 going cold — act in 24h.
        </div>
        <div className="rounded-lg rounded-bl-sm border border-os-border bg-os-bg px-3 py-2 text-[13px] text-os-ink/90 flex items-center gap-2">
          <Sparkles size={12} className="text-brass shrink-0" />
          3 drafts ready — just approve.
        </div>
      </div>
    </div>
  );
}

const VISUALS = [<ChannelsVisual key="channels" />, <ScoringVisual key="scoring" />, <BriefingVisual key="briefing" />];

function Panel({ onEnter, children }: { onEnter: () => void; children: React.ReactNode }) {
  return (
    <motion.div
      onViewportEnter={onEnter}
      viewport={{ margin: "-42% 0px -42% 0px" }}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="min-h-[60vh] flex items-center"
    >
      {children}
    </motion.div>
  );
}

export function HowItWorks() {
  const [active, setActive] = useState(0);
  const stepRefs = useRef<(HTMLDivElement | null)[]>([]);

  return (
    <>
      {/* Desktop: sticky numbered stepper synced to scroll-linked visuals */}
      <div className="hidden md:grid md:grid-cols-2 gap-16">
        <div className="sticky top-32 h-fit space-y-10">
          {STEPS.map((step, i) => {
            const isActive = active === i;
            return (
              <div
                key={step.n}
                ref={(el) => {
                  stepRefs.current[i] = el;
                }}
                className="flex gap-5 cursor-pointer"
                onClick={() => stepRefs.current[i]?.scrollIntoView({ behavior: "smooth", block: "center" })}
              >
                <div className="flex flex-col items-center pt-1">
                  <span
                    className={`size-2.5 rounded-full border transition-colors ${
                      isActive ? "bg-brass border-brass" : "bg-transparent border-os-border-bright"
                    }`}
                  />
                  {i < STEPS.length - 1 && <span className="w-px flex-1 mt-2 bg-os-border" />}
                </div>
                <div className="pb-2">
                  <div className={`font-serif text-xl mb-1 transition-colors ${isActive ? "text-brass" : "text-os-text-dim"}`}>
                    {step.n}
                  </div>
                  <h3 className={`text-base font-semibold mb-1.5 transition-colors ${isActive ? "text-os-ink" : "text-os-text-dim"}`}>
                    {step.title}
                  </h3>
                  <p className="text-sm text-os-text-dim leading-relaxed max-w-xs">{step.body}</p>
                </div>
              </div>
            );
          })}
        </div>

        <div>
          {STEPS.map((step, i) => (
            <Panel key={step.n} onEnter={() => setActive(i)}>
              {VISUALS[i]}
            </Panel>
          ))}
        </div>
      </div>

      {/* Mobile: each step paired directly with its visual, no scroll-sync */}
      <div className="md:hidden space-y-14">
        {STEPS.map((step, i) => (
          <div key={step.n}>
            <div className="flex items-start gap-4 mb-5">
              <div className="font-serif text-xl text-brass shrink-0">{step.n}</div>
              <div>
                <h3 className="text-base font-semibold mb-1.5 text-os-ink">{step.title}</h3>
                <p className="text-sm text-os-text-dim leading-relaxed">{step.body}</p>
              </div>
            </div>
            {VISUALS[i]}
          </div>
        ))}
      </div>
    </>
  );
}
