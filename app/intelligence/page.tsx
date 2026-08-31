"use client";

import { motion } from "motion/react";
import Link from "next/link";
import {
  Zap,
  ArrowRight,
  Clock,
  MessageSquare,
  Brain,
  CheckSquare,
  TrendingUp,
  Moon,
  Sun,
  Bell,
  X,
  Lightbulb,
  AlertTriangle,
  DollarSign,
  ShieldCheck,
  Check,
} from "lucide-react";

import { BorderBeam } from "@/components/magicui/border-beam";
import { TypingAnimation } from "@/components/magicui/typing-animation";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";

const STATS = [
  { label: "Messages analyzed", value: "2.8M+" },
  { label: "Avg accuracy", value: "94%" },
  { label: "Languages", value: "3" },
  { label: "Models running", value: "7" },
];

const TIMELINE = [
  {
    time: "10:00 PM",
    icon: <Moon size={18} />,
    title: "Nightly scan",
    desc: "KROVA reads every message that came in today across all your connected channels.",
  },
  {
    time: "10:05 PM",
    icon: <Brain size={18} />,
    title: "AI analysis",
    desc: "Each conversation is scored by intent, urgency, and value. The AI uses your catalogue and guardrails to draft the right reply.",
  },
  {
    time: "10:20 PM",
    icon: <CheckSquare size={18} />,
    title: "Approval queue built",
    desc: "Replies are ranked HOT → WARM → COLD and loaded into your queue, ready for the morning.",
  },
  {
    time: "8:00 AM",
    icon: <Sun size={18} />,
    title: "Morning briefing",
    desc: "You wake up to a WhatsApp from KROVA: overnight activity, hot leads to call, pending approvals.",
  },
  {
    time: "8:05 AM",
    icon: <Bell size={18} />,
    title: "You approve. KROVA sends.",
    desc: "Tap Approve. KROVA sends via the original channel — no copy-paste, no switching apps.",
  },
];

const SCORING = [
  {
    label: "HOT 🔥",
    color: "text-thread-bright",
    border: "border-thread/30",
    dot: "bg-thread-bright",
    desc: "Asked about pricing, ready to buy, or explicitly requesting a follow-up. Needs a reply within hours.",
    signals: [
      "Mentioned price / cost / budget",
      "Asked about delivery / timeline",
      "Returning customer with new request",
      "Said \"interested\", \"let's do it\", \"send the link\"",
    ],
  },
  {
    label: "WARM ⚡",
    color: "text-brass-bright",
    border: "border-brass/30",
    dot: "bg-brass-bright",
    desc: "Showing genuine interest but hasn't committed. Needs nurturing — the right message at the right time.",
    signals: [
      "Viewed pricing multiple times",
      "Engaged with content",
      "Asked general product questions",
      "Existing customer exploring new services",
    ],
  },
  {
    label: "COLD 🧊",
    color: "text-teal-bright",
    border: "border-teal/30",
    dot: "bg-teal",
    desc: "Went quiet, never replied, or low-intent browsing. Needs a re-engagement message, not a hard sell.",
    signals: [
      "No reply in 3+ days",
      "Only said \"hi\" or asked a vague question",
      "Bounced from the website",
      "Long-dormant contact",
    ],
  },
];

const CAPABILITIES = [
  {
    icon: <MessageSquare size={16} className="text-teal" />,
    title: "Context-aware replies",
    desc: "The AI reads the full conversation thread — not just the last message — so replies are always contextually accurate.",
  },
  {
    icon: <TrendingUp size={16} className="text-teal" />,
    title: "Intent detection",
    desc: "Trained on buying signals, objections, and urgency cues specific to Indian SMB customer language.",
  },
  {
    icon: <CheckSquare size={16} className="text-teal" />,
    title: "Guardrails",
    desc: "Define what the AI should never say — competitors, prices without approval, anything sensitive.",
  },
  {
    icon: <Zap size={16} className="text-teal" />,
    title: "Brand voice cloning",
    desc: "Set your greeting style and tone once. The AI writes in your voice — formal, friendly, or Hinglish — every time.",
  },
  {
    icon: <Clock size={16} className="text-teal" />,
    title: "Real-time mode (Pro)",
    desc: "On Pro, KROVA doesn't wait until 10 PM. It processes messages as they arrive and alerts you instantly.",
  },
  {
    icon: <Brain size={16} className="text-teal" />,
    title: "Learns over time",
    desc: "The more you approve and reject, the sharper it gets. Every interaction makes it more you.",
  },
];

