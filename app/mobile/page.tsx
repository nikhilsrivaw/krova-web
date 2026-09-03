"use client";

import { motion, AnimatePresence } from "motion/react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import {
  Smartphone,
  ArrowRight,
  Send,
  Check,
  Bell,
  WifiOff,
  Zap,
  Download,
  Copy,
  Apple,
  Share2,
  Monitor,
  Mic,
  RotateCcw,
  Sparkles,
} from "lucide-react";

import { TypingAnimation } from "@/components/magicui/typing-animation";
import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";

/** Example exchanges that auto-cycle in the phone mockup. */
const EXAMPLES = [
  {
    user: "Aaj kya hua?",
    ai: "Aaj 12 naye leads aaye — 3 hot, 5 warm, 4 abhi naye hain. Pending approvals: 8. Priya ji aur Rahul ji ne pricing pucha — drafts ready hain.",
  },
  {
    user: "Kaun se leads hot hain abhi?",
    ai: "3 hot leads:\n• Priya D. — Elite plan ka rate pucha (WhatsApp · 2h ago)\n• Rahul M. — Sample dekha, ready to convert (IG · 4h ago)\n• Anjali S. — Demo schedule karna chahti hain (Gmail · 6h ago)",
  },
  {
    user: "Priya ko kya message karoon?",
    ai: 'Suggested reply: "Hi Priya! Elite plan ₹2,499/month hai. Aaj lock kar lein toh kal hi start kar dete hain. Payment link bhej dun?"\n\nApprove karein? Tap HAAN.',
  },
  {
    user: "Is mahine revenue kaisa hai?",
    ai: "May tak ₹2,18,000 received · ₹47,000 expected aur 10 din mein due · ₹15,000 overdue (Vikram ji, 12 din ho gaye). April se 23% up.",
  },
];

const ASKS = [
  { q: "Aaj kya hua?", a: "Full daily briefing" },
  { q: "Kaun se leads hot hain abhi?", a: "Live hot lead list" },
  { q: "Rahul ne kab last message kiya tha?", a: "Specific customer lookup" },
  { q: "Is mahine revenue kaisa hai?", a: "Revenue summary" },
  { q: "Aaj mujhe kya karna chahiye?", a: "Priority recommendations" },
  { q: "Priya ko kya message karoon?", a: "Suggested reply for any customer" },
];

const STEPS = [
  {
    title: "Ask",
    body: "Type or speak in any language. KROVA reads your business context — customers, history, conversations — and answers about yours specifically.",
  },
  {
    title: "See a draft",
    body: "When it suggests a follow-up you see the message it wants to send, who it goes to, and why it suggested it.",
  },
  {
    title: "Tap HAAN",
    body: "One tap and it goes out over your WhatsApp, Instagram or Gmail. No typing, no copy-paste, no switching apps.",
  },
];

const PWA_POINTS = [
  {
    icon: <Zap size={15} className="text-teal" />,
    title: "Instant updates",
    body: "We ship a fix at 11 AM, you have it at 11:01. No review queue, no update nag.",
  },
  {
    icon: <Download size={15} className="text-teal" />,
    title: "~500KB install",
    body: "Against a 100MB native app. It barely touches your storage or your data plan.",
  },
  {
    icon: <WifiOff size={15} className="text-teal" />,
    title: "Works offline",
    body: "Cached pages keep working with no signal. Drafts queue and send when you reconnect.",
  },
  {
    icon: <Bell size={15} className="text-teal" />,
    title: "Push notifications",
    body: "Hot lead at 11 PM and your phone buzzes — same as a native app, because underneath it is one.",
  },
];

