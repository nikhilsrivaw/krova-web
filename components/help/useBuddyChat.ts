"use client";

import { useCallback, useEffect, useState } from "react";
import { help, type HelpTurn, type TicketDraft } from "@/lib/api";
import { getUserId } from "@/lib/auth";

/**
 * One KROVA Buddy chat, shared by the corner bubble and the Help page: the turns are kept for the tab (keyed on the
 * signed-in user), so a question asked on Automations is still there on the next page and on Help.
 *
 * Kept in sessionStorage only as a convenience - when storage is blocked the chat simply starts fresh.
 */
const chatKey = () => `krova-buddy-chat:${getUserId() ?? ""}`;
const ticketKey = () => `krova-buddy-ticket:${getUserId() ?? ""}`;

function load(): HelpTurn[] {
  try {
    const raw = sessionStorage.getItem(chatKey());
    const turns = raw ? JSON.parse(raw) : [];
    return Array.isArray(turns) ? turns : [];
  } catch {
    return [];
  }
}

function save(turns: HelpTurn[]) {
  try {
    if (turns.length) sessionStorage.setItem(chatKey(), JSON.stringify(turns.slice(-24)));
    else sessionStorage.removeItem(chatKey());
  } catch {
    // storage blocked - the chat lives only on this page
  }
}

/** The bubble hands a ticket draft to the Help page, which opens the form with it. */
export function handTicketToHelp(draft: TicketDraft) {
  try {
    sessionStorage.setItem(ticketKey(), JSON.stringify(draft));
  } catch {
    // the Help page then opens an empty form
  }
}

export function takeTicketFromBubble(): TicketDraft | null {
  try {
    const raw = sessionStorage.getItem(ticketKey());
    sessionStorage.removeItem(ticketKey());
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useBuddyChat(page: string | null) {
  const [turns, setTurnsState] = useState<HelpTurn[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [offer, setOffer] = useState<TicketDraft | null>(null);
  const [left, setLeft] = useState<string | null>(null);

  // Read after mount, not during render - the server render has no sessionStorage.
  useEffect(() => {
    setTurnsState(load());
  }, []);

  const setTurns = useCallback((next: HelpTurn[]) => {
    setTurnsState(next);
    save(next);
  }, []);

  /** Ask Buddy. Returns false when it could not answer, so the caller can put the text back in the box. */
  const ask = async (text: string): Promise<boolean> => {
    const said = text.trim();
    if (!said || busy) return false;
    const before = turns;
    const next: HelpTurn[] = [...before, { role: "owner", text: said.slice(0, 3000) }];
    setTurns(next);
    setOffer(null);
    setError(null);
    setBusy(true);
    try {
      const out = await help.ask(next.slice(-12), page);
      setTurns([...next, { role: "ai", text: out.answer.slice(0, 3000) }]);
      setOffer(out.offer_ticket ? out.ticket ?? { subject: "", category: "other", details: said } : null);
      setLeft(`${Math.max(0, out.limit - out.used)} of ${out.limit} answers left this month`);
      return true;
    } catch (err) {
      setTurns(before);
      setError(err instanceof Error ? err.message : "KROVA Buddy could not answer - try again.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setTurns([]);
    setOffer(null);
    setError(null);
  };

  return { turns, busy, error, offer, setOffer, left, ask, reset };
}
