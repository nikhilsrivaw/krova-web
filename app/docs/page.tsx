"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import {
  BookOpen,
  Brain,
  Rocket,
  Plug,
  MessageSquare,
  Sun,
  CheckSquare,
  Sparkles,
  ShieldCheck,
  Bug,
  ArrowRight,
  ArrowUp,
  Instagram,
  Mail,
  Zap,
  Users,
  Search,
  LogIn,
  UserPlus,
  Smartphone,
  Settings as SettingsIcon,
  HelpCircle,
  Check,
  ChevronDown,
} from "lucide-react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";
import { FaqAccordion } from "@/components/spectrum/faq-accordion";
import { Callout } from "@/components/spectrum/callout";
import { WhatsAppIcon, InstagramIcon, GmailIcon, OutlookIcon } from "@/components/spectrum/brand-icons";

interface TocSection {
  id: string;
  title: string;
  icon: ReactNode;
  group: string;
}

const TOC: TocSection[] = [
  { id: "introduction", title: "What is KROVA?", icon: <BookOpen size={13} />, group: "Get started" },
  { id: "signup", title: "Create account", icon: <UserPlus size={13} />, group: "Get started" },
  { id: "login", title: "Sign in", icon: <LogIn size={13} />, group: "Get started" },
  { id: "setup", title: "First-time setup", icon: <Rocket size={13} />, group: "Get started" },
  { id: "briefing", title: "Morning briefing", icon: <Sun size={13} />, group: "Daily use" },
  { id: "actions", title: "Approving actions", icon: <CheckSquare size={13} />, group: "Daily use" },
  { id: "relationships", title: "Relationships", icon: <Users size={13} />, group: "Daily use" },
  { id: "intelligence", title: "Intelligence view", icon: <Brain size={13} />, group: "Daily use" },
  { id: "channels-overview", title: "Channels overview", icon: <Plug size={13} />, group: "Channels" },
  { id: "whatsapp", title: "WhatsApp", icon: <MessageSquare size={13} />, group: "Channels" },
  { id: "instagram", title: "Instagram", icon: <Instagram size={13} />, group: "Channels" },
  { id: "gmail", title: "Gmail", icon: <Mail size={13} />, group: "Channels" },
  { id: "outlook", title: "Outlook", icon: <Mail size={13} />, group: "Channels" },
  { id: "voice", title: "Voice & tone", icon: <Sparkles size={13} />, group: "Configure" },
  { id: "guardrails", title: "Guardrails", icon: <ShieldCheck size={13} />, group: "Configure" },
  { id: "autopilot", title: "Autopilot rules", icon: <Zap size={13} />, group: "Configure" },
  { id: "team", title: "Team & roles", icon: <Users size={13} />, group: "Configure" },
  { id: "mobile", title: "Mobile app", icon: <Smartphone size={13} />, group: "Help" },
  { id: "settings", title: "Settings map", icon: <SettingsIcon size={13} />, group: "Help" },
  { id: "faq", title: "FAQ", icon: <HelpCircle size={13} />, group: "Help" },
  { id: "troubleshooting", title: "Troubleshooting", icon: <Bug size={13} />, group: "Help" },
  { id: "privacy", title: "Privacy & data", icon: <ShieldCheck size={13} />, group: "Help" },
];

const GROUPS = ["Get started", "Daily use", "Channels", "Configure", "Help"];

const FAQ_ITEMS = [
  {
    q: "Is KROVA a CRM?",
    a: "No. CRMs are databases you have to feed. KROVA is your AI business analyst — it reads your conversations on its own, tells you what's at risk, and drafts the next move. You approve. It executes.",
  },
  {
    q: "Will the AI sound like me?",
    a: "Yes — usually within the first 20 approvals. It picks up your tone from sent messages, your language mix (English / Hindi / Hinglish), your greeting style, and every edit you make to a draft.",
  },
  {
    q: "Does KROVA reply automatically?",
    a: "By default, no — every draft waits for your approval. You can enable specific Autopilot rules to send certain low-risk replies on their own (for example, a greeting on a new lead), but the safe default is approval-first.",
  },
  {
    q: "What does the 14-day trial include?",
    a: "The full Growth plan — all four channels, unlimited drafts, and the customer intelligence dashboard. No credit card.",
  },
  {
    q: "How is this different from Zoho or Freshdesk?",
    a: "Those are CRMs: manual data-entry tools. KROVA is the analyst that uses the data. It reads, scores, decides, and drafts — they store.",
  },
  {
    q: "What if I want to cancel?",
    a: "Cancel from Settings → Billing. You keep access until the end of the billing period and can export all your data before it ends.",
  },
  {
    q: "Can I add more than one WhatsApp number?",
    a: "Yes. Each number is a separate channel. This is common for owners running more than one business from the same dashboard.",
  },
  {
    q: "Does it work in Hindi?",
    a: "Yes. KROVA reads, scores, and drafts in Hindi, Hinglish, and English, and switches based on what the customer wrote.",
  },
];

