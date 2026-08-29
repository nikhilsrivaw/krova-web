"use client";

import { useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Sun,
  TrendingUp,
  Sparkles,
  DollarSign,
} from "lucide-react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { Ripple } from "@/components/magicui/ripple";
import { InkUnderline } from "@/components/spectrum/ink-underline";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";
import { HowItWorks } from "@/components/spectrum/how-it-works";
import { PhoneBriefing } from "@/components/spectrum/phone-briefing";
import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const PLANS = [
  {
    name: "Starter",
    price: "₹999",
    period: "/month",
    desc: "For solo operators and small shops.",
    highlight: false,
    features: [
      "1 channel (WhatsApp or Instagram)",
      "Up to 500 messages/month",
      "Nightly AI analysis",
      "Morning briefing on WhatsApp",
      "5 AI-drafted replies/day",
    ],
    cta: "Get Started",
    href: "/signup",
  },
  {
    name: "Growth",
    price: "₹1,999",
    period: "/month",
    desc: "For growing businesses managing multiple channels.",
    highlight: true,
    badge: "Most popular",
    features: [
      "All 4 channels (WhatsApp, IG, Gmail, Outlook)",
      "Up to 5,000 messages/month",
      "Nightly AI analysis",
      "Morning briefing + hot lead alerts",
      "Unlimited AI-drafted replies",
      "Customer intelligence dashboard",
    ],
    cta: "Start free trial",
    href: "/signup",
  },
  {
    name: "Pro",
    price: "₹4,999",
    period: "/month",
    desc: "For teams that need real-time intelligence.",
    highlight: false,
    features: [
      "Everything in Growth",
      "Real-time AI analysis",
      "Team workspace (up to 5 seats)",
      "Custom AI guardrails & tone",
      "API access",
      "Priority support",
    ],
    cta: "Contact sales",
    href: "/signup",
  },
];

const VERTICALS = [
  {
    image: "/images/vertical-coaching.webp",
    name: "Coaching institutes",
    pain: "Admission inquiries get lost across DMs and WhatsApp.",
    win: "KROVA tracks every parent inquiry, follows up on unpaid fees, books demo calls.",
  },
  {
    image: "/images/vertical-clinics.webp",
    name: "Clinics & doctors",
    pain: "Appointment requests pile up, follow-ups slip.",
    win: "KROVA confirms slots, sends prescription reminders, flags no-show risks early.",
  },
  {
    image: "/images/vertical-salons.webp",
    name: "Salons & spas",
    pain: "Booking requests in five different inboxes, regulars forgotten.",
    win: "KROVA confirms bookings, wishes birthdays, brings dormant customers back.",
  },
  {
    image: "/images/vertical-agencies.webp",
    name: "Agencies & studios",
    pain: "Client commitments drift, quotes go unanswered.",
    win: "KROVA tracks deliverables, flags scope creep, drafts proposal replies in your tone.",
  },
];

const INTELLIGENCE_CARDS = [
  {
    icon: <Sun size={16} className="text-teal" />,
    stat: "8 AM",
    statLabel: "every day, on WhatsApp",
    name: "Morning briefing",
    description: "By 8 AM, KROVA delivers a WhatsApp briefing — who's hot, who's slipping, what to say first.",
  },
  {
    icon: <DollarSign size={16} className="text-teal" />,
    stat: "₹47,000",
    statLabel: "flagged in tonight's scoring",
    name: "Revenue leak detector",
    description: "Unpaid quotes, unanswered hot leads — KROVA catches the money slipping through cracks.",
  },
  {
    icon: <Sparkles size={16} className="text-teal" />,
    stat: "50 msgs",
    statLabel: "until it sounds like you",
    name: "Ghost writer",
    description: "Drafts replies that sound like you — Hinglish, your tone, your style. You only approve.",
  },
  {
    icon: <TrendingUp size={16} className="text-teal" />,
    stat: "Nightly",
    statLabel: "every conversation, scored",
    name: "Customer intelligence",
    description: "Every customer gets a health score, churn risk, energy trajectory. Spot trouble before it happens.",
  },
];

