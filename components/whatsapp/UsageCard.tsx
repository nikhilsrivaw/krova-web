"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Receipt } from "lucide-react";
import { GlassCard } from "@/components/ui/GlassCard";
import { channels, type WhatsAppUsage } from "@/lib/api";
import { useRole } from "@/lib/useRole";

const META_BILLING = "https://business.facebook.com/billing_hub";
const CATEGORY_LABEL: Record<string, string> = {
  service: "Replies (service)",
  utility: "Utility templates",
  marketing: "Marketing templates",
  authentication: "Authentication",
};

let cached: Promise<WhatsAppUsage | null> | null = null;
function load(): Promise<WhatsAppUsage | null> {
  cached ??= channels.whatsappUsage().catch(() => { cached = null; return null; });
  return cached;
}

// Owner and admins only (the API refuses everyone else) - nobody else is asked, so no refused call on their screens.
function useUsage() {
  const { supervisor } = useRole();
  const [usage, setUsage] = useState<WhatsAppUsage | null>(null);
  useEffect(() => {
    if (!supervisor) return;
    let live = true;
    load().then((u) => { if (live) setUsage(u); });
    return () => { live = false; };
  }, [supervisor]);
  return usage;
}

/**
 * Meta said the payment method on the business's own WhatsApp account failed (error 131042) - replies may not be
 * reaching customers. Shown above everything on the WhatsApp page until a charged message goes out again.
 */
export function WhatsAppPaymentAlert() {
  const usage = useUsage();
  const issue = usage?.payment_issue;
  if (!issue) return null;
  return (
    <div role="alert" className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-start gap-3">
      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
      <div className="space-y-1">
        <p className="font-semibold text-red-100">WhatsApp could not charge your account - messages may not be reaching customers.</p>
        <p>
          Meta reported a payment problem on your WhatsApp Business account
          {issue.at ? ` (${new Date(issue.at).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })})` : ""}.
          Add or fix the card in Meta&apos;s billing for this WhatsApp account. Since 1 October 2026 Meta charges for replies after the free 1,000 a month, and without a payment method those replies are not delivered.
        </p>
        <a href={META_BILLING} target="_blank" rel="noreferrer" className="inline-block font-semibold text-red-100 underline">Open Meta billing</a>
      </div>
    </div>
  );
}

/** This month's WhatsApp messages as Meta prices them. Meta bills the business's own account, not KROVA. */
export function WhatsAppUsageCard() {
  const usage = useUsage();
  if (!usage || !usage.connected) return null;
  const freeLeft = Math.max(0, usage.free_service_per_month - usage.service_sent);
  const categories = Object.entries(usage.by_category).sort(([a], [b]) => a.localeCompare(b));
  const month = new Date(`${usage.month}T00:00:00`).toLocaleDateString("en-IN", { month: "long", year: "numeric" });

  return (
    <GlassCard className="p-5 space-y-3">
      <div className="flex items-center gap-2">
        <Receipt className="w-4 h-4 text-brass" />
        <h3 className="text-sm font-bold text-white">WhatsApp messages this month</h3>
        <span className="ml-auto text-[10px] font-mono text-os-text-dim">{month}</span>
      </div>
      <p className="text-[11px] text-os-text-dim">
        Meta bills these to your own WhatsApp account, not to KROVA. Replies are free for the first{" "}
        {usage.free_service_per_month.toLocaleString("en-IN")} a month on each number; after that each one is charged, and so is every template.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[10px] uppercase font-mono text-os-text-dim">Charged by Meta</p>
          <p className="text-xl font-bold text-white">{usage.charged_total.toLocaleString("en-IN")}</p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3">
          <p className="text-[10px] uppercase font-mono text-os-text-dim">Free replies left</p>
          <p className={`text-xl font-bold ${freeLeft === 0 ? "text-amber-300" : "text-white"}`}>{freeLeft.toLocaleString("en-IN")}</p>
        </div>
      </div>
      {categories.length > 0 ? (
        <table className="w-full text-xs">
          <thead className="text-[10px] uppercase font-mono text-os-text-dim">
            <tr><th className="text-left py-1">Kind</th><th className="text-right py-1">Charged</th><th className="text-right py-1">Free</th></tr>
          </thead>
          <tbody>
            {categories.map(([category, c]) => (
              <tr key={category} className="border-t border-white/[0.05]">
                <td className="py-1.5 text-white/90">{CATEGORY_LABEL[category] ?? category}</td>
                <td className="py-1.5 text-right text-white">{c.charged.toLocaleString("en-IN")}</td>
                <td className="py-1.5 text-right text-os-text-dim">{c.free.toLocaleString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="text-[11px] text-os-text-dim">Nothing counted yet this month. Counting started when this was added, so earlier messages aren&apos;t here.</p>
      )}
      <a href={META_BILLING} target="_blank" rel="noreferrer" className="inline-block text-[11px] text-os-text-dim hover:text-white underline">
        See the amounts in Meta billing
      </a>
    </GlassCard>
  );
}