const TROUBLESHOOTING = [
  {
    q: "My morning briefing didn't arrive",
    a: "Check Settings → Briefing. The usual cause is an unverified WhatsApp number. Tap re-verify, enter the 6-digit code that arrives on WhatsApp, and the next briefing lands on schedule.",
  },
  {
    q: "AI drafts don't sound like me",
    a: "Voice trains on your sent messages. If your account is new, paste five example replies into Settings → Voice → Examples. Every edit you make also teaches it — after roughly 20 edits the drafts get noticeably closer.",
  },
  {
    q: "WhatsApp keeps disconnecting",
    a: "WhatsApp sessions expire after 14 days for security. Re-link from Settings → Channels. Persistent connections via the official Cloud API are coming.",
  },
  {
    q: "I see no actions in the queue",
    a: "The nightly analysis runs at 10 PM IST, so messages that arrived today appear tomorrow morning. To see them sooner, hit Run analysis on the Intelligence page.",
  },
  {
    q: "An action was sent to the wrong customer",
    a: "This shouldn't happen — every action shows its recipient before you approve. If it does, email us with the action ID from the URL. We'll roll it back and investigate.",
  },
  {
    q: "I want to export all my data",
    a: "Settings → Privacy → Export. You'll receive a ZIP with every conversation, action, and relationship within 24 hours.",
  },
  {
    q: "How do I pause KROVA temporarily?",
    a: "Settings → Briefing → Pause briefings. You can also disconnect channels temporarily without losing past data.",
  },
];

/* ─────────────────────────── page ─────────────────────────── */

