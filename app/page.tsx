"use client";

import { useEffect, useRef, useState, type ReactNode, type MouseEvent as ReactMouseEvent } from "react";
import { motion } from "motion/react";
import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Bell,
  User,
  MessageSquare,
  ArrowRight,
  Check,
  Sun,
  TrendingUp,
  Users,
  Mail,
  Instagram,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  DollarSign,
  GraduationCap,
  HeartPulse,
  Scissors,
  Briefcase,
  Search,
  ChevronDown,
} from "lucide-react";

import { AuroraText } from "@/components/magicui/aurora-text";
import { BorderBeam } from "@/components/magicui/border-beam";
import { NumberTicker } from "@/components/magicui/number-ticker";
import { Marquee } from "@/components/magicui/marquee";
import { AnimatedList } from "@/components/magicui/animated-list";
import { DotPattern } from "@/components/magicui/dot-pattern";
import { TypingAnimation } from "@/components/magicui/typing-animation";

import { SpotlightCard } from "@/components/spectrum/spotlight-card";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";
import { HowItWorks } from "@/components/spectrum/how-it-works";
import { PhoneBriefing } from "@/components/spectrum/phone-briefing";
import { DataFlowVideo } from "@/components/spectrum/data-flow-video";
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
    badge: "Most Popular",
    features: [
      "All 4 channels (WhatsApp, IG, Gmail, Outlook)",
      "Up to 5,000 messages/month",
      "Nightly AI analysis",
      "Morning briefing + hot lead alerts",
      "Unlimited AI-drafted replies",
      "Customer intelligence dashboard",
    ],
    cta: "Start Free Trial",
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
    cta: "Contact Sales",
    href: "/signup",
  },
];

const NOTIFICATIONS = [
  {
    name: "Priya D. is going cold",
    description: "No reply in 4 days · was hot lead",
    icon: <AlertTriangle size={14} className="text-amber-400" />,
    color: "border-amber-500/30 bg-amber-500/5",
  },
  {
    name: "Rahul ready to convert",
    description: "Asked for pricing twice · draft ready",
    icon: <Sparkles size={14} className="text-seal-bright" />,
    color: "border-seal/30 bg-seal/5",
  },
  {
    name: "Reply drafted for Anjali",
    description: "Matches your tone · awaiting approval",
    icon: <CheckCircle2 size={14} className="text-brass-bright" />,
    color: "border-brass/30 bg-brass/5",
  },
  {
    name: "Revenue leak: 3 unpaid quotes",
    description: "Total ₹47,000 stuck · 12+ days old",
    icon: <DollarSign size={14} className="text-thread-bright" />,
    color: "border-thread/30 bg-thread/5",
  },
];

const VERTICALS = [
  {
    icon: <GraduationCap size={18} className="text-brass" />,
    image: "/images/vertical-coaching.png",
    name: "Coaching Institutes",
    pain: "Admission inquiries get lost across DMs and WhatsApp.",
    win: "KROVA tracks every parent inquiry, follows up on unpaid fees, books demo calls.",
  },
  {
    icon: <HeartPulse size={18} className="text-brass" />,
    image: "/images/vertical-clinic.png",
    name: "Clinics & Doctors",
    pain: "Appointment requests pile up, follow-ups slip.",
    win: "KROVA confirms slots, sends prescription reminders, flags no-show risks early.",
  },
  {
    icon: <Scissors size={18} className="text-brass" />,
    image: "/images/vertical-salon.png",
    name: "Salons & Spas",
    pain: "Booking requests in 5 different inboxes, regulars forgotten.",
    win: "KROVA confirms bookings, wishes birthdays, brings dormant customers back.",
  },
  {
    icon: <Briefcase size={18} className="text-brass" />,
    image: "/images/vertical-agency.png",
    name: "Agencies & Studios",
    pain: "Client commitments drift, quotes go unanswered.",
    win: "KROVA tracks deliverables, flags scope creep, drafts proposal replies in your tone.",
  },
];

