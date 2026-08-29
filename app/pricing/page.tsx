"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { Check, X, Zap, ArrowRight } from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";

const PLANS = [
  {
    name: "Starter",
    tagline: "For solo operators",
    price: { monthly: "₹999", annual: "₹799" },
    desc: "Everything you need to stop missing leads from one channel.",
    highlight: false,
    features: [
      { text: "1 channel (WhatsApp or Instagram)", included: true },
      { text: "Up to 500 messages/month", included: true },
      { text: "Nightly AI analysis (10 PM IST)", included: true },
      { text: "Morning briefing on WhatsApp", included: true },
      { text: "5 AI-drafted replies/day", included: true },
      { text: "Hot / warm / cold scoring", included: true },
      { text: "Customer intelligence dashboard", included: false },
      { text: "Multi-channel (all 4)", included: false },
      { text: "Team seats", included: false },
    ],
    cta: "Start free trial",
    href: "/signup",
  },
  {
    name: "Growth",
    tagline: "For growing businesses",
    price: { monthly: "₹1,999", annual: "₹1,599" },
    desc: "All 4 channels, unlimited replies, full intelligence. The complete KROVA.",
    highlight: true,
    badge: "Most popular",
    features: [
      { text: "All 4 channels (WhatsApp, IG, Gmail, Outlook)", included: true },
      { text: "Up to 5,000 messages/month", included: true },
      { text: "Nightly AI analysis (10 PM IST)", included: true },
      { text: "Morning briefing + hot lead alerts", included: true },
      { text: "Unlimited AI-drafted replies", included: true },
      { text: "Customer intelligence dashboard", included: true },
      { text: "Analytics & conversion tracking", included: true },
      { text: "Team seats", included: false },
      { text: "API access", included: false },
    ],
    cta: "Start free trial",
    href: "/signup",
  },
  {
    name: "Pro",
    tagline: "For teams & power users",
    price: { monthly: "₹4,999", annual: "₹3,999" },
    desc: "Real-time intelligence, team collaboration, full API access.",
    highlight: false,
    features: [
      { text: "Everything in Growth", included: true },
      { text: "Unlimited messages", included: true },
      { text: "Real-time AI analysis, not just nightly", included: true },
      { text: "Team workspace (up to 5 seats)", included: true },
      { text: "Custom AI tone & guardrails", included: true },
      { text: "API access", included: true },
      { text: "Priority support", included: true },
    ],
    cta: "Contact sales",
    href: "/signup",
  },
];