const FAQ_ITEMS = [
  {
    q: "Is KROVA a CRM?",
    a: "No. CRMs are databases you have to feed. KROVA is your AI business analyst — it reads your conversations on its own, tells you what's at risk, and drafts the next move. You approve. It executes.",
  },
  {
    q: "Will the AI sound like me?",
    a: "Yes. KROVA learns your tone, your typical phrases, your Hinglish mix — from the first 50 messages you send. Every draft you approve makes it better.",
  },
  {
    q: "What channels work today?",
    a: "WhatsApp Business, Instagram DMs, Gmail, and Outlook. All four feed into one AI brain — no jumping between inboxes.",
  },
  {
    q: "How secure is my customer data?",
    a: "All traffic is served over TLS, and access tokens and provider keys are encrypted at rest. Some of our infrastructure and AI providers process data outside India under their standard contractual protections. We do not train any model on your conversations, and our AI provider does not train on data sent through its API.",
  },
  {
    q: "Do I need a developer to set it up?",
    a: "No. You connect your own WhatsApp Business account from Settings using the details in your Meta Business account. Email channels connect with a standard sign-in. Nothing needs to be installed.",
  },
  {
    q: "What's the trial like?",
    a: "14 days, full access to the Growth plan, no credit card. Cancel anytime — you keep your data export.",
  },
];

