"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowUp, RotateCcw, Sparkles, X } from "lucide-react";
import { useRole } from "@/lib/useRole";
import { handTicketToHelp, useBuddyChat } from "./useBuddyChat";

// Pages it stays off: Help already has Buddy, and the inbox's reply box sits in the same corner.
const HIDDEN_ON = ["/help", "/conversations"];

/**
 * KROVA Buddy in the corner of every desktop page: a button that opens a small chat. Buddy is told which page it was
 * opened from. A ticket isn't raised here - "Raise a ticket" opens the Help page with the form already filled.
 * Owner and admins only, like Help itself.
 */
export function BuddyBubble() {
  const pathname = usePathname() || "/";
  const router = useRouter();
  const { supervisor } = useRole();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const { turns, busy, error, offer, left, ask, reset } = useBuddyChat(pathname);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "nearest" });
  }, [open, turns, busy]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!supervisor || HIDDEN_ON.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    setInput("");
    if (!(await ask(text))) setInput(text.trim());
  };

  const raiseTicket = () => {
    handTicketToHelp({ subject: "", category: "other", details: "", ...offer, page: offer?.page || pathname });
    router.push(`/help?from=${encodeURIComponent(pathname)}&ticket=1`);
  };

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="KROVA Buddy"
          className="fixed bottom-20 right-4 sm:right-6 z-[45] flex h-[min(520px,calc(100dvh-7rem))] w-[min(380px,calc(100vw-2rem))] flex-col rounded-2xl border border-white/[0.1] bg-[#0b0f17] shadow-2xl"
        >
          <div className="flex items-center gap-2.5 border-b border-white/[0.08] px-4 py-3">
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/10 p-1.5 text-cyan-400">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">KROVA Buddy</p>
              <p className="truncate text-[10px] text-os-text-dim">Ask how to do anything in KROVA. It can&apos;t see or change your data.</p>
            </div>
            {turns.length > 0 && (
              <button type="button" onClick={reset} aria-label="New chat" title="New chat" className="cursor-pointer p-1 text-os-text-dim hover:text-white">
                <RotateCcw className="h-3.5 w-3.5" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="cursor-pointer p-1 text-os-text-dim hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {turns.length === 0 && (
              <p className="text-xs text-os-text-dim">
                Kuch bhi poochho - for example &quot;How do I do this on this page?&quot;. English or Hinglish, dono chalega.
              </p>
            )}
            {turns.map((t, i) => (
              <div key={i} className={`flex ${t.role === "owner" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-[88%] whitespace-pre-wrap break-words rounded-xl px-3 py-2 text-[13px] leading-relaxed ${
                    t.role === "owner"
                      ? "border border-cyan-500/20 bg-cyan-500/15 text-white"
                      : "border border-white/[0.08] bg-white/[0.05] text-white/90"
                  }`}
                >
                  {t.text}
                </p>
              </div>
            ))}
            {busy && <p className="animate-pulse text-[11px] text-os-text-dim">KROVA Buddy is looking it up…</p>}
            {offer && !busy && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/[0.06] p-2.5">
                <p className="min-w-[150px] flex-1 text-xs text-amber-100">Want KROVA&apos;s team to look at this?</p>
                <button
                  type="button"
                  onClick={raiseTicket}
                  className="cursor-pointer rounded-lg border border-amber-500/30 bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-100 hover:bg-amber-500/30"
                >
                  Raise a ticket
                </button>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-white/[0.08] px-3 pb-3 pt-2">
            {error && <p className="mb-1.5 text-xs text-red-400">{error}</p>}
            <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
                rows={1}
                maxLength={3000}
                placeholder="Ask anything about KROVA…"
                className="flex-1 resize-none rounded-lg border border-white/[0.12] bg-black/40 px-3 py-2 text-sm text-white placeholder:text-os-text-dim focus:border-cyan-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={busy || !input.trim()}
                aria-label="Send"
                className="cursor-pointer rounded-lg border border-cyan-500/30 bg-cyan-500/20 p-2 text-cyan-300 hover:bg-cyan-500/30 disabled:cursor-default disabled:opacity-40"
              >
                <ArrowUp className="h-4 w-4" />
              </button>
            </form>
            <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-os-text-dim">
              <span>{left ?? ""}</span>
              <Link href={`/help?from=${encodeURIComponent(pathname)}`} className="hover:text-white">
                Open Help &amp; tickets
              </Link>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close KROVA Buddy" : "Ask KROVA Buddy"}
        aria-expanded={open}
        title="Ask KROVA Buddy"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[45] flex h-12 w-12 cursor-pointer items-center justify-center rounded-full border border-cyan-500/30 bg-[#0b0f17] text-cyan-300 shadow-lg hover:bg-cyan-500/10 active:scale-95"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </button>
    </>
  );
}
