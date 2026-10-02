"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckSquare, Siren, Wallet, ArrowRight, Inbox as InboxIcon } from "lucide-react";
import { approvals, escalations, ledger, type LedgerSummary } from "@/lib/api";
import { appPath } from "@/lib/app-nav";

function formatPaise(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}

/**
 * The daily briefing - what /mobile's own marketing copy promises
 * ("Aaj kya hua?"). Composed entirely from endpoints the desktop OS
 * already has (approvals/count, escalations/count, ledger/summary) -
 * no new backend built for this screen specifically, same discipline
 * as the rest of this app shell.
 */
export default function TodayPage() {
  const [pending, setPending] = useState<number | null>(null);
  const [openEscalations, setOpenEscalations] = useState<number | null>(null);
  const [summary, setSummary] = useState<LedgerSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [a, e, s] = await Promise.allSettled([
        approvals.count(),
        escalations.count(),
        ledger.summary(),
      ]);
      if (!mounted) return;
      if (a.status === "fulfilled") setPending(a.value.pending);
      if (e.status === "fulfilled") setOpenEscalations(e.value.open);
      if (s.status === "fulfilled") setSummary(s.value);
      setIsLoading(false);
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return "Good morning";
    if (h < 17) return "Good afternoon";
    return "Good evening";
  })();

  return (
    <div className="px-4 pt-5 space-y-5 max-w-md mx-auto">
      <div>
        <h1 className="text-lg font-semibold text-os-ink">{greeting}.</h1>
        <p className="text-xs text-os-text-dim mt-0.5">
          {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-2xl bg-os-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Escalations - most urgent first */}
          {openEscalations !== null && openEscalations > 0 && (
            <Link
              href={appPath("/escalations")}
              className="flex items-center gap-3 p-4 rounded-2xl bg-thread/10 border border-thread/25 active:scale-[0.98] transition-transform"
            >
              <div className="w-10 h-10 rounded-xl bg-thread/15 flex items-center justify-center shrink-0">
                <Siren className="w-5 h-5 text-thread-bright" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-os-ink">
                  {openEscalations} open escalation{openEscalations === 1 ? "" : "s"}
                </p>
                <p className="text-[11px] text-os-text-dim">Needs a human, now</p>
              </div>
              <ArrowRight className="w-4 h-4 text-os-text-dim shrink-0" />
            </Link>
          )}

          <Link
            href={appPath("/approvals")}
            className="flex items-center gap-3 p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-teal/10 flex items-center justify-center shrink-0">
              <CheckSquare className="w-5 h-5 text-teal" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-os-ink">
                {pending ?? 0} reply{pending === 1 ? "" : "ies"} waiting
              </p>
              <p className="text-[11px] text-os-text-dim">Drafted and ready to review</p>
            </div>
            <ArrowRight className="w-4 h-4 text-os-text-dim shrink-0" />
          </Link>

          <Link
            href={appPath("/inbox")}
            className="flex items-center gap-3 p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98] transition-transform"
          >
            <div className="w-10 h-10 rounded-xl bg-white/[0.06] flex items-center justify-center shrink-0">
              <InboxIcon className="w-5 h-5 text-os-text-dim" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-os-ink">Conversations</p>
              <p className="text-[11px] text-os-text-dim">See what's coming in</p>
            </div>
            <ArrowRight className="w-4 h-4 text-os-text-dim shrink-0" />
          </Link>

          {summary && (
            <Link
              href={appPath("/ledger")}
              className="block p-4 rounded-2xl bg-os-card border border-os-border active:scale-[0.98] transition-transform"
            >
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4 text-teal" />
                <p className="text-xs font-mono uppercase tracking-wide text-os-text-dim">Ledger</p>
                <ArrowRight className="w-3.5 h-3.5 text-os-text-dim ml-auto" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-lg font-semibold text-os-ink font-mono">
                    {formatPaise(summary.owed_to_us_paise)}
                  </p>
                  <p className="text-[10px] text-os-text-dim">Owed to you</p>
                </div>
                <div>
                  <p className="text-lg font-semibold text-thread-bright font-mono">
                    {formatPaise(summary.overdue_paise)}
                  </p>
                  <p className="text-[10px] text-os-text-dim">
                    Overdue{summary.overdue_count > 0 ? ` (${summary.overdue_count})` : ""}
                  </p>
                </div>
              </div>
            </Link>
          )}

          {pending === 0 && (openEscalations ?? 0) === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-os-text-dim">Nothing waiting on you right now.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