const PLATFORMS = [
  {
    label: "iOS · Safari",
    icon: <Apple size={18} className="text-os-ink" />,
    steps: [
      {
        line: "Open the link in Safari",
        hint: "Chrome on iOS won't work — Apple only allows PWA installs from Safari.",
      },
      {
        line: (
          <>
            Tap the <strong className="font-semibold text-os-ink">Share</strong> button{" "}
            <Share2 size={11} className="inline -mt-0.5 text-teal" />
          </>
        ),
        hint: "Bottom of the screen on iPhone.",
      },
      {
        line: (
          <>
            Tap <strong className="font-semibold text-os-ink">Add to Home Screen</strong>
          </>
        ),
        hint: "Scroll down in the share sheet if you don't see it.",
      },
      { line: "Open KROVA from your home screen" },
    ],
  },
  {
    label: "Android · Chrome",
    icon: <Smartphone size={18} className="text-os-ink" />,
    steps: [
      { line: "Open the link in Chrome" },
      {
        line: "Tap the install prompt",
        hint: "If it doesn't appear, open the three-dot menu and choose Install app.",
      },
      { line: "Confirm", hint: "KROVA lands on your home screen." },
    ],
  },
  {
    label: "Desktop · Chrome / Edge",
    icon: <Monitor size={18} className="text-os-ink" />,
    steps: [
      { line: "Open the link in Chrome or Edge" },
      {
        line: (
          <>
            Click the install icon <Download size={11} className="inline -mt-0.5 text-teal" /> in the
            address bar
          </>
        ),
        hint: "Right-hand side of the URL bar.",
      },
      { line: "Click Install", hint: "It opens in its own window, like a native app." },
    ],
  },
];

function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">{children}</div>
  );
}

