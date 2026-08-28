"use client";

import { motion } from "motion/react";

const MESSAGES = [
  {
    body: "Good morning. Your briefing for today:",
    accent: true,
  },
  {
    body: "3 hot leads need replies today:\nPriya D. — asked pricing twice\nRahul M. — ready to book\nAnjali — wants a demo",
  },
  {
    body: "2 going cold: Vikram & Sneha (4+ days silent)",
  },
  {
    body: "₹47,000 in unpaid quotes — reply YES to send reminders.",
  },
];

export function PhoneBriefing() {
  return (
    <div className="relative mx-auto w-[280px]">
      <div className="relative rounded-[2rem] border border-os-border bg-os-card overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-20 h-5 bg-os-bg rounded-b-xl z-20" />

        <div className="border-b border-os-border px-4 pt-9 pb-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full border border-os-border flex items-center justify-center">
            <span className="font-serif text-xs text-brass">K</span>
          </div>
          <div>
            <div className="text-xs font-semibold text-os-ink">KROVA</div>
            <div className="text-[9px] font-mono uppercase tracking-widest text-os-text-dim">
              8:00 AM · Daily briefing
            </div>
          </div>
        </div>

        <div className="px-3 py-4 space-y-3 h-[420px] bg-os-bg/60">
          {MESSAGES.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="max-w-[90%]"
            >
              <div
                className={`rounded-lg rounded-bl-sm px-3 py-2 text-[11px] leading-relaxed whitespace-pre-line border ${
                  m.accent
                    ? "border-brass/30 bg-brass/[0.06] text-os-ink"
                    : "border-os-border bg-os-card text-os-ink/90"
                }`}
              >
                {m.body}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      <div className="absolute -right-8 top-16 px-2.5 py-1.5 rounded-md border border-os-border bg-os-card text-[9px] font-mono uppercase tracking-widest text-os-text-dim">
        8 AM IST
      </div>
    </div>
  );
}
