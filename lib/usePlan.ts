"use client";

import { useCallback, useEffect, useState } from "react";
import { billing, type PlanStatus } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

/**
 * Whether this business has a plan, as the menu, the channel pages and the home screen need to know it.
 *
 * `required` is a business that has never chosen one: WhatsApp, Instagram and Voice stay locked, and
 * everything else is open to look around. The answer is remembered per sign-in and per page load;
 * paying sends the browser back through a full page load, so it is fresh when the plan is bought.
 */
let cached: { token: string | null; promise: Promise<PlanStatus | null> } | null = null;

function load(force = false): Promise<PlanStatus | null> {
  const token = getAccessToken();
  if (force || !cached || cached.token !== token) {
    const promise = billing.status().catch(() => {
      cached = null;
      return null;
    });
    cached = { token, promise };
  }
  return cached.promise;
}

export type PlanView = {
  ready: boolean;
  state: PlanStatus["state"];
  blocked: boolean;
  canManage: boolean;
  /** Never chosen a plan: the three channels are locked until they do. */
  channelsLocked: boolean;
  refresh: () => void;
};

export function usePlan(): PlanView {
  const [status, setStatus] = useState<PlanStatus | null>(null);
  const [ready, setReady] = useState(false);

  const refresh = useCallback(() => {
    void load(true).then((s) => {
      setStatus(s);
      setReady(true);
    });
  }, []);

  useEffect(() => {
    let live = true;
    void load().then((s) => {
      if (live) {
        setStatus(s);
        setReady(true);
      }
    });
    return () => {
      live = false;
    };
  }, []);

  return {
    ready,
    state: status?.state ?? null,
    blocked: !!status?.blocked,
    canManage: !!status?.can_manage,
    channelsLocked: status?.state === "required" && !!status?.can_manage,
    refresh,
  };
}

/** What each locked channel is, for the lock screens. Kept to what the product really does. */
export const LOCKED_CHANNELS: Record<string, { slug: string; title: string; blurb: string }> = {
  "/whatsapp": {
    slug: "whatsapp",
    title: "WhatsApp",
    blurb: "AI drafts replies for your approval, campaigns, approved templates, Flows and order confirmations.",
  },
  "/instagram": {
    slug: "instagram",
    title: "Instagram",
    blurb: "Answer DMs, comments and story replies, send carousels and publish posts.",
  },
  "/voice": {
    slug: "voice",
    title: "Voice Agent",
    blurb: "An AI that answers your phone and calls customers, with a keypad menu and live transfer to your team. Calls are paid from a prepaid wallet.",
  },
};

export const CHANNEL_BY_SLUG = Object.fromEntries(
  Object.values(LOCKED_CHANNELS).map((c) => [c.slug, c]),
) as Record<string, { slug: string; title: string; blurb: string }>;
