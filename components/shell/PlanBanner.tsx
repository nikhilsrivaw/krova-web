"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { billing, type PlanStatus } from "@/lib/api";
import { desktopUrl } from "@/lib/app-nav";

/**
 * When the plan is off, say so on every page. A business that has not paid (or whose payment
 * failed) otherwise finds the AI quiet, campaigns refused and calls declined with no word on why.
 *
 * Nothing here blocks anything - it only explains. The owner and admins get a button to Billing;
 * everyone else is told to ask the owner.
 */
export function PlanBanner({ phone = false }: { phone?: boolean }) {
  const [status, setStatus] = useState<PlanStatus | null>(null);

  useEffect(() => {
    let live = true;
    billing.status().then((s) => { if (live) setStatus(s); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  if (!status?.blocked) return null;

  const message =
    status.state === "required"
      ? "Choose a plan to switch KROVA on. AI replies, calls and campaigns start after your first payment - your chats and customers are all here."
      : status.state === "suspended"
        ? "Your plan is paused because the last payment did not go through. AI replies, calls and campaigns are off until it does."
        : "Your plan has ended. AI replies, calls and campaigns are off until you choose a plan again.";

  return (
    <div
      role="status"
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-amber-400/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-100 ${phone ? "mx-3 mt-3" : "mb-5"}`}
    >
      <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1">
        {message}
        {!status.can_manage && " Ask the owner to open Billing."}
      </p>
      {status.can_manage && (
        phone ? (
          // Billing lives on the full site; the phone app hands over to it.
          <a
            href={desktopUrl("/billing")}
            className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-black hover:bg-amber-300"
          >
            {status.state === "required" ? "Choose a plan" : "Open Billing"}
          </a>
        ) : (
          <Link
            href="/billing"
            className="shrink-0 rounded-lg bg-amber-400 px-3 py-1.5 font-bold text-black hover:bg-amber-300"
          >
            {status.state === "required" ? "Choose a plan" : "Open Billing"}
          </Link>
        )
      )}
    </div>
  );
}
