"use client";

import { cn } from "@/lib/utils";
import type { ComponentPropsWithoutRef } from "react";

interface MarqueeProps extends ComponentPropsWithoutRef<"div"> {
  className?: string;
  reverse?: boolean;
  pauseOnHover?: boolean;
  vertical?: boolean;
  repeat?: number;
  duration?: string;
  gap?: string;
}

export function Marquee({
  className,
  reverse,
  pauseOnHover = false,
  children,
  vertical = false,
  repeat = 4,
  duration = "40s",
  gap = "1rem",
  ...props
}: MarqueeProps) {
  return (
    <div
      {...props}
      style={
        {
          "--duration": duration,
          "--gap": gap,
          gap: gap,
        } as React.CSSProperties
      }
      className={cn(
        "group flex overflow-hidden p-2 [gap:var(--gap)]",
        vertical ? "flex-col" : "flex-row",
        className,
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex shrink-0 justify-around [gap:var(--gap)]",
            // Animation applied directly (not via the --animate-* theme alias) so it
            // actually reads this instance's own --duration: an unregistered custom
            // property that references another unset custom property computes to the
            // guaranteed-invalid value at its declaration site (:root, where --duration
            // isn't set) and that invalid value is what inherits down — redeclaring
            // --duration deeper in the tree, as this component does, doesn't fix it.
            vertical
              ? "[animation:marquee-vertical_var(--duration)_linear_infinite] flex-col"
              : "[animation:marquee_var(--duration)_linear_infinite] flex-row",
            pauseOnHover && "group-hover:[animation-play-state:paused]",
            reverse && "[animation-direction:reverse]",
          )}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
