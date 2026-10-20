"use client";

import React, { useEffect, useRef, useState } from "react";
import { ArrowUp, LifeBuoy, RotateCcw, Sparkles, X } from "lucide-react";
import { AppLayout } from "@/components/shell/AppLayout";
import { GlassCard } from "@/components/ui/GlassCard";
import { Badge } from "@/components/ui/Badge";
import {
  account, help,
  type SupportTicket, type TicketCategory, type TicketDraft, type TicketStatus,
} from "@/lib/api";
import { takeTicketFromBubble, useBuddyChat } from "./useBuddyChat";

const STARTERS = [
  "WhatsApp template kaise banaun?",
  "Meri automation kyun nahi chali?",
  "How do I add a team member?",
  "Wallet mein paise kaise daalun?",
];

const CATEGORY_LABEL: Record<TicketCategory, string> = {
  bug: "Something is broken",
  how_to: "How do I…",
  billing: "Billing or payment",
  account: "Account or login",
  feature_request: "Feature request",
  other: "Something else",
};

const STATUS_LOOK: Record<TicketStatus, { label: string; variant: "amber" | "cyan" | "emerald" }> = {
  open: { label: "Open", variant: "amber" },
  in_progress: { label: "Being worked on", variant: "cyan" },
  resolved: { label: "Resolved", variant: "emerald" },
};

const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * Help: KROVA Buddy answers questions about using KROVA from KROVA's own help articles, and when it can't (or
 * something is broken) offers a ticket to KROVA's team, prefilled from the chat. The team's reply shows here.
 * Owner and admins only - the API refuses everyone else. The chat is the same one the corner bubble
 * (BuddyBubble) holds, so a question asked there carries on here.
 */
// Inside the phone app the app's own shell is already around it - no desktop sidebar. Defined here, not inside
// HelpCenter, so it keeps one identity across renders (a component made during render remounts everything below
// it on every keystroke).
function EmbeddedShell({ children }: { children: React.ReactNode; title?: string; subtitle?: string }) {
  return (
    <div className="px-4 pt-5 pb-6 max-w-md mx-auto space-y-4">
      <h1 className="text-lg font-semibold text-os-ink">Help</h1>
      {children}
    </div>
  );
}

