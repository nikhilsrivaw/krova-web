"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { Check, Phone, ArrowRight } from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";
import { LIST_PRICE, PLAN_GUIDE, discountText, SAME_ON_EVERY_PLAN, guideLines, planTable, type PlanKey } from "@/lib/planGuide";

// Prices are per month, before 18% GST. The same numbers live in
// krova-platform/shared/billing/plans.py - change them together.
const PLANS: { key: PlanKey; name: string; base: number; highlight?: boolean; badge?: string }[] = [
  { key: "starter", name: "Starter", base: 2999 },
  { key: "pro", name: "Pro", base: 5999, highlight: true, badge: "Most popular" },
  { key: "scale", name: "Scale", base: 9999 },
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
    a: "Voice runs on a prepaid wallet in rupees. Each call is charged at what it actually costs plus a platform charge, shown as a breakdown, and each phone number is Rs 220 a month. There is no free voice trial because a number has to be bought for you first. When you add money, the payment gateway fee is added on top so your wallet receives the full amount.",
  },
  {
    q: "How do I know which plan I need?",
    a: "Count the customer messages you get in a month on WhatsApp and Instagram. Up to about 1,000 is Starter, up to about 2,000 is Pro, up to about 3,500 is Scale. Roughly six messages make one enquiry, so Starter suits five or six new enquiries a day. If you are between sizes, start with the smaller one - moving up is one click.",
  },
  {
    q: "Are all three channels in every plan?",
    a: "Yes. WhatsApp, Instagram and the Voice Agent unlock on every plan. Every feature is on every plan. The plans differ only in size: how many messages, phone lines and team logins, how much of your own information the AI reads, how big a campaign or import can be, and whether you can connect API keys and webhooks.",
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
              <p className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim mb-6">{PLAN_GUIDE[plan.key].tagline}</p>
              <div className="mb-6 pb-6 border-b border-os-border">
                <div className="flex items-end gap-1 mb-1">
                  <span className="font-serif text-2xl text-os-text-dim line-through mr-1">{inr(LIST_PRICE[plan.key])}</span>
                  <span className="font-serif text-4xl font-semibold tracking-tight text-os-ink">{inr(plan.base)}</span>
                  <span className="text-os-text-dim text-sm mb-1">/month</span>
                </div>
                <p className="mb-1 text-xs font-semibold text-seal-bright">Now at a discounted price · {discountText(plan.key, plan.base)}</p>
                <p className="text-xs text-os-text-dim">+ 18% GST = {inr(Math.round(plan.base * 1.18))}</p>
              </div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim mb-3">Built for</p>
              <ul className="mb-6 space-y-2">
                {guideLines(plan.key).map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <Check size={12} className="mt-1 shrink-0 text-seal-bright" />
                    <span className="text-xs leading-relaxed text-os-ink/90">{line}</span>
                  </li>
                ))}
              </ul>
              <p className="mb-6 text-xs leading-relaxed text-os-text-dim">{PLAN_GUIDE[plan.key].why}</p>
              <Link href={`/signup?plan=${plan.key}`} className="mt-auto">
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

      <section className="max-w-5xl mx-auto px-6 pb-12" aria-label="Compare plans">
        <div className="rounded-xl border border-os-border bg-os-card p-7">
          <h2 className="text-sm font-semibold text-os-ink mb-1">What each plan can handle</h2>
          <p className="mb-5 text-xs text-os-text-dim">The only difference between plans is size. Every feature is on every plan.</p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-os-border text-os-text-dim">
                  <th className="py-2 pr-4 font-medium" />
                  {PLANS.map((p) => (
                    <th key={p.key} className="py-2 pr-4 font-semibold text-os-ink">{p.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {planTable().map((r) => (
                  <tr key={r.label} className="border-b border-os-border/60">
                    <th scope="row" className="py-2.5 pr-4 font-normal text-os-text-dim">{r.label}</th>
                    {r.values.map((v, i) => (
                      <td key={i} className="py-2.5 pr-4 text-os-ink">{v}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <h3 className="mt-6 mb-3 text-xs font-semibold text-os-ink">Included on every plan</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {SAME_ON_EVERY_PLAN.map((line) => (
              <li key={line} className="flex items-start gap-2.5">
                <Check size={12} className="mt-1 shrink-0 text-seal-bright" />
                <span className="text-xs leading-relaxed text-os-ink/90">{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="rounded-xl border border-os-border bg-os-card p-7">
          <h2 className="text-sm font-semibold text-os-ink mb-4">How we sized the plans</h2>
          <ul className="space-y-3 text-xs leading-relaxed text-os-ink/90">
            <li>
              <strong>A customer message</strong> is one message a customer sends you on WhatsApp or Instagram that the AI reads and
              answers. Voice is separate and runs on the wallet below.
            </li>
            <li>
              <strong>About six messages make one enquiry</strong> - a question, a price, a booking, a follow-up. So 1,000 messages is
              roughly 170 new people a month, or five to six a day.
            </li>
            <li>
              <strong>Why the sizes grow with the price.</strong> Every message the AI answers costs real money to read and reply to. Each
              plan is sized so the rate per message stays about the same (₹3.00, then ₹2.86 at Scale), instead of
              charging a small business for room it will never use.
            </li>
            <li>
              <strong>Why the AI reads more of your own information on bigger plans.</strong> Before every reply it reads all your prices,
              FAQs and policies. The more it reads, the more each reply costs to produce, so the amount grows with the plan.
              About nine pages is plenty for a price list, hours and a dozen policies.
            </li>
            <li>
              <strong>The same on every plan:</strong> the AI looks at the last 20 messages of the chat before it replies, checks the last
              40 for promises made, and keeps a running summary of each customer built from up to 200 messages.
            </li>
            <li>
              <strong>Phone lines</strong> - Starter has one. Pro has three, for example a main line, a sales line and a branch. Scale has five.
              Each line is ₹220 a month, paid from the wallet.
            </li>
            <li>
              <strong>If you grow past your plan,</strong> nothing is switched off overnight. If your business regularly goes beyond its
              size we will talk to you about moving up.
            </li>
          </ul>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24">
        <div className="rounded-lg border border-os-border bg-os-card p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-11 h-11 rounded-md border border-os-border flex items-center justify-center shrink-0">
              <Phone size={18} className="text-teal" />
            </div>
            <div>
              <h3 className="font-semibold text-base text-os-ink mb-1">Voice Agent: pay for what you use</h3>
              <p className="text-os-text-dim text-sm leading-relaxed">
                The Voice Agent is on every plan. It is not part of the monthly plan price: it runs on a prepaid
                rupee wallet, so you only pay for the phone numbers you hold and the calls you make or take.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <div className="rounded-md border border-os-border p-4">
              <p className="font-serif text-3xl font-semibold text-os-ink">₹220</p>
              <p className="text-xs font-semibold text-os-ink mt-1">per phone number, per month</p>
              <p className="text-[11px] text-os-text-dim mt-1">Taken from your wallet. Starter has 1 line, Pro 3, Scale 5.</p>
            </div>
            <div className="rounded-md border border-os-border p-4">
              <p className="font-serif text-3xl font-semibold text-os-ink">Cost + platform charge</p>
              <p className="text-xs font-semibold text-os-ink mt-1">for every call</p>
              <p className="text-[11px] text-os-text-dim mt-1">What the call really cost, plus a platform charge. The breakdown is shown for every call.</p>
            </div>
            <div className="rounded-md border border-os-border p-4">
              <p className="font-serif text-3xl font-semibold text-os-ink">₹100</p>
              <p className="text-xs font-semibold text-os-ink mt-1">smallest recharge</p>
              <p className="text-[11px] text-os-text-dim mt-1">Up to ₹50,000 at a time. The whole amount lands in your wallet.</p>
            </div>
          </div>

          <ul className="space-y-1.5 text-sm text-os-text-dim leading-relaxed list-disc pl-5">
            <li>There is no fixed per-minute rate: a call&apos;s price depends on what the call actually cost, so you never pay for a guess.</li>
            <li>When you recharge, only the payment gateway fee is added on top, so the wallet receives exactly the amount you chose.</li>
            <li>There is no free voice trial, because a phone number has to be bought for you first.</li>
            <li>You are alerted when the wallet drops below ₹100. Calls pause when it is empty or a number&apos;s rent is unpaid.</li>
          </ul>
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
