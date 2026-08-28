"use client";

import { motion } from "motion/react";

/**
 * A hand-drawn ink stroke that draws itself in on mount — a pen underlining
 * a word, not a generic CSS border. Reserved for one emphasis moment per
 * page; sprinkling it everywhere would cheapen it.
 */
export function InkUnderline({
  className,
  color = "#C9973F",
  strokeWidth = 6,
  duration = 0.8,
  delay = 0.9,
}: {
  className?: string;
  color?: string;
  strokeWidth?: number;
  duration?: number;
  delay?: number;
}) {
  return (
    <svg viewBox="0 0 300 20" preserveAspectRatio="none" className={className} aria-hidden="true">
      <motion.path
        d="M3,12 C60,3 120,19 180,8 C220,1 260,15 297,6"
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration, delay, ease: "easeInOut" }}
      />
    </svg>
  );
}
