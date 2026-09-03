"use client";

import type { ReactNode } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Check } from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";

/** The three things the AI pulled out of one real-looking WhatsApp message. */
const SIGNALS = [
  {
    n: 1,
    label: "Pricing intent",
    detail: "Asking for a number, not a brochure. This is a buying-stage question.",
    confidence: 92,
  },
  {
    n: 2,
    label: "Urgency",
    detail: "Wants a start date. The decision is time-boxed, so a slow reply loses it.",
    confidence: 88,
  },
  {
    n: 3,
    label: "Known contact",
    detail: "Same number opened your pricing page three times last week.",
    confidence: 96,
  },
];

const TIERS = [
  {
    tier: "Hot",
    window: "Reply within the hour",
    filled: 3,
    accent: "text-thread-bright",
    bar: "bg-thread-bright",
    border: "border-thread/40",
    desc: "Asked a price, a date, or for the link. The decision is already being made.",
    signals: ["Mentions cost, budget or EMI", "Asks about delivery or start date", "Returns after a quote"],
  },
  {
    tier: "Warm",
    window: "Reply today",
    filled: 2,
    accent: "text-teal-bright",
    bar: "bg-teal-bright",
    border: "border-teal/40",
    desc: "Interested, not committed. The right nudge moves them; a sales pitch loses them.",
    signals: ["Opens pricing more than once", "Asks what is included", "Existing customer, new service"],
  },
  {
    tier: "Cold",
    window: "Re-engage this week",
    filled: 1,
    accent: "text-os-text-dim",
    bar: "bg-os-text-dim",
    border: "border-os-border",
    desc: "Quiet for days, or only ever said hello. Needs a reason to come back, not a follow-up.",
    signals: ["No reply in 3+ days", "Vague first message", "Dormant past customer"],
  },
];

const VOICES = [
  {
    tone: "Formal",
    tag: "EN · Professional",
    body: "Hello Priya, thank you for reaching out. The Elite plan is ₹2,499 per month, and onboarding usually begins within two working days. Shall I send across the payment link?",
  },
  {
    tone: "Friendly Hinglish",
    tag: "HI-EN · Warm",
    body: "Hi Priya! Elite plan ₹2,499/mo hai, full access ke saath. Aaj lock kar lein toh kal se hi start ho jayega. Payment link bhej dun?",
    yours: true,
  },
  {
    tone: "Local Hindi",
    tag: "HI · Neighbourhood",
    body: "Priya ji namaste. Elite plan ka rate ₹2,499 maheene ka hai. Aaj confirm kar dijiye toh kal se service shuru ho jayegi. Payment link bhejun?",
  },
];

const RESTRAINTS = [
  {
    never: "Never sends without you",
    then: "Every draft waits in your approval queue. Nothing leaves until you tap send.",
  },
  {
    never: "Never quotes a price you have not set",
    then: "Numbers come from your catalogue. If it is not there, the draft asks you instead of guessing.",
  },
  {
    never: "Never promises a date it cannot check",
    then: "Delivery and slot commitments are left blank for you to fill, not invented to sound helpful.",
  },
  {
    never: "Never trains a shared model on your chats",
    then: "Your conversations stay yours, and one click deletes all of them along with the export.",
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">{children}</div>
  );
}

/** A phrase the AI latched onto, underlined and numbered like a margin note. */
function Mark({ n, children }: { n: number; children: ReactNode }) {
  return (
    <span className="whitespace-nowrap text-os-ink">
      <span className="border-b-2 border-dashed border-teal/70 pb-0.5">{children}</span>
      <sup className="ml-0.5 font-mono text-[10px] font-bold text-teal">{n}</sup>
    </span>
  );
}

