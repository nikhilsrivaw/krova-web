"use client";

import React from "react";
import { clsx } from "clsx";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: "default" | "subtle" | "glow" | "elevated";
  className?: string;
  isAiArtifact?: boolean;
}

export function GlassCard({
  children,
  variant = "default",
  className,
  isAiArtifact = false,
  ...props
}: GlassCardProps) {
  return (
    <div
      className={clsx(
        "relative rounded-xl transition-all duration-200",
        // AI artifact distinction (Human-in-the-loop requirement)
        isAiArtifact
          ? "border border-brass/25 bg-gradient-to-b from-brass/[0.06] via-os-card/90 to-os-card shadow-[0_0_24px_-8px_rgba(201,151,63,0.15)]"
          : variant === "subtle"
          ? "border border-os-border/60 bg-os-bg/60 backdrop-blur-md"
          : variant === "glow"
          ? "border border-os-border-bright bg-os-card/90 backdrop-blur-xl shadow-[0_0_30px_-10px_rgba(236,233,225,0.06)]"
          : variant === "elevated"
          ? "border border-os-border-bright bg-os-card/95 backdrop-blur-2xl shadow-2xl"
          : "border border-os-border bg-os-card/85 backdrop-blur-xl shadow-lg",
        className
      )}
      {...props}
    >
      {isAiArtifact && (
        <div
          className="absolute -top-3 right-3 z-10 select-none font-serif text-[10px] font-bold uppercase tracking-[0.15em] text-brass-bright px-2.5 py-1 -rotate-3"
          style={{
            border: "1.5px double currentColor",
            borderRadius: "3px",
            background: "rgba(20, 21, 31, 0.85)",
          }}
        >
          AI Draft
        </div>
      )}
      {children}
    </div>
  );
}
