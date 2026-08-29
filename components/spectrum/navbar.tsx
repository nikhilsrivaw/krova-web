"use client";

import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useScroll,
} from "motion/react";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  Brain,
  Sun,
  Sparkles,
  DollarSign,
  Layout,
  Zap,
  ArrowRight,
  Command,
  Search,
  ChevronDown,
  BookOpen,
  Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { WhatsAppIcon } from "@/components/spectrum/brand-icons";

interface NavLink {
  label: string;
  href: string;
  mega?: MegaItem[];
}

interface MegaItem {
  icon: ReactNode;
  title: string;
  description: string;
  href: string;
}

const LINKS: NavLink[] = [
  {
    label: "Workspace",
    href: "/workspace",
    mega: [
      {
        icon: <Layout size={18} className="text-teal" />,
        title: "Unified Inbox",
        description: "WhatsApp, IG, Gmail in one workspace.",
        href: "/workspace",
      },
      {
        icon: <Zap size={18} className="text-teal" />,
        title: "Actions Queue",
        description: "AI-drafted replies, you just approve.",
        href: "/dashboard/approvals",
      },
    ],
  },
  {
    label: "Intelligence",
    href: "/intelligence",
    mega: [
      {
        icon: <Brain size={18} className="text-teal" />,
        title: "AI Brain",
        description: "Reads every conversation. Scores every lead.",
        href: "/intelligence",
      },
      {
        icon: <Sun size={18} className="text-teal" />,
        title: "Morning Briefing",
        description: "8 AM WhatsApp report — what to do today.",
        href: "/intelligence",
      },
      {
        icon: <DollarSign size={18} className="text-seal-bright" />,
        title: "Revenue Leaks",
        description: "Unpaid quotes & lost replies, caught nightly.",
        href: "/dashboard/revenue",
      },
      {
        icon: <Sparkles size={18} className="text-seal-bright" />,
        title: "Ghost Writer",
        description: "Drafts in your Hinglish tone. You approve.",
        href: "/intelligence",
      },
    ],
  },
  { label: "WhatsApp", href: "/whatsapp" },
  { label: "Mobile", href: "/mobile" },
  { label: "Docs", href: "/docs" },
  { label: "Pricing", href: "/pricing" },
];