const CHANNELS_STRIP = ["WhatsApp Business", "Instagram DM", "Gmail", "Outlook", "Team Inbox"];

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4 ${className ?? ""}`}>
      {children}
    </div>
  );
}

/** Magnetic hover: the button drifts slightly toward the cursor within its bounds. */
function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMove(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: (e.clientX - rect.left - rect.width / 2) * 0.2, y: (e.clientY - rect.top - rect.height / 2) * 0.3 });
  }

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMove}
      onMouseLeave={() => setPos({ x: 0, y: 0 })}
      animate={{ x: pos.x, y: pos.y }}
      transition={{ type: "spring", stiffness: 200, damping: 15, mass: 0.5 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * The hero centerpiece: KROVA's mascot, live and blinking, standing free —
 * the thing reading your conversations, made literal instead of illustrated.
 */
function HeroCreature() {
  return (
    <div className="relative flex items-center justify-center">
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      >
        <Image
          src="/images/krova-hero.webp"
          alt="KROVA's mascot, sitting on a rock with a laptop"
          width={1145}
          height={1374}
          quality={95}
          priority
          className="w-[clamp(220px,32vw,420px)] h-auto select-none pointer-events-none"
        />
      </motion.div>
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-40 h-6 rounded-full bg-black/40 blur-xl" />
    </div>
  );
}

export default function Hero() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* Hero */}
      <section id="hero" className="relative pt-40 pb-28 px-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-16 items-center">
          <div className="lg:col-span-7">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <Link
                href="/whatsapp"
                className="inline-flex items-center gap-2 rounded-full border border-os-border bg-os-card/60 pl-1 pr-3 py-1 mb-6 text-xs text-os-text-dim hover:border-os-border-bright hover:text-os-ink transition-colors"
              >
                <span className="rounded-full bg-teal/15 text-teal px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                  New
                </span>
                WhatsApp Business embedded signup is live
                <ArrowRight size={12} />
              </Link>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Eyebrow>AI business analyst — for Indian SMBs</Eyebrow>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="font-serif text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05] text-os-ink mb-6"
            >
              Reads every conversation.
              <br />
              Tells you what to do{" "}
              <span className="relative inline-block text-teal">
                next.
                <InkUnderline className="absolute left-0 -bottom-1.5 w-full h-3" />
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="text-lg text-os-text-dim max-w-lg mb-10 leading-relaxed"
            >
              Connect the channels you already use — your own WhatsApp Business account,
              Instagram and email. KROVA reads your business&rsquo;s own customer
              conversations and tells you who&rsquo;s waiting, what you promised, and
              what to say next.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="flex flex-wrap items-center gap-6"
            >
              <Link href="/signup">
                <Magnetic>
                  <span className="os-button os-button-cta px-7 py-3 text-sm">
                    Start free trial <ArrowRight size={16} />
                  </span>
                </Magnetic>
              </Link>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="text-sm font-medium text-os-text-dim hover:text-os-ink transition-colors inline-flex items-center gap-1.5 group"
              >
                See how it works
                <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="mt-14 pt-6 border-t border-os-border flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              {CHANNELS_STRIP.map((name) => (
                <span key={name} className="font-mono text-[11px] uppercase tracking-widest text-os-text-dim">
                  {name}
                </span>
              ))}
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="lg:col-span-5"
          >
            <HeroCreature />
          </motion.div>
        </div>
      </section>

      {/* SHOWCASE */}
      <section className="max-w-6xl mx-auto pb-20 md:pb-28">
        <div className="px-6 mb-6">
          <Eyebrow>At a glance</Eyebrow>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-10%" }}
          transition={{ duration: 0.6 }}
          className="relative mx-0 sm:mx-6 sm:rounded-2xl overflow-hidden border-y sm:border border-os-border shadow-2xl"
        >
          <Image
            src="/images/krova-showcase.webp"
            alt="KROVA reads WhatsApp, Instagram, Gmail and Outlook conversations in one place and surfaces hot leads, customers going cold, revenue leaks, and AI-drafted replies"
            width={1448}
            height={1086}
            quality={95}
            className="w-full h-auto block"
            sizes="(max-width: 1152px) 100vw, 1152px"
          />
          <BorderBeam size={250} duration={10} colorFrom="#5EEAD4" colorTo="#00A387" />
        </motion.div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works">
        <HowItWorks />
      </section>

      {/* PHONE MOCKUP SECTION */}
      <section className="border-t border-os-border max-w-6xl mx-auto px-6 py-28">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Eyebrow>8 AM IST · Daily</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight mb-5 leading-[1.1] text-os-ink">
              Wake up to a full intelligence brief on WhatsApp.
            </h2>
            <p className="text-os-text-dim mb-8 max-w-md leading-relaxed">
              Skip the dashboards. Your AI analyst messages you every morning with
              what changed overnight, who needs you today, and exactly what to say.
            </p>
            <ul className="space-y-3">
              {[
                "Hot leads ranked by readiness",
                "Customers going cold — act in 24h",
                "Revenue leaks (unpaid quotes, lost replies)",
                "Drafts ready for your approval",
              ].map((it) => (
                <li key={it} className="flex items-center gap-3 text-sm">
                  <Check size={14} className="text-seal-bright shrink-0" />
                  <span className="text-os-ink/90">{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <PhoneBriefing />
          </div>
        </div>
      </section>

      {/* Intelligence layer */}
      <section id="intelligence" className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-xl mb-16">
            <Eyebrow>Intelligence layer</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              AI that works while you sleep.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-os-border border border-os-border rounded-lg overflow-hidden">
            {INTELLIGENCE_CARDS.map((card) => (
              <div key={card.name} className="bg-os-bg p-8">
                <div className="flex items-center justify-between mb-6">
                  <div className="w-9 h-9 rounded-md border border-os-border flex items-center justify-center">
                    {card.icon}
                  </div>
                  <div className="text-right">
                    <div className="font-serif text-2xl font-semibold text-teal leading-none">{card.stat}</div>
                    <div className="text-[10px] text-os-text-dim mt-1">{card.statLabel}</div>
                  </div>
                </div>
                <h3 className="text-base font-semibold mb-2 text-os-ink">{card.name}</h3>
                <p className="text-sm text-os-text-dim leading-relaxed">{card.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* VERTICALS */}
      <section className="border-t border-os-border max-w-6xl mx-auto px-6 py-28">
        <div className="max-w-xl mb-16">
          <Eyebrow>Built for Indian SMBs</Eyebrow>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
            Made for the way you actually run business.
          </h2>
          <p className="text-os-text-dim mt-4">
            Hinglish replies. WhatsApp-first. Built for coaching institutes, clinics, salons, and agencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {VERTICALS.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="group relative rounded-xl overflow-hidden border border-os-border shadow-xl transition-transform duration-300 hover:-translate-y-1"
            >
              <Image
                src={v.image}
                alt={`${v.name}: ${v.pain} ${v.win}`}
                width={1376}
                height={1032}
                quality={95}
                className="w-full h-auto block"
                sizes="(max-width: 768px) 100vw, 552px"
              />
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHATSAPP BUSINESS INTEGRATION */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-5xl mx-auto px-6 py-24 flex flex-col gap-6">
          <Eyebrow>WhatsApp Business integration</Eyebrow>
          <h2 className="font-serif text-3xl font-semibold tracking-tight max-w-3xl text-os-ink">
            Connect your own WhatsApp Business account
          </h2>
          <p className="text-os-text-dim max-w-2xl leading-relaxed">
            Businesses connect the WhatsApp Business account they already own and
            authorise KROVA to provide the services they choose. The account stays
            theirs — KROVA does not claim ownership of it, and it can be
            disconnected at any time from Settings.
          </p>
          <ul className="grid gap-3 sm:grid-cols-2 max-w-3xl">
            {[
              "Manage customer conversations in one place",
              "Organise interactions by customer, not by chat",
              "Identify enquiries and commitments that need follow-up",
              "Review AI-assisted reply drafts before they are sent",
              "Send reminders and follow-ups using approved templates",
              "See insights from your own customer activity",
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-os-text-dim">
                <Check size={14} className="mt-0.5 shrink-0 text-teal" />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-6 pt-2">
            <Link
              href="/whatsapp"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-os-ink hover:text-teal transition-colors"
            >
              How the WhatsApp integration works <ArrowUpRight size={14} />
            </Link>
            <Link href="/privacy" className="text-sm text-os-text-dim underline underline-offset-4 hover:text-os-ink">
              How we handle your data
            </Link>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-os-border max-w-6xl mx-auto px-6 py-28">
        <div className="max-w-xl mb-16">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
            Simple, transparent pricing.
          </h2>
          <p className="text-os-text-dim mt-4">14-day free trial. No credit card required.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-os-border border border-os-border rounded-lg overflow-hidden">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`bg-os-bg p-7 flex flex-col ${plan.highlight ? "relative" : ""}`}
            >
              {plan.highlight && (
                <div className="absolute inset-x-0 top-0 h-px bg-teal" />
              )}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
                    {plan.name}
                  </span>
                  {plan.badge && (
                    <span className="font-mono text-[9px] uppercase tracking-widest text-teal">
                      {plan.badge}
                    </span>
                  )}
                </div>
                <div className="flex items-end gap-1 mb-1">
                  <span className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
                    {plan.price}
                  </span>
                  <span className="text-os-text-dim text-sm mb-1">{plan.period}</span>
                </div>
                <p className="text-xs text-os-text-dim">{plan.desc}</p>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <Check size={12} className="text-seal-bright mt-0.5 shrink-0" />
                    <span className="text-xs text-os-text-dim">{f}</span>
                  </li>
                ))}
              </ul>
              <Link href={plan.href}>
                <button
                  className={`w-full py-2.5 rounded-md text-xs font-bold uppercase tracking-widest transition-colors ${
                    plan.highlight
                      ? "bg-os-ink text-os-bg hover:bg-os-accent-dim"
                      : "border border-os-border text-os-ink hover:bg-os-card"
                  }`}
                >
                  {plan.cta}
                </button>
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-3xl mx-auto px-6 py-28">
          <div className="mb-12">
            <Eyebrow>FAQ</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              Common questions, direct answers.
            </h2>
          </div>
          <FaqAccordion items={FAQ_ITEMS} />
        </div>
      </section>

      {/* Final CTA */}
      <section className="border-t border-os-border max-w-5xl mx-auto px-6 py-28">
        <div className="relative rounded-2xl border border-os-border p-16 text-center overflow-hidden bg-os-card/40">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[600px] h-[320px] bg-teal/25 blur-[110px] rounded-full pointer-events-none" />
          <Ripple mainCircleSize={140} mainCircleOpacity={0.12} numCircles={6} />
          <DotPattern className="fill-white/10 [mask-image:radial-gradient(ellipse_60%_60%_at_50%_40%,white,transparent)]" />

          <div className="relative z-10">
            <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-os-ink">
              Your <span className="text-teal">AI analyst</span> is ready.
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Connect your own WhatsApp Business account and get your first briefing tomorrow morning.
            </p>
            <Link href="/signup">
              <Magnetic>
                <span className="os-button os-button-cta px-8 py-3 text-sm inline-flex">
                  Start free trial <ArrowRight size={16} />
                </span>
              </Magnetic>
            </Link>
            <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-os-text-dim">
              <Check size={12} className="text-teal" /> No credit card required · 14-day free trial
            </p>
          </div>

          <BorderBeam size={250} duration={10} colorFrom="#5EEAD4" colorTo="#00A387" />
        </div>
      </section>

      {/* Powered by Claude API */}
      <div className="flex items-center justify-center py-10">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-os-text-dim">
          Powered with Claude API
        </span>
      </div>

      <SiteFooter />
    </div>
  );
}