export function HelpCenter({ embedded = false }: { embedded?: boolean }) {
  const Shell = embedded ? EmbeddedShell : AppLayout;
  const [role, setRole] = useState<string | null | undefined>(undefined);
  const [from, setFrom] = useState<string | null>(null);

  const { turns, busy, error, offer, setOffer, left, ask: askBuddy, reset } = useBuddyChat(from);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [openTicket, setOpenTicket] = useState<string | null>(null);
  const [form, setForm] = useState<TicketDraft | null>(null);
  const [sending, setSending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [raised, setRaised] = useState<SupportTicket | null>(null);

  useEffect(() => {
    account.profile().then((p) => setRole(p.role ?? null)).catch(() => setRole(null));
    const params = new URLSearchParams(window.location.search);
    const page = params.get("from");
    setFrom(page);
    help.tickets().then(setTickets).catch(() => setTickets([]));
    // Sent here by the corner bubble's "Raise a ticket": open the form with Buddy's draft.
    if (params.get("ticket") === "1") {
      const draft = takeTicketFromBubble();
      setForm({
        subject: draft?.subject ?? "", category: draft?.category ?? "other",
        details: draft?.details ?? "", page: draft?.page ?? page ?? "",
      });
    }
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [turns, busy]);

  // On a phone the form opens below the chat - bring it into view.
  const formOpen = form !== null;
  useEffect(() => {
    if (formOpen) formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [formOpen]);

  const ask = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput("");
    if (!(await askBuddy(text))) setInput(text.trim());
  };

  const startTicket = (draft?: TicketDraft | null) => {
    setRaised(null);
    setFormError(null);
    setForm({
      subject: draft?.subject ?? "",
      category: draft?.category ?? "other",
      details: draft?.details ?? "",
      page: draft?.page ?? from ?? "",
    });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setSending(true);
    setFormError(null);
    try {
      const t = await help.raise({ ...form, page: form.page || null, transcript: turns.slice(-24) });
      setTickets((prev) => [t, ...prev]);
      setRaised(t);
      setForm(null);
      setOffer(null);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not raise the ticket.");
    } finally {
      setSending(false);
    }
  };

  if (role === undefined) {
    return <Shell title="Help" subtitle="Loading…"><div /></Shell>;
  }
  if (role !== "owner" && role !== "admin") {
    return (
      <Shell title="Help" subtitle="Questions about KROVA, and issues for KROVA's team">
        <GlassCard className="p-6 text-sm text-os-text-dim">
          Help is for the owner and admins. Ask one of them, or write to support@aqirox.com.
        </GlassCard>
      </Shell>
    );
  }

  return (
    <Shell title="Help" subtitle="Ask KROVA Buddy how to do anything in KROVA, or raise an issue with KROVA's team">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* KROVA Buddy */}
        <GlassCard className="p-4 sm:p-5 flex flex-col min-h-[520px]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">KROVA Buddy</h3>
                <p className="text-xs text-os-text-dim">Answers from KROVA&apos;s help guide, in English or Hinglish. It can&apos;t see or change your data.</p>
              </div>
            </div>
            {turns.length > 0 && (
              <button
                type="button"
                onClick={reset}
                className="shrink-0 flex items-center gap-1 text-[11px] text-os-text-dim hover:text-white cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" /> New chat
              </button>
            )}
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto max-h-[60vh] pr-1">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-xs text-os-text-dim">Try one of these:</p>
                <div className="flex flex-wrap gap-2">
                  {STARTERS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => ask(s)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-xs text-os-text-dim hover:text-white cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "owner" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[88%] px-3 py-2 rounded-xl text-[13px] leading-relaxed whitespace-pre-wrap break-words ${
                    t.role === "owner"
                      ? "bg-cyan-500/15 text-white border border-cyan-500/20"
                      : "bg-white/[0.05] text-white/90 border border-white/[0.08]"
                  }`}
                >
                  {t.text}
                </p>
              </div>
            ))}
            {busy && <p className="text-[11px] text-os-text-dim animate-pulse">KROVA Buddy is looking it up…</p>}
            {offer && !busy && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-3 flex flex-wrap items-center gap-3">
                <p className="text-xs text-amber-100 flex-1 min-w-[180px]">Want KROVA&apos;s team to look at this? Your chat goes with the ticket.</p>
                <button
                  type="button"
                  onClick={() => startTicket(offer)}
                  className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-100 text-xs font-semibold border border-amber-500/30 cursor-pointer"
                >
                  Raise a ticket
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
          <form onSubmit={(e) => { e.preventDefault(); ask(input); }} className="flex items-end gap-2 mt-3">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); ask(input); } }}
              rows={1}
              maxLength={3000}
              placeholder="Ask anything about KROVA…"
              className="flex-1 resize-none px-3 py-2.5 rounded-lg bg-black/40 border border-white/[0.12] text-sm text-white placeholder:text-os-text-dim focus:border-cyan-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              aria-label="Send"
              className="p-2.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 cursor-pointer disabled:opacity-40 disabled:cursor-default"
            >
              <ArrowUp className="w-4 h-4" />
            </button>
          </form>
          {left && <p className="text-[10px] text-os-text-dim mt-1.5">{left}</p>}
        </GlassCard>

        {/* Tickets */}
        <div className="space-y-4">
          <GlassCard className="p-4 sm:p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white/[0.05] border border-white/[0.1] text-white">
                <LifeBuoy className="w-4 h-4" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold text-white">KROVA&apos;s team</h3>
                <p className="text-xs text-os-text-dim">Something broken, or Buddy couldn&apos;t help? We reply here.</p>
              </div>
            </div>
            {!form && (
              <button
                type="button"
                onClick={() => startTicket(offer)}
                className="w-full px-3 py-2 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] text-white text-xs font-semibold border border-white/[0.1] cursor-pointer"
              >
                Raise an issue
              </button>
            )}
            {raised && (
              <p className="text-xs text-emerald-300">
                Ticket {raised.number} raised. KROVA&apos;s team will reply here.
              </p>
            )}
            {form && (
              <form ref={formRef} onSubmit={submit} className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-white">New ticket</p>
                  <button type="button" aria-label="Close" onClick={() => setForm(null)} className="text-os-text-dim hover:text-white cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as TicketCategory })}
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                >
                  {(Object.keys(CATEGORY_LABEL) as TicketCategory[]).map((c) => (
                    <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
                  ))}
                </select>
                <input
                  value={form.subject}
                  onChange={(e) => setForm({ ...form, subject: e.target.value })}
                  required minLength={3} maxLength={200}
                  placeholder="In one line, what's wrong?"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <textarea
                  value={form.details}
                  onChange={(e) => setForm({ ...form, details: e.target.value })}
                  required minLength={5} maxLength={4000} rows={5}
                  placeholder="What did you do, what did you expect, and what happened instead?"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                <input
                  value={form.page ?? ""}
                  onChange={(e) => setForm({ ...form, page: e.target.value })}
                  maxLength={100}
                  placeholder="Which page? (optional, e.g. Automations)"
                  className="w-full px-3 py-2 rounded-lg bg-black/40 border border-white/[0.12] text-xs text-white focus:border-cyan-500 focus:outline-none"
                />
                {turns.length > 0 && (
                  <p className="text-[11px] text-os-text-dim">Your chat with KROVA Buddy is attached, so you don&apos;t have to repeat it.</p>
                )}
                {formError && <p className="text-xs text-red-400">{formError}</p>}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full px-3 py-2 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 text-xs font-semibold border border-cyan-500/30 cursor-pointer disabled:opacity-50"
                >
                  {sending ? "Sending…" : "Send to KROVA's team"}
                </button>
              </form>
            )}
          </GlassCard>

          <GlassCard className="p-4 sm:p-5 space-y-2">
            <h3 className="text-sm font-bold text-white">Your tickets</h3>
            {tickets.length === 0 && <p className="text-xs text-os-text-dim">No tickets yet.</p>}
            {tickets.map((t) => {
              const look = STATUS_LOOK[t.status];
              const isOpen = openTicket === t.id;
              return (
                <div key={t.id} className="rounded-lg border border-white/[0.08] bg-black/20">
                  <button
                    type="button"
                    onClick={() => setOpenTicket(isOpen ? null : t.id)}
                    className="w-full text-left px-3 py-2.5 flex items-start gap-2 cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white truncate">{t.subject}</p>
                      <p className="text-[10px] text-os-text-dim font-mono">{t.number} · {when(t.created_at)}{t.reply ? " · replied" : ""}</p>
                    </div>
                    <Badge variant={look.variant} size="sm">{look.label}</Badge>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-2">
                      <p className="text-xs text-os-text-dim whitespace-pre-wrap break-words">{t.details}</p>
                      {t.reply ? (
                        <div className="rounded-lg bg-cyan-500/[0.07] border border-cyan-500/20 p-2.5">
                          <p className="text-[10px] uppercase tracking-wide text-cyan-300 mb-1">
                            KROVA team{t.replied_at ? ` · ${when(t.replied_at)}` : ""}
                          </p>
                          <p className="text-xs text-white whitespace-pre-wrap break-words">{t.reply}</p>
                        </div>
                      ) : (
                        <p className="text-[11px] text-os-text-dim">No reply yet.</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </GlassCard>
        </div>
      </div>
    </Shell>
  );
}
