"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Check, Phone, ArrowRight } from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";

// Prices are per month, before 18% GST. The same numbers live in
// krova-platform/shared/billing/plans.py - change them together.
const PLANS = [
  { key: "starter", name: "Starter", tagline: "For one-person and small teams", base: 2999 },
  { key: "pro", name: "Pro", tagline: "For growing businesses", base: 5999, highlight: true, badge: "Most popular" },
  { key: "scale", name: "Scale", tagline: "For busy, multi-person teams", base: 9999 },
];

const INCLUDED = [
  "WhatsApp and Instagram, with the AI drafting or sending replies",
  "Shared inbox for your team, with their own logins and an activity log",
  "Commitment ledger, CRM, scheduling, orders and campaigns for your business type",
  "Nightly analysis and a morning briefing",
  "Your own WhatsApp number and Meta account - Meta's message fees are billed to you by Meta",
];

const FAQS = [
  {
    q: "How does billing work?",
    a: "You pay the monthly plan by card or UPI AutoPay. You approve the monthly payment once and it renews by itself; you are told before each charge. 18% GST is added on top and shown on every payment.",
  },
  {
    q: "What if a payment fails?",
    a: "We try again a few times over a week and tell you each time. If it still cannot be collected, AI sending and campaigns pause - your customers and conversations stay visible - and everything resumes as soon as you pay.",
  },
  {
    q: "How is voice paid for?",
    a: "Voice runs on a prepaid wallet in rupees. Each call is charged at what it actually costs us plus 25%, shown as a breakdown, and each phone number is Rs 220 a month. There is no free voice trial because a number has to be bought for you first. When you add money, the payment gateway fee and GST are added on top so your wallet receives the full amount.",
  },
  {
    q: "Is there a free trial?",
    a: "No. WhatsApp needs a payment method on your Meta account, and numbers cost real money, so every account starts on a paid plan.",
  },
  {
    q: "Can I cancel?",
    a: "Yes, any time from the Billing page. The plan keeps working until the end of the month you have paid for, and then does not renew.",
  },
  {
    q: "Is my data secure?",
    a: "All message data is encrypted at rest and in transit. Delete all data any time from Settings.",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">{children}</div>
  );
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

export default function PricingPage() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

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
        <p className="text-os-text-dim text-lg">
          A monthly plan, plus a prepaid wallet only if you use voice. 18% GST is added on top.
        </p>
      </section>

      <section className="max-w-6xl mx-auto px-6 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.key}
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
                <div className="flex items-end gap-1 mb-1">
                  <span className="font-serif text-4xl font-semibold tracking-tight text-os-ink">{inr(plan.base)}</span>
                  <span className="text-os-text-dim text-sm mb-1">/month</span>
                </div>
                <p className="text-xs text-os-text-dim">+ 18% GST = {inr(Math.round(plan.base * 1.18))}</p>
              </div>
              <Link href={`/signup?plan=${plan.key}`}>
                <button
                  className={`w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                    plan.highlight
                      ? "bg-teal text-os-bg hover:bg-teal-bright"
                      : "border border-os-border text-os-ink hover:bg-os-bg"
                  }`}
                >
                  Get {plan.name}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="mt-10 rounded-xl border border-os-border bg-os-card p-7">
          <h2 className="text-sm font-semibold text-os-ink mb-4">Every plan includes</h2>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {INCLUDED.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check size={12} className="mt-1 shrink-0 text-seal-bright" />
                <span className="text-xs leading-relaxed text-os-ink/90">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-lg border border-os-border bg-os-card p-8 flex flex-col md:flex-row items-start gap-6">
          <div className="w-11 h-11 rounded-md border border-os-border flex items-center justify-center shrink-0">
            <Phone size={18} className="text-teal" />
          </div>
          <div>
            <h3 className="font-semibold text-base text-os-ink mb-1">Voice: pay for what you use</h3>
            <p className="text-os-text-dim text-sm leading-relaxed">
              Recharge a rupee wallet. Each call costs what it really costs us plus 25%, with the breakdown shown.
              A phone number is ₹220 a month. When you recharge, GST and the payment gateway fee are added on top,
              so the wallet receives exactly the amount you chose.
            </p>
          </div>
        </div>
      </section>

      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-3xl mx-auto px-6 py-24">
          <div className="mb-12">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">Common questions.</h2>
          </div>
          <FaqAccordion items={FAQS} />
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-lg border border-os-border p-16 text-center">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-os-ink">
            Put your business <span className="text-teal">on autopilot.</span>
          </h2>
          <Link href="/signup">
            <span className="os-button os-button-primary px-8 py-3 text-sm inline-flex">
              Get started <ArrowRight size={16} />
            </span>
          </Link>
          <p className="text-[11px] text-os-text-dim mt-4">Cancel any time · Setup in 5 minutes</p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
