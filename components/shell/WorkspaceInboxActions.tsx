"use client";

import { useId, useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

/** Keeps the mobile timeline roomy while retaining every customer control. */
export function WorkspaceInboxActions({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const id = useId();

  return (
    <div
      id={id}
      data-expanded={expanded}
      className="workspace-inbox-actions workspace-actions"
      onClickCapture={(event) => {
        if (event.target instanceof Element && event.target.closest(".workspace-inbox-primary")) setExpanded(false);
      }}
    >
      {children}
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls={id}
        onClick={() => setExpanded((value) => !value)}
        className="workspace-inbox-toggle flex items-center gap-2 rounded-lg border border-white/[0.08] px-3 text-xs text-os-text-dim md:hidden"
      >
        {expanded ? "Fewer controls" : "Customer actions"}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
    </div>
  );
}