export default function IntelligencePage() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* 01 — READ */}
      <section className="pt-40 pb-28 px-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-14 items-center">
          <div className="lg:col-span-5">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Eyebrow>01 — Read</Eyebrow>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-os-ink mb-6"
            >
              One message.
              <br />
              <span className="text-teal">Three things</span> you would have missed.
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg text-os-text-dim leading-relaxed mb-8"
            >
              Auto-replies match keywords. KROVA reads the whole thread the way a good
              salesperson would &mdash; what they asked, how fast they need it, and what
              they already did on your site.
            </motion.p>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-6"
            >
              <Link href="/signup">
                <span className="os-button os-button-cta px-7 py-3 text-sm inline-flex">
                  Start free trial <ArrowRight size={16} />
                </span>
              </Link>
              <Link
                href="/pricing"
                className="text-sm font-medium text-os-text-dim hover:text-os-ink transition-colors inline-flex items-center gap-1.5"
              >
                See plans <ArrowRight size={14} />
              </Link>
            </motion.div>
          </div>

          {/* The annotated message — this page's centrepiece. */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="lg:col-span-7"
          >
            <div className="rounded-2xl border border-os-border bg-os-card/40 p-6 sm:p-8">
              <div className="relative rounded-xl border border-os-border bg-os-card px-5 py-4">
                <span className="absolute -top-2 left-4 rounded bg-os-bg border border-os-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-widest text-os-text-dim">
                  Priya · WhatsApp · 11:42 PM
                </span>
                <p className="pt-1 text-[15px] leading-[2.1] text-os-text-dim">
                  &ldquo;Hi, <Mark n={1}>kitna lagega</Mark> aapka Elite plan? Aur{" "}
                  <Mark n={2}>kab tak start</Mark> ho sakta hai?&rdquo;
                </p>
              </div>

              <div className="mt-6">
                {SIGNALS.map((s, i) => (
                  <motion.div
                    key={s.n}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + i * 0.12, duration: 0.45 }}
                    className="flex items-start gap-4 py-3 border-t border-os-border first:border-t-0"
                  >
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal/40 font-mono text-[10px] font-bold text-teal">
                      {s.n}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-semibold text-os-ink">{s.label}</div>
                      <p className="text-xs text-os-text-dim leading-relaxed mt-0.5">{s.detail}</p>
                    </div>
                    <div className="shrink-0 w-20 pt-1">
                      <div className="h-1 rounded-full bg-os-border overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${s.confidence}%` }}
                          transition={{ delay: 0.7 + i * 0.12, duration: 0.7, ease: "easeOut" }}
                          className="h-full rounded-full bg-teal"
                        />
                      </div>
                      <div className="mt-1 text-right font-mono text-[9px] text-os-text-dim">
                        {s.confidence}%
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1 }}
                className="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-thread/30 bg-thread/5 px-4 py-3"
              >
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                  Verdict
                </span>
                <span className="text-sm font-semibold text-thread-bright">Hot</span>
                <span className="text-xs text-os-text-dim">
                  Draft queued for approval, top of tomorrow&rsquo;s briefing.
                </span>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* 02 — SCORE */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-xl mb-14">
            <Eyebrow>02 — Score</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              Every conversation leaves the night with a temperature.
            </h2>
            <p className="text-os-text-dim mt-4 leading-relaxed">
              Not a queue sorted by who messaged last. A queue sorted by who is about to spend
              money, and how long you have before they stop wanting to.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {TIERS.map((t, i) => (
              <motion.div
                key={t.tier}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className={`h-full rounded-xl border-2 ${t.border} bg-os-bg p-7 flex flex-col`}
              >
                <div className="flex items-end gap-1 mb-5">
                  {[0, 1, 2].map((seg) => (
                    <span
                      key={seg}
                      className={`h-1.5 flex-1 rounded-full ${seg < t.filled ? t.bar : "bg-os-border"}`}
                    />
                  ))}
                </div>
                <h3 className={`font-serif text-2xl font-semibold ${t.accent}`}>{t.tier}</h3>
                <div className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim mt-1 mb-4">
                  {t.window}
                </div>
                <p className="text-sm text-os-text-dim leading-relaxed mb-6">{t.desc}</p>
                <ul className="space-y-2 mt-auto pt-5 border-t border-os-border">
                  {t.signals.map((sig) => (
                    <li key={sig} className="text-xs text-os-text-dim leading-relaxed">
                      {sig}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — SPEAK */}
      <section className="border-t border-os-border max-w-6xl mx-auto px-6 py-28">
        <div className="max-w-xl mb-14">
          <Eyebrow>03 — Speak</Eyebrow>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
            Same question. Your voice, not a template&rsquo;s.
          </h2>
          <p className="text-os-text-dim mt-4 leading-relaxed">
            Here is Priya&rsquo;s message answered three ways. KROVA picks yours out of the first
            fifty messages you send, then sharpens it every time you edit a draft.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VOICES.map((v, i) => (
            <motion.div
              key={v.tone}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className={`relative h-full rounded-xl border-2 p-6 flex flex-col bg-os-card ${
                v.yours
                  ? "border-teal shadow-[0_0_40px_-12px_rgba(0,163,135,0.35)]"
                  : "border-os-border transition-colors duration-300 hover:border-os-border-bright"
              }`}
            >
              {v.yours && (
                <span className="absolute -top-3 right-5 rounded-full bg-teal px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-os-bg">
                  Your voice
                </span>
              )}
              <div className="text-sm font-semibold text-os-ink">{v.tone}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-os-text-dim mt-1 mb-5">
                {v.tag}
              </div>
              <p className="text-sm text-os-ink/90 leading-relaxed flex-1">{v.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* 04 — RESTRAINT */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-28 grid lg:grid-cols-12 gap-14">
          <div className="lg:col-span-5">
            <Eyebrow>04 — Restraint</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              The smartest thing it does is <span className="text-teal">stop.</span>
            </h2>
            <p className="text-os-text-dim mt-4 leading-relaxed">
              An AI left alone with your customers is a liability. KROVA is built around the four
              things it refuses to do on its own.
            </p>
            <Link
              href="/privacy"
              className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-os-ink hover:text-teal transition-colors"
            >
              How we handle your data <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="lg:col-span-7">
            {RESTRAINTS.map((r, i) => (
              <motion.div
                key={r.never}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                className="flex items-start gap-4 py-5 border-t border-os-border first:border-t-0 first:pt-0"
              >
                <Check size={15} className="mt-1 shrink-0 text-teal" />
                <div>
                  <div className="text-base font-semibold text-os-ink">{r.never}</div>
                  <p className="text-sm text-os-text-dim leading-relaxed mt-1">{r.then}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-os-border max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-2xl border border-os-border p-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-os-ink">
            Point it at one channel and see what it finds.
          </h2>
          <p className="text-os-text-dim mb-8 max-w-lg mx-auto leading-relaxed">
            Connect a channel tonight, and read the signals it pulled out of your own
            conversations tomorrow morning.
          </p>
          <Link href="/signup">
            <span className="os-button os-button-cta px-8 py-3 text-sm inline-flex">
              Start free trial <ArrowRight size={16} />
            </span>
          </Link>
          <p className="text-[11px] text-os-text-dim mt-5">
            No credit card · 14-day free trial · Setup in 5 minutes
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
