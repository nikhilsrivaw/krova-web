"use client";

import React from "react";
import Link from "next/link";
import { Instagram, Lock, MessageSquare, PhoneCall } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { LOCKED_CHANNELS, usePlan } from "@/lib/usePlan";

/**
 * The first thing a new business sees: its workspace is open, and the three channels are locked
 * until a plan is chosen. Each tile leads to the pricing for that channel. Gone once a plan is bought.
 */
const ICONS: Record<string, React.ElementType> = { whatsapp: MessageSquare, instagram: Instagram, voice: PhoneCall };

export function UnlockChannels() {
  const plan = usePlan();
  if (!plan.channelsLocked) return null;

  return (
    <GlassCard className="mb-5 space-y-4 p-5" aria-label="Unlock your channels">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-bold text-white">Welcome to KROVA</h2>
          <p className="mt-1 text-xs text-os-text-dim">
            Look around - your chats, customers and calendar are open. Choose a plan to unlock WhatsApp, Instagram and the Voice Agent.
          </p>
        </div>
        <Link
          href="/billing"
          className="shrink-0 rounded-lg bg-teal px-4 py-2 text-xs font-bold text-os-bg hover:bg-teal-dim"
        >
          See plans
        </Link>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {Object.values(LOCKED_CHANNELS).map((c) => {
          const Icon = ICONS[c.slug];
          return (
            <Link
              key={c.slug}
              href={`/billing?unlock=${c.slug}`}
              className="group flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/[0.05]"
            >
              <span className="flex items-center gap-2.5">
                <Icon className="h-4 w-4 text-os-text-dim group-hover:text-white" /> {c.title}
              </span>
              <Lock className="h-3.5 w-3.5 text-os-text-dim" aria-label="Locked" />
            </Link>
          );
        })}
      </div>
    </GlassCard>
  );
}
