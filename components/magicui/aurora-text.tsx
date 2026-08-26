"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface AuroraTextProps {
  children: ReactNode;
  className?: string;
  colors?: string[];
  speed?: number;
}

export function AuroraText({
  children,
  className,
  colors = ["#C9973F", "#E0B25E", "#5B8A72", "#C9973F"],
  speed = 1,
}: AuroraTextProps) {
  const gradientStyle = {
    backgroundImage: `linear-gradient(135deg, ${colors.join(", ")}, ${colors[0]})`,
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    color: "transparent",
    animationDuration: `${10 / speed}s`,
    backgroundSize: "300% 300%",
  };

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="sr-only">{children}</span>
      <span
        className="relative animate-aurora bg-clip-text text-transparent bg-[length:300%_300%]"
        style={gradientStyle}
        aria-hidden
      >
        {children}
      </span>
    </span>
  );
}