export default function DocsPage() {
  const [active, setActive] = useState<string>(TOC[0].id);
  const [search, setSearch] = useState("");
  const [navOpen, setNavOpen] = useState(false);
  const [progress, setProgress] = useState(0);
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const offsets = TOC.map((t) => {
        const el = document.getElementById(t.id);
        if (!el) return { id: t.id, top: Infinity };
        return { id: t.id, top: Math.abs(el.getBoundingClientRect().top - 140) };
      });
      offsets.sort((a, b) => a.top - b.top);
      if (offsets[0]) setActive(offsets[0].id);

      const scrollable = document.body.scrollHeight - window.innerHeight;
      setProgress(scrollable > 0 ? Math.min(1, window.scrollY / scrollable) : 0);
      setShowTop(window.scrollY > 900);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("hashchange", handleScroll);
    handleScroll();
    // A deep link scrolls after paint, so measure again once it has settled.
    const settle = window.setTimeout(handleScroll, 400);
    return () => {
      window.clearTimeout(settle);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("hashchange", handleScroll);
    };
  }, []);

  const visibleToc = TOC.filter(
    (t) => !search || t.title.toLowerCase().includes(search.toLowerCase()),
  );
  const activeTitle = TOC.find((t) => t.id === active)?.title ?? "Contents";

  const navList = (onPick?: () => void) => (
    <>
      {GROUPS.map((group) => {
        const items = visibleToc.filter((t) => t.group === group);
        if (!items.length) return null;
        return (
          <div key={group} className="mb-6">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-os-text-dim mb-2 px-3">
              {group}
            </p>
            <nav className="space-y-0.5">
              {items.map((item) => {
                const isActive = active === item.id;
                return (
                  <a
                    key={item.id}
                    href={`#${item.id}`}
                    onClick={onPick}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-colors ${
                      isActive
                        ? "bg-teal/10 text-teal-bright"
                        : "text-os-text-dim hover:bg-os-card hover:text-os-ink"
                    }`}
                  >
                    <span className={isActive ? "text-teal" : "text-os-text-dim"}>{item.icon}</span>
                    <span className="font-medium">{item.title}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        );
      })}
      {!visibleToc.length && (
        <p className="px-3 text-xs text-os-text-dim">No section matches &ldquo;{search}&rdquo;.</p>
      )}
    </>
  );

  return (
    <div className="bg-os-bg min-h-screen relative">
      <Navbar />

      {/* Reading progress */}
      <div className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent">
        <div
          className="h-full bg-teal transition-[width] duration-150 ease-out"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* HEADER */}
      <header className="px-6 pt-36 pb-12 max-w-7xl mx-auto">
        <div className="max-w-2xl">
          <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">
            User guide
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-semibold tracking-tight leading-[1.08] text-os-ink mb-5">
            Everything KROVA does, <span className="text-teal">in the order you&rsquo;ll need it.</span>
          </h1>
          <p className="text-lg text-os-text-dim leading-relaxed">
            Start at the top if you&rsquo;re new — account, setup, first briefing. Jump straight to a
            channel or a setting if you already know what you&rsquo;re looking for.
          </p>
        </div>
      </header>

      {/* MOBILE SECTION PICKER */}
      <div className="lg:hidden sticky top-[84px] z-40 border-y border-os-border bg-os-bg/95 backdrop-blur-sm">
        <button
          onClick={() => setNavOpen((v) => !v)}
          className="w-full flex items-center justify-between px-6 py-3.5 text-left"
        >
          <span className="min-w-0">
            <span className="block font-mono text-[9px] uppercase tracking-[0.2em] text-os-text-dim">
              On this page
            </span>
            <span className="block truncate text-sm font-semibold text-os-ink">{activeTitle}</span>
          </span>
          <ChevronDown
            size={16}
            className={`shrink-0 text-os-text-dim transition-transform duration-300 ${
              navOpen ? "rotate-180" : ""
            }`}
          />
        </button>
        {navOpen && (
          <div className="max-h-[65vh] overflow-y-auto border-t border-os-border bg-os-bg px-3 py-4">
            {navList(() => setNavOpen(false))}
          </div>
        )}
      </div>

      {/* BODY */}
      <div className="max-w-7xl mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* SIDEBAR (desktop) */}
          <aside className="hidden lg:block lg:col-span-3 lg:sticky lg:top-28 lg:h-[calc(100vh-9rem)] lg:overflow-y-auto lg:pr-4">
            <div className="relative mb-5">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-os-text-dim" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search the guide"
                className="w-full rounded-lg border border-os-border bg-os-card py-2 pl-9 pr-3 text-xs text-os-ink placeholder:text-os-text-dim focus:border-os-border-bright focus:outline-none"
              />
            </div>

            {navList()}

            <div className="mt-2 rounded-xl border border-os-border bg-os-card p-4">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-os-text-dim mb-2">
                Stuck on something?
              </p>
              <a
                href="mailto:support@aqirox.com"
                className="text-xs font-semibold text-os-ink hover:text-teal transition-colors"
              >
                support@aqirox.com
              </a>
              <p className="text-[11px] text-os-text-dim mt-1">We reply within 4 business hours.</p>
            </div>
          </aside>

          {/* MAIN */}
          <main className="min-w-0 lg:col-span-9 max-w-3xl space-y-16 pt-10 lg:pt-0">
            {/* INTRODUCTION */}
            <Section id="introduction" eyebrow="Start here" title="What is KROVA?">
              <Lead>
                KROVA is your AI business analyst. It reads every customer conversation across
                WhatsApp, Instagram, Gmail and Outlook, then tells you who&rsquo;s hot, who&rsquo;s
                slipping, what&rsquo;s at risk, and exactly what to say next.
              </Lead>
              <P>
                Every night at 10 PM it scans everything that came in. By 8 AM you get a WhatsApp
                briefing telling you what to do that day. You approve, KROVA sends. That&rsquo;s the
                whole loop.
              </P>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { step: "It reads", body: "Every message on every connected channel, automatically." },
                  { step: "It thinks", body: "Scores leads, spots churn, finds revenue you're losing." },
                  { step: "It drafts", body: "Writes replies in your tone. You only press approve." },
                ].map((s, i) => (
                  <div
                    key={s.step}
                    className="h-full rounded-xl border border-os-border bg-os-card p-5 transition-colors duration-300 hover:border-os-border-bright"
                  >
                    <div className="font-mono text-[10px] text-teal mb-3">0{i + 1}</div>
                    <div className="text-sm font-semibold text-os-ink mb-1.5">{s.step}</div>
                    <p className="text-xs text-os-text-dim leading-relaxed">{s.body}</p>
                  </div>
                ))}
              </div>

              <Callout title="Who this is for">
                Owners of Indian SMBs — coaching institutes, clinics, salons, boutiques, agencies,
                freelancers. If your customers find you on WhatsApp, this is for you.
              </Callout>
            </Section>

            {/* SIGNUP */}
            <Section id="signup" eyebrow="Step 1" title="Create your account">
              <P>Sign-up takes under a minute. You get a 14-day free trial, no credit card.</P>
              <Steps
                items={[
                  {
                    title: "Open the sign-up page",
                    body: (
                      <>
                        Visit{" "}
                        <Link href="/signup" className="text-teal hover:text-teal-bright underline underline-offset-4">
                          /signup
                        </Link>{" "}
                        from the navbar, or click <em>Start free</em>.
                      </>
                    ),
                  },
                  {
                    title: "Enter your details",
                    body: "Full name, email, and a password of at least 8 characters. Or skip the form and use Continue with Google.",
                  },
                  {
                    title: "Confirm your email",
                    body: "We send a verification link — click it to activate the account. Google sign-ins skip this step.",
                  },
                  {
                    title: "Land in the setup wizard",
                    body: "You're dropped straight into the four-step onboarding flow described below.",
                  },
                ]}
              />
              <Callout type="tip" title="More than one owner?">
                Sign up with whoever holds the master WhatsApp number — that&rsquo;s the account that
                receives the 8 AM briefing. Team members can be invited later from Settings.
              </Callout>
            </Section>

            {/* LOGIN */}
            <Section id="login" eyebrow="Returning users" title="Sign in">
              <P>Already have an account? Three ways back in.</P>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  {
                    icon: <Mail size={15} className="text-teal" />,
                    title: "Email & password",
                    body: "The credentials you signed up with. Forgot it? Use the reset link on the login page.",
                  },
                  {
                    icon: <LogIn size={15} className="text-teal" />,
                    title: "Google",
                    body: "One-click sign-in if you registered with Google. Same account, no password to remember.",
                  },
                  {
                    icon: <Smartphone size={15} className="text-teal" />,
                    title: "Mobile app",
                    body: "Once installed, the app stays signed in. Touch ID or Face ID protects access.",
                  },
                ].map((m) => (
                  <div
                    key={m.title}
                    className="h-full rounded-xl border border-os-border bg-os-card p-5 transition-colors duration-300 hover:border-os-border-bright"
                  >
                    <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-md border border-os-border">
                      {m.icon}
                    </div>
                    <h4 className="text-sm font-semibold text-os-ink mb-1.5">{m.title}</h4>
                    <p className="text-xs text-os-text-dim leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>
              <Callout type="warning" title="Trouble signing in?">
                If you signed up with Google you don&rsquo;t have a password — use the Google button
                rather than the email form. If you forgot your password, reset it from the sign-in
                page. Still stuck, email us.
              </Callout>
            </Section>

            {/* SETUP */}
            <Section id="setup" eyebrow="Step 2" title="First-time setup">
              <P>
                After sign-up you land in a four-step wizard. Total time:{" "}
                <strong className="font-semibold text-os-ink">about five minutes</strong>.
              </P>
              <Steps
                items={[
                  {
                    title: "Business profile",
                    body: "Your business name, city, type (coaching, clinic, salon and so on), and the WhatsApp number where briefings should arrive.",
                  },
                  {
                    title: "Connect channels",
                    body: "Pick at least one — WhatsApp, Instagram, Gmail or Outlook. You can add the rest later; each takes one click.",
                  },
                  {
                    title: "AI setup",
                    body: "Describe what you sell in a paragraph, and what makes a good lead. The brain uses this to score every conversation.",
                  },
                  {
                    title: "Launch",
                    body: "Done. KROVA starts watching your channels, runs its first analysis tonight at 10 PM IST, and briefs you at 8 AM tomorrow.",
                  },
                ]}
              />
              <Callout type="tip" title="You can skip steps">
                Channel connections can wait — add them from Settings later. The only required step
                is the business profile.
              </Callout>
            </Section>

            {/* BRIEFING */}
            <Section id="briefing" eyebrow="Daily use" title="The 8 AM briefing">
              <P>
                Every morning at <strong className="font-semibold text-os-ink">8:00 AM IST</strong>,
                KROVA sends a WhatsApp message to your registered number. The whole briefing takes
                under a minute to read.
              </P>

              <div className="rounded-xl border border-os-border bg-os-card p-6">
                <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-os-text-dim mb-4">
                  What a briefing looks like
                </div>
                <div className="space-y-3 text-sm">
                  <p className="text-os-ink">Good morning, Aditya.</p>
                  {[
                    { dot: "bg-thread-bright", lead: "3 hot leads", rest: "need replies today — Priya, Rahul, Anjali." },
                    { dot: "bg-thread", lead: "2 going cold", rest: "— Vikram and Sneha, silent for 4+ days." },
                    { dot: "bg-teal", lead: "₹47,000", rest: "in unpaid quotes. Reply YES and I'll send reminders." },
                    { dot: "bg-os-text-dim", lead: "32 messages", rest: "sent yesterday, reply rate 94%." },
                  ].map((r) => (
                    <p key={r.lead} className="flex items-start gap-3 text-os-text-dim leading-relaxed">
                      <span className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${r.dot}`} />
                      <span>
                        <strong className="font-semibold text-os-ink">{r.lead}</strong> {r.rest}
                      </span>
                    </p>
                  ))}
                </div>
              </div>

              <H3>What you can do from the briefing</H3>
              <Bullets
                items={[
                  "Reply YES to approve every suggested draft in one tap",
                  "Reply with a number to approve just that one action",
                  "Tap any name to open their conversation in the dashboard",
                  "Reply STOP to pause briefings — you can turn them back on any time",
                ]}
              />
              <Callout title="Want a different time?">
                Settings → Briefing → Schedule. Move it to 7 AM, 9 AM, or split it into a morning
                and an evening briefing.
              </Callout>
            </Section>

            {/* ACTIONS */}
            <Section id="actions" eyebrow="Daily use" title="Approving actions">
              <P>
                An <em>action</em> is a draft reply waiting on you. They show up in two places: the
                briefing carries the top five, and the Actions tab in the dashboard has all of them.
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Approve",
                    body: "KROVA sends the message through the channel it came in on. It lands in your sent folder seconds later.",
                  },
                  {
                    title: "Edit, then send",
                    body: "Tweak the draft before it goes. Your edits also teach the AI what your real voice sounds like.",
                  },
                  {
                    title: "Snooze",
                    body: "Push it to later — an hour, tomorrow morning, next Monday. It returns to the top of your queue on its own.",
                  },
                  {
                    title: "Reject",
                    body: "Discard the draft. KROVA learns from rejections: enough on the same theme and it shifts approach.",
                  },
                ].map((m) => (
                  <div
                    key={m.title}
                    className="h-full rounded-xl border border-os-border bg-os-card p-5 transition-colors duration-300 hover:border-os-border-bright"
                  >
                    <h4 className="text-sm font-semibold text-os-ink mb-1.5">{m.title}</h4>
                    <p className="text-xs text-os-text-dim leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* RELATIONSHIPS */}
            <Section id="relationships" eyebrow="Daily use" title="People & relationships">
              <P>
                Everyone who messages you becomes a <em>relationship</em> automatically — no contact
                forms to fill. KROVA builds the database out of inbound chats.
              </P>
              <H3>Each person gets</H3>
              <Bullets
                items={[
                  "A status — hot, warm, cold, converted or lost",
                  "A health score from 0 to 100 showing relationship strength",
                  "Their primary channel (WhatsApp, Instagram, Gmail, Outlook)",
                  "A timeline of every conversation, across every channel",
                  "An assigned team member, if you have a team",
                  "Notes and commitments — anything you promised them",
                ]}
              />
              <Callout type="tip" title="Searching">
                The search bar in Relationships finds someone by name, phone or email, across all
                channels at once.
              </Callout>
            </Section>

            {/* INTELLIGENCE */}
            <Section id="intelligence" eyebrow="Daily use" title="The Intelligence view">
              <P>
                Open{" "}
                <code className="rounded border border-os-border bg-os-card px-1.5 py-0.5 font-mono text-[12px] text-teal">
                  /dashboard/intelligence
                </code>{" "}
                for the deeper signals. The brain surfaces eight categories of insight.
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: "Predictions", body: "Who's likely to churn, who's likely to convert, and when." },
                  { label: "Revenue leaks", body: "Unpaid quotes, ghosted hot leads, abandoned conversations." },
                  { label: "Voice of customer", body: "Clustered themes from real chats — what people keep asking for." },
                  { label: "Commitments", body: "Things you promised, and might otherwise forget to deliver." },
                  { label: "Competitor mentions", body: "When customers name a rival, with the surrounding context." },
                  { label: "Growth blockers", body: "Patterns in lost deals — why you keep losing this customer type." },
                  { label: "Anti-spam alerts", body: "Suspected scams and low-quality leads, before you spend time on them." },
                  { label: "Coaching", body: "Suggestions for improving your replies, based on your own history." },
                ].map((it) => (
                  <div key={it.label} className="h-full rounded-xl border border-os-border bg-os-card p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal-bright mb-1.5">
                      {it.label}
                    </div>
                    <p className="text-sm text-os-text-dim leading-relaxed">{it.body}</p>
                  </div>
                ))}
              </div>
            </Section>

            {/* CHANNELS OVERVIEW */}
            <Section id="channels-overview" eyebrow="Channels" title="Connecting channels">
              <P>
                A channel is any inbox KROVA reads from and writes to. Four are supported today, and
                you can connect more than one of each — useful if you run two WhatsApp numbers or a
                second email address.
              </P>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { icon: <WhatsAppIcon size={20} />, name: "WhatsApp", time: "2 min" },
                  { icon: <InstagramIcon size={20} />, name: "Instagram", time: "3 min" },
                  { icon: <GmailIcon size={20} />, name: "Gmail", time: "1 min" },
                  { icon: <OutlookIcon size={20} />, name: "Outlook", time: "1 min" },
                ].map((c) => (
                  <div
                    key={c.name}
                    className="h-full rounded-xl border border-os-border bg-os-card p-5 text-center transition-colors duration-300 hover:border-os-border-bright"
                  >
                    <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-md border border-os-border">
                      {c.icon}
                    </div>
                    <div className="text-sm font-semibold text-os-ink">{c.name}</div>
                    <div className="font-mono text-[10px] text-os-text-dim mt-1">~{c.time} to set up</div>
                  </div>
                ))}
              </div>
              <Callout title="Where to connect">
                Either during the onboarding wizard, or any time afterwards from{" "}
                <strong className="font-semibold text-os-ink">Settings → Channels</strong>. Removing
                a channel doesn&rsquo;t delete past conversations.
              </Callout>
            </Section>

            {/* WHATSAPP */}
            <Section id="whatsapp" eyebrow="Channels" title="Connecting WhatsApp">
              <P>
                The channel that matters most for Indian SMBs. KROVA supports{" "}
                <strong className="font-semibold text-os-ink">WhatsApp Business</strong>. Personal
                WhatsApp is not supported.
              </P>
              <Steps
                items={[
                  { title: "Open Settings → Channels", body: "Click the WhatsApp tile." },
                  {
                    title: "Scan the QR code",
                    body: "On your phone: WhatsApp Business → Settings → Linked Devices → Link a Device. Scan the code shown in KROVA.",
                  },
                  {
                    title: "Wait for confirmation",
                    body: "A confirmation appears within about ten seconds, and KROVA starts syncing your recent chats immediately.",
                  },
                  {
                    title: "Set the briefing number",
                    body: "Make sure the same number is entered in Settings → Briefing — that's where the 8 AM message goes.",
                  },
                ]}
              />
              <Callout type="warning" title="Personal WhatsApp won't work">
                You need the free WhatsApp Business app. If you only have personal WhatsApp,
                download Business first — it can take over the same number during transfer.
              </Callout>
            </Section>

            {/* INSTAGRAM */}
            <Section id="instagram" eyebrow="Channels" title="Connecting Instagram">
              <P>
                Works with <strong className="font-semibold text-os-ink">Business</strong> and{" "}
                <strong className="font-semibold text-os-ink">Creator</strong> accounts. Personal
                accounts aren&rsquo;t supported by Instagram&rsquo;s API.
              </P>
              <Steps
                items={[
                  {
                    title: "Switch to Business or Creator",
                    body: "Instagram → Settings → Account type → Switch to Business, if you haven't already.",
                  },
                  {
                    title: "Link a Facebook Page",
                    body: "Instagram's API requires a connected Page. Creating one takes a minute if you don't have it.",
                  },
                  {
                    title: "Click Connect in KROVA",
                    body: "Settings → Channels → Instagram sends you to Meta to grant permissions.",
                  },
                  { title: "Approve permissions", body: "Allow KROVA to read and send DMs." },
                ]}
              />
              <Callout type="tip" title="Story replies and comments">
                KROVA also captures story replies and DMs opened from comment buttons. Story replies
                are treated as fresh conversations.
              </Callout>
            </Section>

            {/* GMAIL */}
            <Section id="gmail" eyebrow="Channels" title="Connecting Gmail">
              <P>Works with any Gmail or Google Workspace inbox. One click and you&rsquo;re done.</P>
              <Steps
                items={[
                  { title: "Click Connect Gmail", body: "Settings → Channels → Gmail sends you to Google." },
                  {
                    title: "Choose the right account",
                    body: "If you're signed into several Google accounts, pick the business one.",
                  },
                  {
                    title: "Grant read and send permissions",
                    body: "KROVA reads your business inbox and sends replies on your behalf. Approve both.",
                  },
                  {
                    title: "Filter the inbox (optional)",
                    body: "In Settings → Channels → Gmail you can exclude labels such as Newsletters so they're never analysed.",
                  },
                ]}
              />
            </Section>

            {/* OUTLOOK */}
            <Section id="outlook" eyebrow="Channels" title="Connecting Outlook">
              <P>Works with personal Outlook.com addresses and Microsoft 365 work accounts.</P>
              <Steps
                items={[
                  { title: "Click Connect Outlook", body: "Settings → Channels → Outlook sends you to Microsoft." },
                  { title: "Sign in", body: "Use your Microsoft account credentials." },
                  {
                    title: "Approve permissions",
                    body: "Mail.Read and Mail.Send. KROVA never touches OneDrive or Teams.",
                  },
                ]}
              />
              <Callout title="Workspace admin approval">
                Some Microsoft 365 tenants require IT admin approval before third-party apps can
                connect. If you see that message, forward the Microsoft consent page to your IT team
                — it&rsquo;s a one-click approval at their end.
              </Callout>
            </Section>

            {/* VOICE */}
            <Section id="voice" eyebrow="Configure" title="Teaching KROVA your voice">
              <P>
                Drafts come out in <em>your</em> tone rather than generic chatbot language. The AI
                learns from two places: the messages you&rsquo;ve already sent, and your edits to its
                drafts.
              </P>
              <H3>Where to teach it</H3>
              <div className="space-y-3">
                {[
                  {
                    path: "Settings → Voice → Tone",
                    body: "Pick formal, friendly or casual. This sets the default for new drafts.",
                  },
                  {
                    path: "Settings → Voice → Language mix",
                    body: "English, Hindi or Hinglish. Most Indian SMBs choose Hinglish.",
                  },
                  {
                    path: "Settings → Voice → Examples",
                    body: "Paste five replies you've sent before. The AI copies the cadence, the greetings, the length.",
                  },
                  {
                    path: "Edit any draft that sounds off",
                    body: "Every edit teaches it. After roughly 20 edits, drafts start landing close to right.",
                  },
                ].map((s, i) => (
                  <div
                    key={s.path}
                    className="flex gap-4 rounded-xl border border-os-border bg-os-card p-4"
                  >
                    <span className="font-mono text-[11px] font-bold text-teal shrink-0 pt-0.5">
                      0{i + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-os-ink mb-1">{s.path}</h4>
                      <p className="text-xs text-os-text-dim leading-relaxed">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            {/* GUARDRAILS */}
            <Section id="guardrails" eyebrow="Configure" title="Setting guardrails">
              <P>
                Guardrails are <strong className="font-semibold text-os-ink">hard rules</strong> the
                AI cannot break — never quote below a floor price, never name a competitor, never
                make a medical claim.
              </P>
              <H3>Common guardrails owners set</H3>
              <Bullets
                items={[
                  "Never quote prices without my approval first",
                  "Never recommend a competitor's product",
                  "Never promise delivery faster than 48 hours",
                  "Never use slang like 'bro' or 'mate'",
                  "Always confirm before booking an appointment",
                  "Never share my personal phone number",
                ]}
              />
              <Callout type="security" title="Enforced on every draft">
                Guardrails are checked twice — once while reading the conversation, and again before
                a draft reaches your queue. The brain holds them even if a customer asks directly.
              </Callout>
            </Section>

            {/* AUTOPILOT */}
            <Section id="autopilot" eyebrow="Configure" title="Autopilot rules">
              <P>
                Autopilot lets you set{" "}
                <strong className="font-semibold text-os-ink">when this happens, do that</strong>{" "}
                rules. Set one once and KROVA runs it from then on.
              </P>
              <H3>Popular recipes</H3>
              <div className="space-y-3">
                {[
                  { when: "A lead hasn't replied in 3 days", then: "Draft a polite follow-up and add it to my queue" },
                  { when: "A new lead arrives on WhatsApp", then: "Send a friendly greeting in my Hinglish tone" },
                  { when: "A health score drops below 40", then: "Notify me on WhatsApp and add it to the morning briefing" },
                  { when: "A customer's status changes to converted", then: "Send a thank-you message 30 minutes later" },
                  { when: "Every Monday at 9 AM", then: "Send me a weekly summary of pipeline and revenue" },
                  { when: "A customer mentions a birthday", then: "Remind me a day before and draft a wish" },
                ].map((r) => (
                  <div
                    key={r.when}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:gap-5 rounded-xl border border-os-border bg-os-card p-4"
                  >
                    <div className="sm:col-span-5">
                      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-teal-bright mb-1">
                        When
                      </div>
                      <div className="text-sm text-os-ink leading-snug">{r.when}</div>
                    </div>
                    <div className="sm:col-span-7">
                      <div className="font-mono text-[9px] uppercase tracking-[0.2em] text-os-text-dim mb-1">
                        Then
                      </div>
                      <div className="text-sm text-os-text-dim leading-snug">{r.then}</div>
                    </div>
                  </div>
                ))}
              </div>
              <Callout type="tip" title="Where to set them">
                Settings → Autopilot → New rule. Pick a trigger, pick an action, toggle it on. Up to
                50 active rules per workspace.
              </Callout>
            </Section>

            {/* TEAM */}
            <Section id="team" eyebrow="Configure" title="Adding team members">
              <P>
                On the Pro plan you can invite up to five team members. Each gets their own login
                and a role.
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { role: "Owner", desc: "Full access — billing, settings, channels, everything." },
                  { role: "Manager", desc: "Sees all data and edits guardrails, but can't change billing." },
                  { role: "Team member", desc: "Sees only the conversations assigned to them, and approves their own actions." },
                ].map((r) => (
                  <div
                    key={r.role}
                    className="h-full rounded-xl border border-os-border bg-os-card p-5 transition-colors duration-300 hover:border-os-border-bright"
                  >
                    <h4 className="text-sm font-semibold text-os-ink mb-1.5">{r.role}</h4>
                    <p className="text-xs text-os-text-dim leading-relaxed">{r.desc}</p>
                  </div>
                ))}
              </div>
              <H3>How to invite</H3>
              <Steps
                items={[
                  { title: "Open Settings → Team", body: "The team list lives at the bottom of Settings." },
                  { title: "Click Invite member", body: "Enter their email and pick a role." },
                  { title: "They receive an email", body: "The link takes them through a 30-second sign-up." },
                  {
                    title: "Start assigning conversations",
                    body: "On any customer page, set the Assigned dropdown to that team member.",
                  },
                ]}
              />
            </Section>

            {/* MOBILE */}
            <Section id="mobile" eyebrow="Apps" title="Using the mobile app">
              <P>The mobile app has full parity with the web dashboard, on iOS and Android.</P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  {
                    title: "Approve from anywhere",
                    body: "One-tap approve or reject straight from the lock-screen notification, without opening the app.",
                  },
                  {
                    title: "Push alerts for hot leads",
                    body: "KROVA pings you the moment a buyer-intent message lands, so you never miss the window.",
                  },
                  {
                    title: "Voice-note transcription",
                    body: "Hindi, Hinglish and English. Customers send voice notes; KROVA reads them as text.",
                  },
                  {
                    title: "Works offline",
                    body: "Drafts you approve while offline are queued and sent as soon as you reconnect.",
                  },
                ].map((m) => (
                  <div
                    key={m.title}
                    className="h-full rounded-xl border border-os-border bg-os-card p-5 transition-colors duration-300 hover:border-os-border-bright"
                  >
                    <h4 className="text-sm font-semibold text-os-ink mb-1.5">{m.title}</h4>
                    <p className="text-xs text-os-text-dim leading-relaxed">{m.body}</p>
                  </div>
                ))}
              </div>
              <Callout title="Where to download">
                The mobile app is in private beta. Email us to request access and we&rsquo;ll send a
                TestFlight or Play Store invite within 24 hours.
              </Callout>
            </Section>

            {/* SETTINGS MAP */}
            <Section id="settings" eyebrow="Help" title="Where everything lives">
              <P>A quick map of where each setting sits in the dashboard.</P>
              <div className="overflow-hidden rounded-xl border border-os-border">
                {[
                  { path: "Settings → Profile", what: "Business name, city, type" },
                  { path: "Settings → Channels", what: "Connect or disconnect WhatsApp, Instagram, Gmail, Outlook" },
                  { path: "Settings → Briefing", what: "Phone number, time, frequency" },
                  { path: "Settings → Voice", what: "Tone, language, sample replies" },
                  { path: "Settings → Guardrails", what: "Rules the AI must never break" },
                  { path: "Settings → Autopilot", what: "Automatic when / then rules" },
                  { path: "Settings → Team", what: "Invite team members, set roles" },
                  { path: "Settings → Privacy", what: "Export data, delete everything" },
                  { path: "Settings → Billing", what: "Plan, payment method, invoices" },
                ].map((row) => (
                  <div
                    key={row.path}
                    className="grid grid-cols-1 sm:grid-cols-12 gap-1 sm:gap-5 border-b border-os-border bg-os-card px-4 py-3 last:border-b-0 transition-colors hover:bg-os-card/60"
                  >
                    <code className="sm:col-span-5 font-mono text-[12px] text-teal">{row.path}</code>
                    <span className="sm:col-span-7 text-sm text-os-text-dim">{row.what}</span>
                  </div>
                ))}
              </div>
            </Section>

            {/* FAQ */}
            <Section id="faq" eyebrow="Help" title="Frequently asked">
              <FaqAccordion items={FAQ_ITEMS} />
            </Section>

            {/* TROUBLESHOOTING */}
            <Section id="troubleshooting" eyebrow="Help" title="Common issues">
              <FaqAccordion items={TROUBLESHOOTING} />
            </Section>

            {/* PRIVACY */}
            <Section id="privacy" eyebrow="Help" title="Privacy & your data">
              <P>
                KROVA is built for Indian SMBs under Indian data law. Your conversations stay yours.
              </P>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    k: "Where your data lives",
                    v: "Managed cloud infrastructure. Some providers process data outside India under their standard contractual protections.",
                  },
                  { k: "Encryption", v: "TLS in transit. Access tokens and provider keys encrypted at rest." },
                  {
                    k: "Compliance",
                    v: "Built around the DPDP Act 2023 (India). We hold no third-party security certifications.",
                  },
                  {
                    k: "Model training",
                    v: "We do not train any model on your data, and our AI provider does not train on API data.",
                  },
                  {
                    k: "Delete everything",
                    v: "Email privacy@aqirox.com. Erased within 30 days of a verified request.",
                  },
                  { k: "Audit log", v: "Application logs are retained for security and debugging." },
                ].map((r) => (
                  <div key={r.k} className="h-full rounded-xl border border-os-border bg-os-card p-4">
                    <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-teal-bright mb-1.5">
                      {r.k}
                    </div>
                    <p className="text-sm text-os-text-dim leading-relaxed">{r.v}</p>
                  </div>
                ))}
              </div>
              <Callout type="security" title="See something off?">
                Email{" "}
                <a
                  href="mailto:privacy@aqirox.com"
                  className="font-semibold text-os-ink hover:text-teal transition-colors"
                >
                  privacy@aqirox.com
                </a>
                . We take every report seriously and reply within 24 hours.
              </Callout>
            </Section>

            {/* CLOSING CTA */}
            <section className="rounded-2xl border border-os-border p-10 sm:p-12 text-center">
              <h2 className="font-serif text-3xl font-semibold tracking-tight text-os-ink mb-3">
                Ready to set it up?
              </h2>
              <p className="text-os-text-dim mb-8 max-w-sm mx-auto leading-relaxed">
                Five minutes of setup, and your first briefing lands tomorrow morning.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/signup" className="w-full sm:w-auto">
                  <span className="os-button os-button-cta w-full sm:w-auto justify-center px-8 py-3 text-sm inline-flex">
                    Create account <ArrowRight size={16} />
                  </span>
                </Link>
                <a
                  href="mailto:support@aqirox.com"
                  className="text-sm font-medium text-os-text-dim hover:text-os-ink transition-colors"
                >
                  Email support
                </a>
              </div>
            </section>
          </main>
        </div>
      </div>

      {/* BACK TO TOP */}
      <motion.button
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        initial={false}
        animate={{ opacity: showTop ? 1 : 0, y: showTop ? 0 : 8 }}
        className={`fixed bottom-6 right-6 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-os-border bg-os-card text-os-text-dim transition-colors hover:border-os-border-bright hover:text-os-ink ${
          showTop ? "" : "pointer-events-none"
        }`}
        aria-label="Back to top"
      >
        <ArrowUp size={16} />
      </motion.button>

      <SiteFooter />
    </div>
  );
}