const OUTPUTS = [
  {
    type: "Prediction",
    icon: <TrendingUp size={14} className="text-brass" />,
    title: "Rahul will churn in 5–7 days",
    body: "Engagement dropped 60% · last 3 replies took 4h+ · price objection unresolved.",
    confidence: 87,
    action: "Send win-back offer",
  },
  {
    type: "Revenue leak",
    icon: <DollarSign size={14} className="text-seal-bright" />,
    title: "₹47,000 in unpaid quotes",
    body: "3 quotes sent 12+ days ago, never followed up. Highest value: Mehta Interiors ₹22k.",
    confidence: 99,
    action: "Send reminders",
  },
  {
    type: "Hot signal",
    icon: <AlertTriangle size={14} className="text-thread-bright" />,
    title: "Priya asked pricing twice",
    body: "First DM on Mon, follow-up on Wed. Strong intent + viewed pricing page 3×.",
    confidence: 94,
    action: "Approve draft",
  },
  {
    type: "Voice of customer",
    icon: <MessageSquare size={14} className="text-teal" />,
    title: "4 customers asked for EMI",
    body: "Repeated pattern this week — consider adding EMI tier or partner.",
    confidence: 76,
    action: "View cluster",
  },
  {
    type: "Competitor mention",
    icon: <ShieldCheck size={14} className="text-brass" />,
    title: '"Zoho karta tha pehle" — Anjali',
    body: "Switched from Zoho 2 weeks ago. Reason: too many features, no AI. Use as case study.",
    confidence: 91,
    action: "Tag as advocate",
  },
  {
    type: "Growth opportunity",
    icon: <Lightbulb size={14} className="text-seal-bright" />,
    title: "12 dormant clients · 90+ days",
    body: "All used your service once. Avg ticket ₹8k. Win-back campaign opportunity.",
    confidence: 82,
    action: "Draft campaign",
  },
];

const VOICE_SAMPLES = [
  {
    tone: "Formal",
    tag: "EN · Professional",
    body: "Hello Priya, thank you for reaching out. Our Elite plan is priced at ₹2,499/month. Onboarding typically begins within 2 business days. Would you like me to send the payment link?",
  },
  {
    tone: "Friendly Hinglish",
    tag: "HI-EN · Warm",
    body: "Hi Priya 🙌 Elite plan ₹2,499/mo hai — full access milta hai. Aaj lock kar lein toh kal hi start kar dete hain. Payment link bhej dun?",
    badge: "your voice",
  },
  {
    tone: "Casual Hindi",
    tag: "HI · Local",
    body: "Priya ji namaste 🙏 Elite plan ka rate ₹2,499 maheene ka hai. Aaj confirm kar dijiye toh kal se hi service shuru ho jayegi. Payment link bhejun?",
  },
];

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">{children}</div>
  );
}