const FAQS = [
  {
    q: "What counts as a 'message'?",
    a: "Any inbound or outbound message across your connected channels — WhatsApp, Instagram DMs, Gmail threads, or Outlook emails — counts as one message.",
  },
  {
    q: "Can I switch plans later?",
    a: "Yes. Upgrade or downgrade any time. Upgrades take effect immediately; downgrades apply at the next billing cycle.",
  },
  {
    q: "What is the 14-day free trial?",
    a: "Every new account gets 14 days of the Growth plan, completely free. No credit card required. After 14 days you choose a plan or move to read-only mode.",
  },
  {
    q: "What channels are supported?",
    a: "WhatsApp Business API, Instagram Direct (via Meta), Gmail (via Google OAuth), and Outlook / Office 365 (via Microsoft OAuth). More channels coming.",
  },
  {
    q: "Is my data secure?",
    a: "All message data is encrypted at rest and in transit. KROVA never reads your messages for any purpose other than AI processing. Delete all data any time from Settings.",
  },
  {
    q: "Do I need technical skills to set up?",
    a: "No. Setup takes under 5 minutes — connect channels via OAuth, fill in your business profile, and KROVA handles the rest.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">{children}</div>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);

  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* HERO */}
      <section className="pt-40 pb-16 px-6 max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>Pricing</Eyebrow>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-os-ink"
        >
          Simple, <span className="text-teal">transparent pricing.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-os-text-dim text-lg mb-8"
        >
          14-day free trial on every plan. No credit card required. Cancel any time.
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="inline-flex items-center gap-1 p-1 rounded-full border border-os-border"
        >
          <button
            onClick={() => setAnnual(false)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors ${
              !annual ? "bg-os-ink text-os-bg" : "text-os-text-dim"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center gap-2 ${
              annual ? "bg-os-ink text-os-bg" : "text-os-text-dim"
            }`}
          >
            Annual
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold ${
                annual ? "bg-seal/20 text-seal-bright" : "bg-seal/10 text-seal-bright"
              }`}
            >
              Save 20%
            </span>
          </button>
        </motion.div>
      </section>

      {/* PLANS */}
      <section className="max-w-6xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className={`rounded-xl p-7 flex flex-col relative bg-os-card ${
                plan.highlight
                  ? "border-2 border-teal shadow-[0_0_40px_-12px_rgba(0,163,135,0.35)] md:-translate-y-3"
                  : "border border-os-border"
              }`}
            >
              {plan.badge && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-teal px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-os-bg whitespace-nowrap">
                  {plan.badge}
                </span>
              )}

              <span className="text-lg font-semibold text-os-ink mb-1">{plan.name}</span>
              <p className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim mb-6">{plan.tagline}</p>

              <div className="mb-6 pb-6 border-b border-os-border">
                <div className="flex items-end gap-1 mb-2 h-10 overflow-hidden">
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={annual ? "annual" : "monthly"}
                      initial={{ y: 16, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: -16, opacity: 0 }}
                      transition={{ duration: 0.28, ease: "easeOut" }}
                      className="font-serif text-4xl font-semibold tracking-tight text-os-ink"
                    >
                      {annual ? plan.price.annual : plan.price.monthly}
                    </motion.span>
                  </AnimatePresence>
                  <span className="text-os-text-dim text-sm mb-1">/month</span>
                </div>
                <motion.p
                  animate={{ opacity: annual ? 1 : 0, height: annual ? "auto" : 0 }}
                  className="text-[10px] text-seal-bright font-bold overflow-hidden"
                >
                  Billed annually · save 20%
                </motion.p>
                <p className="text-xs text-os-text-dim leading-relaxed mt-2">{plan.desc}</p>
              </div>

              <ul className="space-y-2.5 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f.text} className="flex items-start gap-2.5">
                    {f.included ? (
                      <Check size={12} className="mt-0.5 shrink-0 text-seal-bright" />
                    ) : (
                      <X size={12} className="mt-0.5 shrink-0 text-os-border" />
                    )}
                    <span className={`text-xs leading-relaxed ${f.included ? "text-os-ink/90" : "text-os-text-dim/50 line-through"}`}>
                      {f.text}
                    </span>
                  </li>
                ))}
              </ul>

              <Link href={plan.href}>
                <button
                  className={`w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                    plan.highlight
                      ? "bg-teal text-os-bg hover:bg-teal-bright"
                      : "border border-os-border text-os-ink hover:bg-os-bg"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </section>

      {/* NOT SURE CALLOUT */}
      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-lg border border-os-border bg-os-card p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-md border border-os-border flex items-center justify-center shrink-0">
              <Zap size={18} className="text-teal" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-os-ink mb-1">Not sure which plan?</h3>
              <p className="text-os-text-dim text-sm">
                Start with Growth — covers most businesses. You can always downgrade.
              </p>
            </div>
          </div>
          <Link href="/signup">
            <span className="os-button os-button-primary px-6 py-2.5 text-sm shrink-0 inline-flex">
              Try Growth free <ArrowRight size={14} />
            </span>
          </Link>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <div className="mb-12">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">Common questions.</h2>
          </div>
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-lg border border-os-border p-16 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-os-ink">
            Put your business <span className="text-teal">on autopilot.</span>
          </h2>
          <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
            Join the Indian SMBs already using KROVA.
          </p>
          <Link href="/signup">
            <span className="os-button os-button-primary px-8 py-3 text-sm inline-flex">
              Start free trial <ArrowRight size={16} />
            </span>
          </Link>
          <p className="text-[11px] text-os-text-dim mt-4">No credit card · Cancel any time · Setup in 5 minutes</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