const INTELLIGENCE_CARDS = [
  {
    icon: <Sun size={18} className="text-brass" />,
    name: "Morning Briefing",
    description: "By 8 AM, KROVA delivers a WhatsApp briefing — who's hot, who's slipping, what to say first.",
  },
  {
    icon: <DollarSign size={18} className="text-brass" />,
    name: "Revenue Leak Detector",
    description: "Unpaid quotes, unanswered hot leads — KROVA catches the money slipping through cracks.",
  },
  {
    icon: <Sparkles size={18} className="text-brass" />,
    name: "Ghost Writer",
    description: "Drafts replies that sound like you — Hinglish, your tone, your style. You only approve.",
  },
  {
    icon: <TrendingUp size={18} className="text-brass" />,
    name: "Customer Intelligence",
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

function NotificationItem({ item }: { item: typeof NOTIFICATIONS[number] }) {
  return (
    <figure
      className={`relative mx-auto min-h-fit w-full max-w-[380px] cursor-pointer overflow-hidden rounded-2xl p-4 border ${item.color} backdrop-blur-md`}
    >
      <div className="flex flex-row items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-xl bg-os-bg border border-os-border shrink-0">
          {item.icon}
        </div>
        <div className="flex flex-col overflow-hidden">
          <figcaption className="flex flex-row items-center text-sm font-bold text-white">
            <span>{item.name}</span>
          </figcaption>
          <p className="text-[11px] text-os-text-dim">{item.description}</p>
        </div>
      </div>
    </figure>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-4">
      {children}
    </div>
  );
}

const HEADLINE_WORD = {
  hidden: { opacity: 0, y: 18, filter: "blur(6px)" },
  visible: { opacity: 1, y: 0, filter: "blur(0px)" },
};

function StaggeredWords({
  text,
  className,
  delayChildren = 0.15,
}: {
  text: string;
  className?: string;
  delayChildren?: number;
}) {
  return (
    <motion.span
      initial="hidden"
      animate="visible"
      transition={{ staggerChildren: 0.045, delayChildren }}
      className={className}
    >
      {text.split(" ").map((word, i) => (
        <motion.span
          key={`${word}-${i}`}
          variants={HEADLINE_WORD}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="inline-block mr-[0.28em]"
        >
          {word}
        </motion.span>
      ))}
    </motion.span>
  );
}

/** Magnetic hover: the button drifts slightly toward the cursor within its bounds. */
function Magnetic({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMove(e: ReactMouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({ x: (e.clientX - rect.left - rect.width / 2) * 0.25, y: (e.clientY - rect.top - rect.height / 2) * 0.35 });
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

const LIVE_CHANNELS = [
  { icon: <MessageSquare size={14} />, top: "15%", color: "#2FBF71" },
  { icon: <Instagram size={14} />, top: "50%", color: "#C9973F" },
  { icon: <Mail size={14} />, top: "85%", color: "#B5473D" },
];

const LIVE_OUTPUTS = [
  "3 hot leads found today.",
  "Reply drafted for Priya D.",
  "₹47,000 in unpaid quotes flagged.",
  "2 customers going cold — act now.",
];

function ChannelNode({ icon, top, color }: { icon: ReactNode; top: string; color: string }) {
  return (
    <div
      className="absolute left-[6%] -translate-y-1/2 flex size-9 items-center justify-center rounded-xl bg-os-card border border-os-border"
      style={{ top }}
    >
      <span style={{ color }}>{icon}</span>
    </div>
  );
}

function InputPacket({ top, delay }: { top: string; delay: number }) {
  return (
    <motion.div
      className="absolute size-1.5 rounded-full bg-brass-bright -translate-y-1/2"
      style={{ top }}
      animate={{
        left: ["11%", "11%", "47%", "47%"],
        top: [top, top, "50%", "50%"],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: 3.2, delay, repeat: Infinity, times: [0, 0.06, 0.7, 0.8], ease: "easeInOut" }}
    />
  );
}

function OutputPacket() {
  return (
    <motion.div
      className="absolute top-1/2 size-1.5 rounded-full bg-seal-bright -translate-y-1/2"
      animate={{
        left: ["53%", "53%", "88%", "88%"],
        opacity: [0, 1, 1, 0],
      }}
      transition={{ duration: 3.2, delay: 2.15, repeat: Infinity, times: [0, 0.06, 0.42, 0.52], ease: "easeInOut" }}
    />
  );
}

/**
 * The hero centerpiece: not a photo, the product itself — three channels
 * feeding a single node, a briefing typing out on the other side. Shows the
 * mechanism (channels in, decisions out) instead of illustrating a mood.
 */
function LiveBrainWindow() {
  const [outputIndex, setOutputIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setOutputIndex((i) => (i + 1) % LIVE_OUTPUTS.length), 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="os-window relative overflow-hidden">
      <BorderBeam size={180} duration={12} colorFrom="#C9973F" colorTo="#5B8A72" />

      <div className="h-10 border-b border-os-border flex items-center justify-between px-4 bg-os-bg/50">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-os-border" />
            <div className="w-3 h-3 rounded-full bg-os-border" />
            <div className="w-3 h-3 rounded-full bg-os-border" />
          </div>
          <div className="h-4 w-[1px] bg-os-border mx-2" />
          <div className="text-[10px] font-mono text-os-text-dim uppercase tracking-widest">KROVA / Live</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
          <span className="text-[9px] font-mono text-os-text-dim uppercase tracking-widest">Reading</span>
        </div>
      </div>

      <div className="relative h-[320px] bg-os-bg/30">
        <svg className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
          <line x1="11%" y1="15%" x2="47%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="11%" y1="50%" x2="47%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="11%" y1="85%" x2="47%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
          <line x1="53%" y1="50%" x2="88%" y2="50%" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />
        </svg>

        {LIVE_CHANNELS.map((c) => (
          <ChannelNode key={c.top} {...c} />
        ))}
        <InputPacket top="15%" delay={0} />
        <InputPacket top="50%" delay={0.7} />
        <InputPacket top="85%" delay={1.4} />
        <OutputPacket />

        {/* hub node */}
        <div className="absolute left-[47%] top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div
            animate={{ scale: [1, 1.7, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: "easeOut" }}
            className="absolute inset-0 rounded-full border border-brass/40"
          />
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-os-card border border-os-border">
            <img src="/logo-mark.svg" alt="" className="w-6 h-6" />
          </div>
        </div>

        {/* output / briefing card */}
        <div className="absolute right-[5%] top-1/2 w-[38%] min-w-[128px] -translate-y-1/2 rounded-xl border border-os-border bg-os-card p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="size-1.5 rounded-full bg-seal" />
            <span className="text-[8px] font-bold uppercase tracking-widest text-os-text-dim">Briefing</span>
          </div>
          <div className="text-[11px] leading-snug text-white/90 min-h-[2.6em]">
            <TypingAnimation key={outputIndex} text={LIVE_OUTPUTS[outputIndex]} duration={22} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Hero() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      {/* Navbar — fixed, must be FIRST so HMR doesn't displace it */}
      <Navbar />

      {/* Hero */}
      <section id="hero" className="relative z-10 pt-36 pb-20 px-6 max-w-7xl mx-auto">
        {/* Ambient depth — slow-drifting, low-opacity glow, not particle wallpaper */}
        <div className="absolute inset-0 -z-10 pointer-events-none overflow-hidden">
          <motion.div
            animate={{ x: [0, 40, 0], y: [0, 24, 0] }}
            transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-32 -left-32 w-[36rem] h-[36rem] rounded-full bg-brass/10 blur-[140px]"
          />
          <motion.div
            animate={{ x: [0, -30, 0], y: [0, -20, 0] }}
            transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-20 -right-40 w-[32rem] h-[32rem] rounded-full bg-seal/10 blur-[140px]"
          />
        </div>

        <div className="grid lg:grid-cols-12 gap-10 items-center mb-16 relative z-10">
          <div className="lg:col-span-7 text-center lg:text-left">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[11px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-6"
          >
            AI Business Analyst for Indian SMBs
          </motion.div>

          <h1 className="text-5xl md:text-6xl lg:text-[4rem] font-bold tracking-tight mb-6 max-w-4xl mx-auto lg:mx-0 leading-[1.05] text-os-ink">
            <StaggeredWords text="Reads every conversation." />
            <br />
            <StaggeredWords text="Tells you what to do next." className="text-brass" delayChildren={0.55} />
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.85 }}
            className="text-lg text-os-text-dim max-w-2xl mx-auto lg:mx-0 mb-10"
          >
            Connect the channels you already use — your own WhatsApp Business account,
            Instagram and email. KROVA reads your business&rsquo;s own customer conversations
            and tells you who&rsquo;s waiting, what you promised, and what to say next.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.95 }}
            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
          >
            <Link href="/signup">
              <Magnetic>
                <span className="os-button os-button-primary px-8 py-3 text-base relative overflow-hidden group flex items-center gap-2">
                  <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/30 to-transparent skew-x-12" />
                  <span className="relative z-10 flex items-center gap-2">
                    Start Free Trial <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </span>
              </Magnetic>
            </Link>
            <button
              onClick={() => scrollTo("how-it-works")}
              className="os-button os-button-secondary px-8 py-3 text-base flex items-center gap-2 group"
            >
              <Zap size={16} className="text-brass group-hover:scale-110 transition-transform" />
              See how it thinks
            </button>
          </motion.div>
          </div>

          {/* The mechanism itself, live — not a mood shot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="lg:col-span-5 relative"
          >
            <LiveBrainWindow />
          </motion.div>
        </div>

        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="hidden lg:flex flex-col items-center gap-1.5 mx-auto mb-4 text-os-text-dim/70 w-fit"
        >
          <span className="text-[9px] uppercase tracking-[0.25em]">Scroll</span>
          <ChevronDown size={14} />
        </motion.div>

        {/* OS Window Mockup */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.6 }}
          className="os-window max-w-5xl mx-auto relative z-10"
        >
          <BorderBeam size={300} duration={14} colorFrom="#C9973F" colorTo="#5B8A72" />

          <div className="h-10 border-b border-os-border flex items-center justify-between px-4 bg-os-bg/50">
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-os-border" />
                <div className="w-3 h-3 rounded-full bg-os-border" />
                <div className="w-3 h-3 rounded-full bg-os-border" />
              </div>
              <div className="h-4 w-[1px] bg-os-border mx-2" />
              <div className="text-[10px] font-mono text-os-text-dim uppercase tracking-widest">KROVA / Today's Briefing</div>
            </div>
            <div className="flex items-center gap-4 text-os-text-dim">
              <Search size={14} />
              <Bell size={14} />
              <User size={14} />
            </div>
          </div>

          <div className="p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 bg-os-bg/30 relative">
            <DotPattern className="[mask-image:radial-gradient(400px_circle_at_center,white,transparent)] opacity-20" />

            {/* Left: live notifications */}
            <div className="lg:col-span-5 space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim flex items-center gap-2">
                  <Sun size={12} className="text-brass" /> What KROVA found
                </h3>
                <span className="os-badge text-os-text-dim">EXAMPLE</span>
              </div>
              <AnimatedList delay={1800} className="h-[360px]">
                {NOTIFICATIONS.map((item) => (
                  <NotificationItem key={item.name} item={item} />
                ))}
              </AnimatedList>
            </div>

            {/* Right: AI brain widgets */}
            <div className="lg:col-span-7 space-y-4 relative z-10">
              <div className="grid grid-cols-2 gap-4">
                <SpotlightCard spotlightColor="rgba(201, 151, 63, 0.2)">
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-os-text-dim mb-3">
                      <TrendingUp size={14} className="text-brass" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Reply Rate</span>
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={94} suffix="%" />
                    </div>
                    <div className="text-[10px] text-os-text-dim mt-1">+12% vs last week</div>
                  </div>
                </SpotlightCard>

                <SpotlightCard spotlightColor="rgba(181, 71, 61, 0.2)">
                  <div className="p-5">
                    <div className="flex items-center gap-2 text-os-text-dim mb-3">
                      <AlertTriangle size={14} className="text-thread-bright" />
                      <span className="text-[10px] font-bold uppercase tracking-tighter">Going Cold</span>
                    </div>
                    <div className="text-3xl font-bold">
                      <NumberTicker value={7} />
                    </div>
                    <div className="text-[10px] text-os-text-dim mt-1">act in next 24h</div>
                  </div>
                </SpotlightCard>
              </div>

              <div className="rounded-2xl border border-os-border bg-os-card">
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles size={14} className="text-brass" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim">AI-Drafted Reply</span>
                    </div>
                    <div className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
                  </div>
                  <p className="text-sm leading-relaxed">
                    "Hey Priya! Following up on our Elite plan — happy to lock in the ₹2,499/mo
                    rate today. Sharing the payment link below 🙌"
                  </p>
                  <div className="flex items-center justify-between pt-2 border-t border-os-border">
                    <span className="text-[10px] text-os-text-dim font-mono">For: Priya D. · WhatsApp</span>
                    <div className="flex gap-2">
                      <button className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white">Edit</button>
                      <button className="text-[10px] font-bold uppercase tracking-widest text-seal-bright">Approve</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* HOW IT WORKS — animated beam diagram */}
      <section id="how-it-works" className="max-w-6xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-os-ink">
            Channels in. Decisions out.
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            Every message flows into one brain. Briefings, drafts, and risk alerts
            flow back to you — at 8 AM, on the channels you already use.
          </p>
        </div>
        <HowItWorks />
      </section>

      {/* SEE THE DATA FLOW — autoplaying product film */}
      <DataFlowVideo />

      {/* PHONE MOCKUP SECTION */}
      <section className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <Eyebrow>8 AM IST · Daily</Eyebrow>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6 leading-[1.1] text-os-ink">
              Wake up to a full intelligence brief on WhatsApp.
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-md leading-relaxed">
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
                  <div className="w-5 h-5 rounded-md bg-seal/10 border border-seal/30 flex items-center justify-center">
                    <Check size={11} className="text-seal-bright" />
                  </div>
                  <span className="text-white/90">{it}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <motion.div
              initial={{ opacity: 0, x: -20, rotate: -6 }}
              whileInView={{ opacity: 1, x: 0, rotate: -6 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="hidden md:block absolute -left-10 top-10 w-56 rounded-2xl overflow-hidden border border-os-border shadow-2xl z-0"
            >
              <Image
                src="/images/phone-briefing-moment.png"
                alt="Reading the morning briefing with a cup of chai"
                width={896}
                height={1057}
                className="w-full h-auto"
              />
            </motion.div>
            <div className="relative z-10">
              <PhoneBriefing />
            </div>
          </div>
        </div>
      </section>

      {/* Intelligence layer — plain, calm feature grid */}
      <section id="intelligence" className="max-w-7xl mx-auto px-6 py-32">
        <div className="text-center mb-16">
          <Eyebrow>Intelligence Layer</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-os-ink">
            AI that works while you sleep.
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            Every night, KROVA scans every conversation, scores every lead, and drafts the perfect
            reply. Morning briefing on WhatsApp — ready before your first chai.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-os-border rounded-2xl overflow-hidden border border-os-border">
          {INTELLIGENCE_CARDS.map((card) => (
            <div key={card.name} className="bg-os-card p-8">
              <div className="w-10 h-10 rounded-lg bg-os-bg border border-os-border flex items-center justify-center mb-5">
                {card.icon}
              </div>
              <h3 className="text-lg font-bold mb-2 text-os-ink">{card.name}</h3>
              <p className="text-sm text-os-text-dim leading-relaxed">{card.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* VERTICALS — who KROVA is for */}
      <section className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <Eyebrow>Built for Indian SMBs</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-os-ink">
            Made for the way you actually run business.
          </h2>
          <p className="text-os-text-dim max-w-xl mx-auto text-lg">
            Hinglish replies. WhatsApp-first. Built for coaching institutes, clinics, salons, and agencies.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {VERTICALS.map((v, i) => (
            <motion.div
              key={v.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-2xl border border-os-border bg-os-card overflow-hidden hover:border-os-border-bright transition-colors"
            >
              <div className="relative w-full aspect-[16/9] overflow-hidden">
                <Image
                  src={v.image}
                  alt={`${v.name} using KROVA`}
                  fill
                  className="object-cover object-top"
                  sizes="(min-width: 768px) 50vw, 100vw"
                />
              </div>
              <div className="p-7">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-11 h-11 rounded-xl bg-os-bg border border-os-border flex items-center justify-center">
                    {v.icon}
                  </div>
                  <h3 className="text-xl font-bold text-os-ink">{v.name}</h3>
                </div>
                <div className="space-y-3">
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-thread-bright mb-1">
                      The pain
                    </div>
                    <p className="text-sm text-os-text-dim">{v.pain}</p>
                  </div>
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-widest text-seal-bright mb-1">
                      What KROVA does
                    </div>
                    <p className="text-sm text-white/90">{v.win}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHATSAPP BUSINESS INTEGRATION */}
      <section className="max-w-5xl mx-auto px-6 py-24 border-t border-os-border">
        <div className="flex flex-col gap-6">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-brass">
            WhatsApp Business Integration
          </div>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight max-w-3xl text-os-ink">
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
                <Check size={15} className="mt-0.5 shrink-0 text-brass" />
                {t}
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/whatsapp"
              className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-black transition-opacity hover:opacity-90"
            >
              How the WhatsApp integration works <ArrowRight size={14} />
            </Link>
            <Link href="/privacy" className="text-sm text-os-text-dim underline underline-offset-4 hover:text-white">
              How we handle your data
            </Link>
          </div>
        </div>
      </section>

      {/* Marquee — works with everything */}
      <section className="py-20 border-b border-os-border bg-os-card/30 overflow-hidden">
        <div className="text-center mb-10">
          <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-os-text-dim">
            Plugs into the tools you already use
          </div>
        </div>
        <Marquee duration="40s" className="[--gap:3rem] py-2">
          {[
            { icon: <MessageSquare size={20} className="text-os-text-dim" />, name: "WhatsApp Business" },
            { icon: <Instagram size={20} className="text-os-text-dim" />, name: "Instagram" },
            { icon: <Mail size={20} className="text-os-text-dim" />, name: "Gmail" },
            { icon: <Mail size={20} className="text-os-text-dim" />, name: "Outlook" },
            { icon: <Users size={20} className="text-os-text-dim" />, name: "Team Inbox" },
          ].map((it) => (
            <div
              key={it.name}
              className="flex items-center gap-3 px-6 py-3 rounded-2xl border border-os-border bg-os-bg shrink-0"
            >
              {it.icon}
              <span className="text-sm font-bold text-white whitespace-nowrap">{it.name}</span>
            </div>
          ))}
        </Marquee>
      </section>

      {/* Pricing */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-32 relative">
        <div className="text-center mb-16">
          <Eyebrow>Pricing</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-os-ink">
            Simple, transparent pricing.
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            14-day free trial. No credit card required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-2xl border bg-os-card overflow-hidden ${
                plan.highlight ? "border-brass" : "border-os-border"
              }`}
            >
              <div className="h-9 border-b border-os-border bg-os-bg/50 flex items-center px-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                  <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                </div>
                <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
                  {plan.name}
                  {plan.badge && <span className="ml-2 text-brass">· {plan.badge}</span>}
                </span>
              </div>
              <div className="p-6 flex flex-col">
                <div className="mb-6">
                  <div className="flex items-end gap-1 mb-1">
                    <span className="text-4xl font-bold tracking-tight text-os-ink">{plan.price}</span>
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
                  <motion.button
                    whileHover={{ scale: 1.01 }}
                    whileTap={{ scale: 0.99 }}
                    className={`w-full py-2.5 rounded-lg text-xs font-bold uppercase tracking-widest transition-all ${
                      plan.highlight
                        ? "bg-white text-black hover:bg-white/90"
                        : "bg-os-bg border border-os-border text-white hover:bg-os-border"
                    }`}
                  >
                    {plan.cta}
                  </motion.button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-32">
        <div className="text-center mb-12">
          <Eyebrow>FAQ</Eyebrow>
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-os-ink">
            Common questions, direct answers.
          </h2>
        </div>
        <FaqAccordion items={FAQ_ITEMS} />
      </section>

      {/* Final CTA */}
      <section className="max-w-5xl mx-auto px-6 py-32">
        <div className="relative rounded-3xl overflow-hidden border border-os-border bg-os-card p-16 text-center">
          <BorderBeam size={400} duration={12} colorFrom="#C9973F" colorTo="#5B8A72" />
          <div className="relative z-10">
            <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4 text-os-ink">
              Your <AuroraText>AI analyst</AuroraText> is ready.
            </h2>
            <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
              Connect your own WhatsApp Business account and get your first briefing tomorrow morning.
            </p>
            <Link href="/signup">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="os-button os-button-primary px-10 py-4 text-base inline-flex items-center gap-2"
              >
                Start Free Trial <ArrowRight size={18} />
              </motion.button>
            </Link>
          </div>
        </div>
      </section>

      {/* Powered by Claude API */}
      <div className="relative flex items-center justify-center mt-20 mb-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-os-border bg-os-card/60">
          <div className="w-1.5 h-1.5 rounded-full bg-brass" />
          <span className="text-[10px] font-mono uppercase tracking-[0.25em] text-os-text-dim">
            Powered with Claude API
          </span>
        </div>
      </div>

      {/* ===========================
          FOOTER — KROVA × AQIROX
          =========================== */}
      <SiteFooter />
    </div>
  );
}
