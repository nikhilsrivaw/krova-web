"use client";

import React from "react";
import { ChevronDown } from "lucide-react";
import type { Capability } from "@/lib/api";

/**
 * Shows a Settings block openly when it belongs to this business's kind of
 * work, and tucks it behind a "Show anyway" fold when it does not.
 *
 * Folded, never hidden: a vertical is where a business starts, not what it
 * is forever (shared/verticals capabilities_for), and a business may well
 * use a Google Calendar without having the Scheduling module. Hiding a block
 * would make a tool unreachable for exactly the owner who wants it.
 *
 * It fails open - until the profile has loaded (`have` undefined) the block
 * is simply shown, so nothing flashes closed and then open.
 */
export function CapabilityFold({
  have,
  anyOf,
  label,
  keepOpen = false,
  children,
}: {
  /** The business's capabilities from its profile; undefined while loading. */
  have: Capability[] | undefined;
  /** The block is relevant if the business has any one of these. */
  anyOf: Capability[];
  /** What the block is called, for the fold's own line. */
  label: string;
  /** Already in use (connected, filled in) - never fold something being used. */
  keepOpen?: boolean;
  children: React.ReactNode;
}) {
  const relevant = have === undefined || keepOpen || anyOf.some((cap) => have.includes(cap));
  if (relevant) return <>{children}</>;

  return (
    <details className="group rounded-xl border border-white/[0.06] bg-white/[0.01]">
      <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer list-none text-xs text-os-text-dim hover:text-white select-none">
        <span>
          <span className="font-semibold text-white/80">{label}</span>
          <span className="ml-2 font-mono">- not part of your setup</span>
        </span>
        <span className="flex items-center gap-1 font-mono text-[11px]">
          Show anyway
          <ChevronDown className="w-3.5 h-3.5 transition-transform group-open:rotate-180" />
        </span>
      </summary>
      <div className="p-3 pt-1">{children}</div>
    </details>
  );
}