function MagneticLink({
  link,
  onHover,
  onLeave,
  onClick,
}: {
  link: NavLink;
  onHover: (rect: DOMRect, hasMega: boolean) => void;
  onLeave: () => void;
  onClick?: () => void;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  function handleEnter() {
    if (ref.current) onHover(ref.current.getBoundingClientRect(), !!link.mega);
  }
  return (
    <Link
      ref={ref}
      href={link.href}
      onMouseEnter={handleEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      className="relative z-10 flex items-center gap-1 px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
    >
      {link.label}
      {link.mega && <ChevronDown size={11} className="opacity-60" />}
    </Link>
  );
}

const MOBILE_ICONS: Record<string, ReactNode> = {
  Workspace: <Layout size={16} className="text-teal" />,
  Intelligence: <Brain size={16} className="text-teal" />,
  WhatsApp: <WhatsAppIcon size={16} />,
  Mobile: <Smartphone size={16} className="text-teal" />,
  Docs: <BookOpen size={16} className="text-teal" />,
  Pricing: <DollarSign size={16} className="text-teal" />,
};

/** Three-line hamburger that morphs into an X instead of an instant icon swap. */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="relative flex h-4 w-4 items-center justify-center">
      <motion.span
        className="absolute h-[1.5px] w-4 rounded-full bg-current"
        animate={{ rotate: open ? 45 : 0, y: open ? 0 : -5 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
      <motion.span
        className="absolute h-[1.5px] w-4 rounded-full bg-current"
        animate={{ opacity: open ? 0 : 1, scale: open ? 0.5 : 1 }}
        transition={{ duration: 0.15 }}
      />
      <motion.span
        className="absolute h-[1.5px] w-4 rounded-full bg-current"
        animate={{ rotate: open ? -45 : 0, y: open ? 0 : 5 }}
        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      />
    </div>
  );
}

const mobilePanelVariants = {
  hidden: { opacity: 0, y: -16, scale: 0.98 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { duration: 0.28, ease: [0.16, 1, 0.3, 1] as const, staggerChildren: 0.045, delayChildren: 0.06 },
  },
  exit: { opacity: 0, y: -12, scale: 0.98, transition: { duration: 0.15 } },
};

const mobileItemVariants = {
  hidden: { opacity: 0, x: -10 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.2 } },
};

export function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [pillStyle, setPillStyle] = useState<{
    left: number;
    width: number;
    visible: boolean;
  }>({ left: 0, width: 0, visible: false });
  const [activeMega, setActiveMega] = useState<NavLink | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useMotionValueEvent(scrollY, "change", (latest) => {
    setScrolled(latest > 40);
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  // Cmd+K
  const [cmdOpen, setCmdOpen] = useState(false);
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((v) => !v);
      }
      if (e.key === "Escape") setCmdOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function handleLinkHover(rect: DOMRect, hasMega: boolean, link: NavLink) {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    // Position pill relative to the inner links container (its actual parent)
    if (!linksRef.current) return;
    const linksRect = linksRef.current.getBoundingClientRect();
    setPillStyle({
      left: rect.left - linksRect.left,
      width: rect.width,
      visible: true,
    });
    if (hasMega) setActiveMega(link);
    else setActiveMega(null);
  }

  function handleLinkLeave() {
    closeTimeoutRef.current = setTimeout(() => {
      setPillStyle((p) => ({ ...p, visible: false }));
      setActiveMega(null);
    }, 180);
  }

  function handleMegaEnter() {
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
  }

  function handleMegaLeave() {
    setPillStyle((p) => ({ ...p, visible: false }));
    setActiveMega(null);
  }

  return (
    <>
      <div className="fixed top-6 left-0 w-full flex justify-center z-50 px-6 pointer-events-none">
        <motion.nav
          ref={navRef}
          initial={{ y: -20, opacity: 0 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: scrolled ? 0.97 : 1,
          }}
          transition={{ duration: 0.25 }}
          className={cn(
            "pointer-events-auto relative h-14 rounded-full flex items-center justify-between px-2 max-w-5xl w-full shadow-2xl overflow-visible transition-all duration-300",
            scrolled
              ? "border border-white/20 bg-os-bg/85 backdrop-blur-2xl"
              : "border border-os-border bg-os-bg/60 backdrop-blur-xl",
          )}
        >
          {/* Left: logo */}
          <Link
            href="/"
            className="relative z-10 flex items-center gap-2 pl-3 pr-2 group"
          >
            <motion.div
              whileHover={{ rotate: 12, scale: 1.08 }}
              className="relative w-7 h-7 rounded-lg overflow-hidden"
            >
              <img
                src="/logo-mark.svg"
                alt="Krova logo"
                width={28}
                height={28}
                className="h-7 w-7"
              />
            </motion.div>
            <div className="flex flex-col leading-none whitespace-nowrap">
              <span className="text-sm font-black tracking-tighter">KROVA</span>
              <span className="text-[8px] text-os-text-dim font-mono uppercase tracking-[0.1em]">
                AI Analyst
              </span>
            </div>
          </Link>

          {/* Center: links with magnetic pill */}
          <div
            ref={linksRef}
            className="hidden md:flex relative items-center"
            onMouseLeave={handleLinkLeave}
          >
            <motion.div
              initial={false}
              animate={{
                left: pillStyle.left,
                width: pillStyle.width,
                opacity: pillStyle.visible ? 1 : 0,
              }}
              transition={{
                type: "spring",
                stiffness: 500,
                damping: 35,
                opacity: { duration: 0.15 },
              }}
              className="absolute top-1/2 -translate-y-1/2 h-8 rounded-full bg-white/[0.06] border border-white/10 pointer-events-none"
            />
            {LINKS.map((l) => (
              <MagneticLink
                key={l.label}
                link={l}
                onHover={(rect, hasMega) => handleLinkHover(rect, hasMega, l)}
                onLeave={handleLinkLeave}
              />
            ))}
          </div>

          {/* Right: cmdK + auth + CTA */}
          <div className="relative z-10 flex items-center gap-2 pr-2">
            {/* Cmd+K */}
            <a
              href="https://app.krova.space"
              target="_blank"
              rel="noopener"
              className="hidden md:block text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors px-2"
            >
              Open App
            </a>

            <Link href="/login" className="hidden md:block">
              <motion.button
                whileHover={{ color: "#FFFFFF" }}
                className="text-[11px] font-bold uppercase tracking-widest text-os-text-dim transition-colors px-2"
              >
                Log in
              </motion.button>
            </Link>

            {/* CTA */}
            <Link href="/signup" className="hidden md:block">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-white text-black px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5"
              >
                Start Free
                <ArrowRight size={12} />
              </motion.button>
            </Link>

            {/* Mobile hamburger */}
            <motion.button
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "Close menu" : "Open menu"}
              whileTap={{ scale: 0.9 }}
              className={cn(
                "md:hidden flex items-center justify-center size-9 rounded-full border transition-colors duration-300",
                mobileOpen
                  ? "border-teal/40 bg-teal/10 text-teal"
                  : "border-os-border text-os-ink",
              )}
            >
              <HamburgerIcon open={mobileOpen} />
            </motion.button>
          </div>
        </motion.nav>
      </div>

      {/* MOBILE MENU BACKDROP */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileOpen(false)}
            className="md:hidden fixed inset-0 z-30 bg-black/50 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>

      {/* MOBILE MENU PANEL */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            key="mobile-panel"
            variants={mobilePanelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="md:hidden fixed top-[76px] left-0 w-full z-40 px-6"
          >
            <div className="relative rounded-2xl border border-os-border bg-os-bg/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-teal/60 to-transparent" />
              <div className="p-2">
                {LINKS.map((l) => (
                  <motion.div key={l.label} variants={mobileItemVariants}>
                    <Link
                      href={l.href}
                      onClick={() => setMobileOpen(false)}
                      className="group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-os-ink hover:bg-os-card transition-colors"
                    >
                      <span className="flex size-8 items-center justify-center rounded-lg border border-os-border bg-os-card/60 shrink-0">
                        {MOBILE_ICONS[l.label]}
                      </span>
                      <span className="flex-1">{l.label}</span>
                      <ArrowRight
                        size={13}
                        className="text-os-text-dim opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all"
                      />
                    </Link>
                  </motion.div>
                ))}
              </div>
              <motion.div variants={mobileItemVariants} className="border-t border-os-border p-4 space-y-3">
                <a
                  href="https://app.krova.space"
                  target="_blank"
                  rel="noopener"
                  className="block text-[11px] font-bold uppercase tracking-widest text-os-text-dim hover:text-white transition-colors"
                >
                  Open App
                </a>
                <div className="flex items-center gap-3">
                  <Link href="/login" onClick={() => setMobileOpen(false)} className="flex-1">
                    <button className="w-full py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest border border-os-border text-os-ink">
                      Log in
                    </button>
                  </Link>
                  <Link href="/signup" onClick={() => setMobileOpen(false)} className="flex-1">
                    <button className="w-full py-2.5 rounded-full text-[11px] font-bold uppercase tracking-widest bg-white text-black flex items-center justify-center gap-1.5">
                      Start Free <ArrowRight size={12} />
                    </button>
                  </Link>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MEGA MENU PANEL */}
      <AnimatePresence>
        {activeMega && activeMega.mega && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            onMouseEnter={handleMegaEnter}
            onMouseLeave={handleMegaLeave}
            className="fixed top-[80px] left-0 w-full flex justify-center z-40 px-6 pointer-events-none"
          >
            {/* Invisible hover bridge so cursor doesn't lose hover crossing the gap */}
            <div className="pointer-events-auto absolute top-0 left-1/2 -translate-x-1/2 w-[640px] h-4" />
            <div className="pointer-events-auto relative mt-4 max-w-3xl w-full rounded-3xl border border-os-border bg-os-card/95 backdrop-blur-2xl shadow-2xl overflow-hidden">
              <div className="p-6 grid grid-cols-2 gap-3">
                {activeMega.mega.map((item) => (
                  <Link
                    key={item.title}
                    href={item.href}
                    className="group relative rounded-2xl border border-os-border bg-os-bg/40 p-4 hover:border-os-border-bright hover:bg-os-bg/70 transition-colors overflow-hidden"
                  >
                    <div className="relative flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-os-card border border-os-border flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        {item.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold flex items-center gap-1.5">
                          {item.title}
                          <ArrowRight
                            size={12}
                            className="text-os-text-dim opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                        <div className="text-[11px] text-os-text-dim mt-0.5">
                          {item.description}
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="border-t border-os-border px-6 py-3 flex items-center justify-end bg-os-bg/40">
                <Link
                  href={activeMega.href}
                  className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-white hover:text-teal transition-colors"
                >
                  Explore {activeMega.label} <ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* COMMAND PALETTE */}
      <AnimatePresence>
        {cmdOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-start justify-center pt-32 px-6"
            onClick={() => setCmdOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              onClick={(e: MouseEvent) => e.stopPropagation()}
              className="relative w-full max-w-xl rounded-2xl border border-os-border bg-os-card shadow-2xl overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3.5 border-b border-os-border">
                <Search size={16} className="text-os-text-dim" />
                <input
                  autoFocus
                  placeholder="Search pages, features, or ask KROVA..."
                  className="flex-1 bg-transparent text-sm text-white placeholder:text-os-text-dim focus:outline-none"
                />
                <kbd className="px-1.5 py-0.5 text-[9px] font-mono bg-os-bg border border-os-border rounded text-os-text-dim">
                  ESC
                </kbd>
              </div>
              <div className="p-2 max-h-[400px] overflow-y-auto">
                <div className="px-2 py-1.5 text-[9px] font-bold uppercase tracking-widest text-os-text-dim">
                  Jump to
                </div>
                {[
                  { icon: <Layout size={14} />, label: "Workspace", href: "/workspace" },
                  { icon: <Brain size={14} />, label: "Intelligence", href: "/intelligence" },
                  { icon: <Smartphone size={14} />, label: "Mobile (PWA)", href: "/mobile" },
                  { icon: <BookOpen size={14} />, label: "Documentation", href: "/docs" },
                  { icon: <Sun size={14} />, label: "Morning Briefing", href: "/intelligence" },
                  { icon: <DollarSign size={14} />, label: "Revenue Leaks", href: "/dashboard/revenue" },
                  { icon: <Command size={14} />, label: "Pricing", href: "/pricing" },
                ].map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    onClick={() => setCmdOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-os-border/50 transition-colors text-sm"
                  >
                    <div className="w-7 h-7 rounded-lg bg-os-bg border border-os-border flex items-center justify-center text-os-text-dim">
                      {item.icon}
                    </div>
                    <span className="flex-1">{item.label}</span>
                    <ArrowRight size={12} className="text-os-text-dim" />
                  </Link>
                ))}
              </div>
              <div className="border-t border-os-border px-4 py-2.5 flex items-center justify-between bg-os-bg/40 text-[10px] font-mono text-os-text-dim">
                <span>Powered by KROVA AI</span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 rounded bg-os-card border border-os-border">↵</kbd>
                  to select
                </span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