/* ─────────────────────── content primitives ─────────────────────── */

function Section({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-[12rem] lg:scroll-mt-32 border-t border-os-border pt-14 first:border-t-0 first:pt-0">
      <div className="font-mono text-[11px] uppercase tracking-[0.2em] text-teal-bright mb-3">
        {eyebrow}
      </div>
      <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-os-ink mb-6">
        {title}
      </h2>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Lead({ children }: { children: ReactNode }) {
  return <p className="text-[17px] leading-[1.75] text-os-ink/90">{children}</p>;
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-[15px] leading-[1.8] text-os-text-dim">{children}</p>;
}

function H3({ children }: { children: ReactNode }) {
  return <h3 className="text-base font-semibold text-os-ink pt-2">{children}</h3>;
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-3">
          <Check size={14} className="mt-1 shrink-0 text-teal" />
          <span className="text-[15px] leading-relaxed text-os-text-dim">{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Steps({ items }: { items: { title: string; body: ReactNode }[] }) {
  return (
    <ol className="relative ml-3 space-y-7 border-l border-os-border pl-8">
      {items.map((s, i) => (
        <li key={s.title} className="relative">
          <span className="absolute -left-[2.875rem] flex h-7 w-7 items-center justify-center rounded-full border border-teal/40 bg-os-bg font-mono text-[11px] font-bold text-teal">
            {i + 1}
          </span>
          <h4 className="text-[15px] font-semibold text-os-ink mb-1">{s.title}</h4>
          <div className="text-sm leading-relaxed text-os-text-dim">{s.body}</div>
        </li>
      ))}
    </ol>
  );
}
