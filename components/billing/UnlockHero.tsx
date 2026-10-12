"use client";

import React from "react";
import { Check, Instagram, Lock, MessageSquare, PhoneCall } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { CHANNEL_BY_SLUG, LOCKED_CHANNELS } from "@/lib/usePlan";

/**
 * The top of the pricing screen for a business that has not chosen a plan: what is locked, what a plan
 * unlocks, and what is already open. The plan cards sit directly below it on the Billing page.
 */

const ICONS: Record<string, React.ElementType> = { whatsapp: MessageSquare, instagram: Instagram, voice: PhoneCall };

const EVERY_PLAN = [
  "WhatsApp, Instagram and the Voice Agent",
  "AI replies you approve before they send (or let it send on its own)",
  "Commitment Ledger, calendar and bookings",
  "Your team, with their own logins",
  "Automations, campaigns and call campaigns",
  "Customers, leads and call logs",
];

export function UnlockHero({ unlock, canChoose }: { unlock: string | null; canChoose: boolean }) {
  const wanted = unlock ? CHANNEL_BY_SLUG[unlock] : null;
  return (
    <section aria-label="Unlock KROVA" className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-white">
          {wanted ? `Unlock ${wanted.title}` : "Choose a plan to switch KROVA on"}
        </h2>
        <p className="mt-1 text-xs text-os-text-dim">
          {wanted
            ? `${wanted.title} opens as soon as your first payment goes through. ${wanted.blurb}`
            : "Your chats, customers and calendar are open to look around. WhatsApp, Instagram and the Voice Agent unlock with your first payment."}
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {Object.values(LOCKED_CHANNELS).map((c) => {
          const Icon = ICONS[c.slug];
          return (
            <GlassCard key={c.slug} className={`space-y-2 p-4 ${wanted?.slug === c.slug ? "ring-1 ring-teal/60" : ""}`}>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-bold text-white">
                  <Icon className="h-4 w-4 text-teal-bright" /> {c.title}
                </span>
                <Lock className="h-3.5 w-3.5 text-os-text-dim" aria-label="Locked" />
              </div>
              <p className="text-[11px] leading-relaxed text-os-text-dim">{c.blurb}</p>
            </GlassCard>
          );
        })}
      </div>

      <GlassCard className="p-4">
        <p className="mb-2 text-[11px] font-mono uppercase tracking-wide text-os-text-dim">Every plan includes</p>
        <ul className="grid gap-1.5 text-xs text-white sm:grid-cols-2">
          {EVERY_PLAN.map((line) => (
            <li key={line} className="flex items-start gap-2">
              <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-300" /> {line}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-os-text-dim">
          All three plans include everything above. Prices are per month plus 18% GST. You approve the payment once
          (card or UPI AutoPay) and it renews by itself - you are told before each charge, and you can cancel any time.
          Voice calls are paid from a separate prepaid wallet.
        </p>
        {!canChoose && (
          <p className="mt-2 text-[11px] text-amber-200">Only the owner can choose the plan.</p>
        )}
      </GlassCard>
    </section>
  );
}
