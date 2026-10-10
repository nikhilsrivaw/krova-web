"use client";

import React from "react";

/**
 * What picking this business type switches on - shown on each type's card so
 * the answer to "what kind of business are you?" also says what it gives.
 */
export function VerticalFeatures({ features }: { features?: string[] }) {
  if (!features || features.length === 0) {
    return (
      <p className="text-[10px] font-mono text-os-text-dim/70 mt-2">
        Includes: the core inbox, AI replies, ledger, campaigns and automations
      </p>
    );
  }
  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      <span className="text-[10px] font-mono text-os-text-dim/70">Also includes:</span>
      {features.map((label) => (
        <span
          key={label}
          className="px-2 py-0.5 rounded-md bg-white/[0.05] border border-white/[0.08] text-[10px] font-mono text-white/80"
        >
          {label}
        </span>
      ))}
    </div>
  );
}