export default function IntelligencePage() {
  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* HERO */}
      <section className="pt-40 pb-16 px-6 max-w-3xl mx-auto text-center">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Eyebrow>Intelligence layer</Eyebrow>
        </motion.div>
        <motion.h1
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-os-ink"
        >
          The AI brain <span className="text-teal">behind every reply.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className="text-os-text-dim text-lg mb-8"
        >
          KROVA doesn&apos;t just send auto-replies. It reads every conversation, scores every
          lead, drafts context-aware messages, and gets sharper every time you use it.
        </motion.p>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex items-center justify-center gap-6"
        >
          <Link href="/signup">
            <span className="os-button os-button-primary px-8 py-3 text-sm inline-flex">
              See it in action <ArrowRight size={16} />
            </span>
          </Link>
          <Link
            href="/pricing"
            className="text-sm font-medium text-os-text-dim hover:text-os-ink transition-colors inline-flex items-center gap-1.5"
          >
            View plans <ArrowRight size={14} />
          </Link>
        </motion.div>
      </section>

      {/* STATS */}
      <section className="max-w-4xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {STATS.map((s) => (
            <div key={s.label} className="rounded-lg border border-os-border bg-os-card p-5 text-center">
              <div className="font-serif text-3xl font-semibold text-teal">{s.value}</div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mt-1.5">
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LIVE AI TERMINAL */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-4xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <Eyebrow>Inside the brain</Eyebrow>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-os-ink">
              Watch the AI <span className="text-teal">actually think.</span>
            </h2>
            <p className="text-os-text-dim max-w-lg mx-auto">
              Not a black box. Here&apos;s exactly how KROVA reads a conversation, scores it, and
              drafts your reply.
            </p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative os-window"
          >
            <BorderBeam size={200} duration={12} colorFrom="#5EEAD4" colorTo="#00A387" />

            <div className="h-9 border-b border-os-border flex items-center px-4 bg-os-bg/50">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
                <div className="w-2.5 h-2.5 rounded-full bg-os-border" />
              </div>
              <span className="mx-auto text-[10px] font-mono text-os-text-dim uppercase tracking-widest flex items-center gap-2">
                krova-brain.exe
                <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
              </span>
            </div>

            <div className="p-6 bg-os-bg font-mono text-[12px] leading-relaxed space-y-2 min-h-[360px]">
              <div className="text-seal-bright">$ krova analyze --conversation priya_d</div>
              <div className="text-os-text-dim">→ reading 14 messages across whatsapp + instagram...</div>
              <div className="text-os-text-dim">→ detecting intent signals...</div>
              <div>
                <span className="text-teal">[brain]</span>{" "}
                <span className="text-os-ink">found: &quot;kitna lagega?&quot; (pricing intent, 92% confidence)</span>
              </div>
              <div>
                <span className="text-teal">[brain]</span>{" "}
                <span className="text-os-ink">found: &quot;kab tak deliver hoga?&quot; (urgency, 88% confidence)</span>
              </div>
              <div>
                <span className="text-teal">[brain]</span>{" "}
                <span className="text-os-ink">cross-ref: pricing page viewed 3× last week</span>
              </div>
              <div className="text-os-text-dim">→ scoring lead...</div>
              <div>
                <span className="text-thread-bright font-bold">[score]</span>{" "}
                <span className="text-thread-bright font-bold">HOT 🔥</span>{" "}
                <span className="text-os-text-dim">(confidence: 0.94)</span>
              </div>
              <div className="text-os-text-dim">→ matching brand voice...</div>
              <div>
                <span className="text-brass-bright">[voice]</span>{" "}
                <span className="text-os-ink">tone: friendly · register: hinglish · greeting: &quot;Hi&quot;</span>
              </div>
              <div className="text-os-text-dim">→ checking guardrails...</div>
              <div>
                <span className="text-seal-bright">[guardrail]</span>{" "}
                <span className="text-os-ink">no pricing without approval ✓</span>
              </div>
              <div className="text-os-text-dim">→ drafting reply...</div>
              <div className="pt-2 px-3 py-2 rounded border border-seal/20 bg-seal/5">
                <span className="text-seal-bright text-[10px] font-bold uppercase tracking-widest">
                  draft ready ↓
                </span>
                <div className="mt-2 text-os-ink">
                  <TypingAnimation
                    text='"Hi Priya! Happy to share — our Elite plan is ₹2,499/mo. Can lock today, sharing payment link 🙌"'
                    duration={25}
                    loop
                  />
                </div>
              </div>
              <div className="pt-2">
                <span className="text-seal-bright">→ ready for approval ✓</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* TIMELINE */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <Eyebrow>10 PM → 8 AM</Eyebrow>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-os-ink">
            From inbox to <span className="text-teal">approval in one night.</span>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            The full intelligence cycle — every single day, automatically.
          </p>
        </div>

        <div className="space-y-4">
          {TIMELINE.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="rounded-xl border border-os-border bg-os-card p-6 flex items-center gap-5 transition-colors duration-300 hover:border-os-border-bright"
            >
              <div className="w-12 h-12 rounded-2xl bg-os-bg border border-os-border flex items-center justify-center shrink-0 text-teal">
                {step.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <span className="text-[10px] font-bold font-mono text-teal">{step.time}</span>
                  <h3 className="font-semibold text-base text-os-ink">{step.title}</h3>
                </div>
                <p className="text-sm text-os-text-dim leading-relaxed">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* LEAD SCORING */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <Eyebrow>Scoring</Eyebrow>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-os-ink">
              Know who to call. <span className="text-teal">Right now.</span>
            </h2>
            <p className="text-os-text-dim max-w-lg mx-auto">
              KROVA classifies every lead into three tiers so you never waste time on the wrong
              conversation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SCORING.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-xl border ${s.border} bg-os-bg p-6`}
              >
                <div className="flex items-center justify-between mb-4">
                  <span className={`text-xl font-bold ${s.color}`}>{s.label}</span>
                  <div className={`w-2 h-2 rounded-full ${s.dot} animate-pulse`} />
                </div>
                <p className="text-sm text-os-text-dim leading-relaxed mb-5">{s.desc}</p>
                <div className="space-y-2.5">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">Signals</p>
                  {s.signals.map((sig) => (
                    <div key={sig} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${s.dot}`} />
                      <span className="text-xs text-os-text-dim">{sig}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* VOICE SAMPLES */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <Eyebrow>Brand voice</Eyebrow>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-os-ink">
            Writes in <span className="text-teal">your voice.</span>
          </h2>
          <p className="text-os-text-dim max-w-lg mx-auto">
            Same customer message. Three different brand voices. KROVA matches yours from
            your first 50 sent messages.
          </p>
        </div>

        <div className="max-w-2xl mx-auto mb-8">
          <div className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim mb-2 text-center">
            Customer message
          </div>
          <div className="rounded-2xl border border-os-border bg-os-card p-4 relative">
            <div className="absolute top-0 left-4 -translate-y-1/2 px-2 py-0.5 rounded bg-os-bg border border-os-border text-[9px] font-mono text-os-text-dim">
              Priya · WhatsApp
            </div>
            <p className="text-sm text-os-ink pt-1">
              &quot;Hi, kitna lagega aapka Elite plan? Aur kab tak start ho sakta hai?&quot;
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {VOICE_SAMPLES.map((v) => (
            <div
              key={v.tone}
              className={`rounded-xl border p-5 h-full flex flex-col bg-os-card transition-colors duration-300 ${
                v.badge ? "border-teal/40" : "border-os-border hover:border-os-border-bright"
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-sm font-semibold text-os-ink">{v.tone}</div>
                  <div className="text-[9px] font-mono text-os-text-dim uppercase tracking-widest mt-0.5">
                    {v.tag}
                  </div>
                </div>
                {v.badge && (
                  <span className="text-[8px] font-bold uppercase tracking-widest px-2 py-1 rounded-full bg-teal/15 text-teal border border-teal/30">
                    {v.badge}
                  </span>
                )}
              </div>
              <p className="text-sm text-os-ink/90 leading-relaxed flex-1">{v.body}</p>
              <div className="flex items-center justify-between pt-3 mt-3 border-t border-os-border text-[10px]">
                <span className="text-os-text-dim font-mono">~ai drafted</span>
                <button className="font-bold uppercase tracking-widest text-teal">Approve →</button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <Eyebrow>Capabilities</Eyebrow>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-os-ink">
              What the AI <span className="text-teal">actually does.</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {CAPABILITIES.map((cap, i) => (
              <motion.div
                key={cap.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.07 }}
                className="rounded-xl border border-os-border bg-os-bg p-6 transition-colors duration-300 hover:border-os-border-bright"
              >
                <div className="w-9 h-9 rounded-md border border-os-border flex items-center justify-center mb-4">
                  {cap.icon}
                </div>
                <h3 className="font-semibold text-base mb-2 text-os-ink">{cap.title}</h3>
                <p className="text-xs text-os-text-dim leading-relaxed">{cap.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARISON */}
      <section className="max-w-6xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <Eyebrow>Why KROVA</Eyebrow>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-os-ink">
            Not auto-replies. Not templates. <br />
            <span className="text-teal">An actual brain.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          <div className="rounded-xl border border-os-border bg-os-card p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-3">
              Doing it yourself
            </div>
            <h3 className="text-xl font-semibold mb-4 text-os-ink">Manual</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Reads every message", ok: true },
                { label: "Tone matches you", ok: true },
                { label: "Catches every lead", ok: false },
                { label: "Works at 2 AM", ok: false },
                { label: "Scales with volume", ok: false },
                { label: "Hours/day saved", ok: false },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-2.5 text-os-text-dim">
                  {r.ok ? (
                    <Check size={14} className="text-seal-bright shrink-0" />
                  ) : (
                    <X size={14} className="text-thread-bright shrink-0" />
                  )}
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-os-border text-[10px] text-os-text-dim">
              ~3 hrs/day lost
            </div>
          </div>

          <div className="rounded-xl border border-os-border bg-os-card p-6">
            <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-3">
              Most automation tools
            </div>
            <h3 className="text-xl font-semibold mb-4 text-os-ink">Templates / Rules</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Reads every message", ok: false },
                { label: "Tone matches you", ok: false },
                { label: "Catches every lead", ok: true },
                { label: "Works at 2 AM", ok: true },
                { label: "Scales with volume", ok: true },
                { label: "Hours/day saved", ok: true },
              ].map((r) => (
                <li key={r.label} className="flex items-center gap-2.5 text-os-text-dim">
                  {r.ok ? (
                    <Check size={14} className="text-seal-bright shrink-0" />
                  ) : (
                    <X size={14} className="text-thread-bright shrink-0" />
                  )}
                  <span>{r.label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-os-border text-[10px] text-thread-bright">
              feels robotic · customers notice
            </div>
          </div>

          <div className="relative rounded-xl border-2 border-teal bg-os-card p-6 shadow-[0_0_40px_-12px_rgba(0,163,135,0.35)] md:-translate-y-3">
            <div className="absolute -top-3 right-4 px-2 py-0.5 rounded-full bg-teal text-[9px] font-bold uppercase tracking-widest text-os-bg">
              KROVA
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-os-text-dim mb-3">
              AI analyst
            </div>
            <h3 className="text-xl font-semibold mb-4 text-os-ink">KROVA brain</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                "Reads every message",
                "Tone matches you",
                "Catches every lead",
                "Works at 2 AM",
                "Scales with volume",
                "Hours/day saved",
              ].map((label) => (
                <li key={label} className="flex items-center gap-2.5 text-os-ink">
                  <Check size={14} className="text-seal-bright shrink-0" />
                  <span>{label}</span>
                </li>
              ))}
            </ul>
            <div className="mt-5 pt-4 border-t border-os-border text-[10px] text-teal font-bold uppercase tracking-widest">
              ~18 hrs/week back
            </div>
          </div>
        </div>
      </section>

      {/* INTELLIGENCE OUTPUTS */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-24">
          <div className="text-center mb-12">
            <Eyebrow>Real outputs</Eyebrow>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-3 text-os-ink">
              What KROVA <span className="text-teal">found this week.</span>
            </h2>
            <p className="text-os-text-dim max-w-lg mx-auto">
              Live examples from a sample workspace. This is what the brain surfaces — not
              metrics, decisions.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {OUTPUTS.map((it, i) => (
              <motion.div
                key={it.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="rounded-xl border border-os-border bg-os-bg p-5 h-full flex flex-col transition-colors duration-300 hover:border-os-border-bright"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-os-card border border-os-border flex items-center justify-center">
                      {it.icon}
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                      {it.type}
                    </span>
                  </div>
                  <div className="text-[9px] font-mono text-os-text-dim">{it.confidence}% conf</div>
                </div>
                <h3 className="text-sm font-semibold mb-2 leading-snug text-os-ink">{it.title}</h3>
                <p className="text-xs text-os-text-dim leading-relaxed mb-4 flex-1">{it.body}</p>
                <button className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 text-teal">
                  {it.action} <ArrowRight size={11} />
                </button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIVACY + TRUST */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-2xl border border-os-border bg-os-card p-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <Eyebrow>Privacy</Eyebrow>
            <h2 className="font-serif text-3xl font-semibold tracking-tight mb-3 leading-tight text-os-ink">
              Your data, <span className="text-teal">your data.</span>
            </h2>
            <p className="text-os-text-dim text-sm leading-relaxed">
              Conversations never train shared models. Everything stays in Indian data centers.
              Delete it all with one click any time.
            </p>
          </div>
          <div className="space-y-3">
            {[
              { k: "End-to-end encrypted", v: "AES-256 at rest, TLS 1.3 in transit" },
              { k: "Indian data residency", v: "Mumbai region · DPDPA compliant" },
              { k: "No model training on your data", v: "Your conversations stay yours" },
              { k: "One-click data delete", v: "Full export · zero questions asked" },
            ].map((r) => (
              <div
                key={r.k}
                className="flex items-start gap-3 p-3 rounded-xl border border-os-border bg-os-bg"
              >
                <ShieldCheck size={14} className="text-seal-bright mt-0.5 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-os-ink">{r.k}</div>
                  <div className="text-[10px] text-os-text-dim">{r.v}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-lg border border-os-border p-16 text-center">
          <div className="w-14 h-14 rounded-2xl bg-os-ink flex items-center justify-center mx-auto mb-6">
            <Zap size={26} className="text-os-bg" />
          </div>
          <h2 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight mb-4 text-os-ink">
            Start your <span className="text-teal">14-day free trial.</span>
          </h2>
          <p className="text-os-text-dim text-lg mb-8 max-w-xl mx-auto">
            Connect your first channel in minutes. KROVA delivers your first AI analysis
            tomorrow morning.
          </p>
          <div className="flex items-center justify-center gap-4">
            <Link href="/signup">
              <span className="os-button os-button-primary px-8 py-3 text-sm inline-flex">
                Get started <ArrowRight size={16} />
              </span>
            </Link>
            <Link href="/pricing">
              <span className="os-button os-button-secondary px-8 py-3 text-sm inline-flex">
                See pricing
              </span>
            </Link>
          </div>
          <p className="text-[11px] text-os-text-dim mt-4">
            No credit card · Cancel any time · Setup in 5 minutes
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
