"use client";

import React from "react";
import { GalleryHorizontal } from "lucide-react";

/**
 * "The AI also wants to send the carousel X with this reply" - a checkbox, on
 * by default, so a person approving a draft can send the reply without it.
 * Rendered only when the draft actually carries a carousel (share_carousel).
 */
export function DraftCarouselOption({
  name,
  send,
  onChange,
  disabled,
}: {
  name: string;
  send: boolean;
  onChange: (send: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start gap-2 text-[11px] text-os-text-dim cursor-pointer select-none">
      <input
        type="checkbox"
        checked={send}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 accent-teal"
      />
      <span className="leading-snug">
        <GalleryHorizontal className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-teal-bright" />
        Also send the carousel <span className="font-mono text-white">{name}</span> right after this reply
      </span>
    </label>
  );
}