export default function MobilePage() {
  const [installUrl, setInstallUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Default to localhost in dev; the app lives on its own subdomain in production.
    const host = window.location.hostname;
    if (host === "localhost" || host === "127.0.0.1") {
      setInstallUrl("http://localhost:3001");
    } else {
      setInstallUrl(`https://app.${host.replace(/^www\./, "")}`);
    }
  }, []);

  const copy = () => {
    if (!installUrl) return;
    navigator.clipboard.writeText(installUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* HERO */}
      <section className="pt-40 pb-24 px-6 max-w-6xl mx-auto">
        <div className="grid lg:grid-cols-12 gap-14 items-center">
          <div className="lg:col-span-6">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <Eyebrow>KROVA on your phone</Eyebrow>
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-os-ink mb-6"
            >
              Aapka AI business partner.
              <br />
              <span className="text-teal">In your pocket.</span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="text-lg text-os-text-dim leading-relaxed mb-8"
            >
              Pucho kuch bhi about your business — in Hindi, English, or Hinglish. KROVA
              knows your customers, your numbers and your day, and answers in plain
              language.
            </motion.p>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-wrap items-center gap-6"
            >
              {installUrl && (
                <a href={installUrl} target="_blank" rel="noreferrer">
                  <span className="os-button os-button-cta px-7 py-3 text-sm inline-flex">
                    Open the app <ArrowRight size={16} />
                  </span>
                </a>
              )}
              <a
                href="#install"
                className="text-sm font-medium text-os-text-dim hover:text-os-ink transition-colors inline-flex items-center gap-1.5"
              >
                Install steps <ArrowRight size={14} />
              </a>
            </motion.div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="mt-10 pt-6 border-t border-os-border text-sm text-os-text-dim leading-relaxed"
            >
              KROVA Mobile is a <strong className="font-semibold text-os-ink">PWA</strong> — an
              installable web app. No App Store, no Play Store, no 200MB download. You just
              open the link on your phone.
            </motion.p>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.6 }}
            className="lg:col-span-6 flex justify-center"
          >
            <PhoneMockup />
          </motion.div>
        </div>
      </section>

      {/* ASK ANYTHING */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-xl mb-14">
            <Eyebrow>Pucho kuch bhi</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              Hindi, Hinglish, English. It always knows.
            </h2>
            <p className="text-os-text-dim mt-4 leading-relaxed">
              A general chatbot knows nothing about your business. KROVA knows every
              customer, every conversation, every commitment — so ask it like you&rsquo;d ask
              a manager.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {ASKS.map((ex, i) => (
              <motion.div
                key={ex.q}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.06, duration: 0.45 }}
                className="h-full rounded-xl border border-os-border bg-os-bg p-5 transition-colors duration-300 hover:border-os-border-bright"
              >
                <p className="text-[15px] font-medium text-os-ink">&ldquo;{ex.q}&rdquo;</p>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal-bright mt-2.5">
                  {ex.a}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* THREE STEPS */}
      <section className="border-t border-os-border max-w-6xl mx-auto px-6 py-28">
        <div className="max-w-xl mb-14">
          <Eyebrow>How it works</Eyebrow>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
            One tap. <span className="text-teal">Real action.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="h-full rounded-xl border border-os-border bg-os-card p-7 transition-colors duration-300 hover:border-os-border-bright"
            >
              <div className="font-mono text-[11px] font-bold text-teal mb-4">0{i + 1}</div>
              <h3 className="text-lg font-semibold text-os-ink mb-2">{step.title}</h3>
              <p className="text-sm text-os-text-dim leading-relaxed">{step.body}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* WHY A PWA */}
      <section className="border-t border-os-border bg-os-card/40">
        <div className="max-w-6xl mx-auto px-6 py-28">
          <div className="max-w-xl mb-14">
            <Eyebrow>Why no App Store</Eyebrow>
            <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
              Open. Install. Done.
            </h2>
            <p className="text-os-text-dim mt-4 leading-relaxed">
              Same look, same speed, none of the App Store theatre.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {PWA_POINTS.map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-10%" }}
                transition={{ delay: i * 0.07, duration: 0.45 }}
                className="h-full rounded-xl border border-os-border bg-os-bg p-6 transition-colors duration-300 hover:border-os-border-bright"
              >
                <div className="mb-4 flex h-9 w-9 items-center justify-center rounded-md border border-os-border">
                  {c.icon}
                </div>
                <h3 className="text-sm font-semibold text-os-ink mb-1.5">{c.title}</h3>
                <p className="text-xs text-os-text-dim leading-relaxed">{c.body}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* INSTALL */}
      <section id="install" className="border-t border-os-border max-w-6xl mx-auto px-6 py-28 scroll-mt-28">
        <div className="max-w-xl mb-12">
          <Eyebrow>Install in 30 seconds</Eyebrow>
          <h2 className="font-serif text-4xl font-semibold tracking-tight text-os-ink">
            Pick your phone.
          </h2>
        </div>

        {installUrl && (
          <div className="mb-10 rounded-xl border border-os-border bg-os-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 max-w-2xl">
            <div className="min-w-0 flex-1 overflow-x-auto rounded-lg border border-os-border bg-os-bg px-4 py-3 font-mono text-sm text-os-ink">
              {installUrl}
            </div>
            <button
              onClick={copy}
              className="shrink-0 inline-flex items-center justify-center gap-2 rounded-md border border-os-border px-4 py-3 text-[11px] font-bold uppercase tracking-widest text-os-ink transition-colors hover:border-os-border-bright"
            >
              {copied ? (
                <>
                  <Check size={13} className="text-teal" /> Copied
                </>
              ) : (
                <>
                  <Copy size={13} /> Copy link
                </>
              )}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {PLATFORMS.map((p, i) => (
            <motion.div
              key={p.label}
              initial={{ opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-10%" }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
              className="h-full rounded-xl border border-os-border bg-os-card p-6"
            >
              <div className="flex items-center gap-3 mb-6 pb-5 border-b border-os-border">
                <div className="flex h-9 w-9 items-center justify-center rounded-md border border-os-border">
                  {p.icon}
                </div>
                <h3 className="font-mono text-[11px] font-bold uppercase tracking-[0.15em] text-os-ink">
                  {p.label}
                </h3>
              </div>
              <ol className="space-y-4">
                {p.steps.map((s, n) => (
                  <li key={n} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-teal/40 font-mono text-[10px] font-bold text-teal">
                      {n + 1}
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm leading-snug text-os-text-dim">{s.line}</div>
                      {s.hint && (
                        <p className="text-[11px] leading-snug text-os-text-dim/70 mt-1">{s.hint}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-os-border max-w-5xl mx-auto px-6 py-24">
        <div className="rounded-2xl border border-os-border p-10 sm:p-14 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-os-ink">
            Your AI partner is <span className="text-teal">30 seconds away.</span>
          </h2>
          <p className="text-os-text-dim mb-8 max-w-md mx-auto leading-relaxed">
            Open the link on your phone and tap install. KROVA stays on your home screen.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {installUrl && (
              <a href={installUrl} target="_blank" rel="noreferrer" className="w-full sm:w-auto">
                <span className="os-button os-button-cta w-full sm:w-auto justify-center px-8 py-3 text-sm inline-flex">
                  Open the app <ArrowRight size={16} />
                </span>
              </a>
            )}
            <Link
              href="/signup"
              className="text-sm font-medium text-os-text-dim hover:text-os-ink transition-colors"
            >
              Create an account first
            </Link>
          </div>
          <p className="text-[11px] text-os-text-dim mt-5">
            You need a KROVA account —{" "}
            <Link href="/signup" className="text-os-ink hover:text-teal transition-colors">
              sign up free
            </Link>
            , 14-day trial, no card needed.
          </p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}

/* ── PHONE MOCKUP ───────────────────────────────────────────────────────── */

function PhoneMockup() {
  const [idx, setIdx] = useState(0);
  const ex = EXAMPLES[idx];

  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % EXAMPLES.length), 8000);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="relative w-full max-w-[300px]">
      <div className="relative overflow-hidden rounded-[2.5rem] border-8 border-os-card bg-os-bg shadow-2xl">
        {/* Notch */}
        <div className="absolute top-0 left-1/2 z-20 h-7 w-28 -translate-x-1/2 rounded-b-2xl bg-os-card" />

        {/* Status bar */}
        <div className="relative z-10 flex items-center justify-between bg-os-bg px-5 pt-9 pb-2 font-mono text-[9px] text-os-text-dim">
          <span>9:41</span>
          <span>4G</span>
        </div>

        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-os-border bg-os-bg px-4 py-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-os-border bg-os-card">
            <Sparkles size={15} className="text-teal" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold leading-tight text-os-ink">KROVA</div>
            <div className="flex items-center gap-1.5 text-[10px] text-os-text-dim">
              <span className="h-1.5 w-1.5 rounded-full bg-teal" />
              Knows your business
            </div>
          </div>
          <RotateCcw size={14} className="ml-auto shrink-0 text-os-text-dim" />
        </div>

        {/* Chat body */}
        <div className="min-h-[420px] space-y-3 bg-os-bg px-3 py-4">
          <AnimatePresence mode="wait">
            <motion.div
              key={idx}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-3"
            >
              <div className="flex justify-end">
                <div className="max-w-[88%] rounded-2xl rounded-br-md bg-os-ink px-3 py-2">
                  <p className="text-[12px] leading-relaxed text-os-bg">{ex.user}</p>
                </div>
              </div>

              <div className="flex justify-start">
                <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-os-border bg-os-card px-3 py-2">
                  <div className="mb-1.5 font-mono text-[8px] font-bold uppercase tracking-[0.2em] text-teal">
                    KROVA
                  </div>
                  <p className="whitespace-pre-line text-[11px] leading-relaxed text-os-ink/90">
                    <TypingAnimation key={ex.user} text={ex.ai} duration={18} />
                  </p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-os-border bg-os-bg px-3 py-2.5">
          <div className="min-w-0 flex-1 truncate rounded-lg border border-os-border bg-os-card px-3 py-2 text-[11px] text-os-text-dim">
            {ex.user}
          </div>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-os-text-dim">
            <Mic size={14} />
          </button>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-teal text-os-bg">
            <Send size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}
