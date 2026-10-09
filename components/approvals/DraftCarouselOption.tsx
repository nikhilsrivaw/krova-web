"use client";

import React from "react";
import { GalleryHorizontal } from "lucide-react";

/**
 * "The AI also wants to send the carousel X with this reply" - a checkbox, on
 * by default, so a person approving a draft can send the reply without it.
 * Rendered only when the draft actually carries a carousel (share_carousel).
 *
 * `values` is what the AI filled the carousel's {{variables}} with (a name, a
 * number it read from the chat) - shown so the person sees what the customer
 * will see before approving.
 */
export function DraftCarouselOption({
  name,
  values,
  send,
  onChange,
  disabled,
}: {
  name: string;
  values?: { body: string[]; cards: string[][] } | null;
  send: boolean;
  onChange: (send: boolean) => void;
  disabled?: boolean;
}) {
  const filled = values ? [...values.body, ...values.cards.flat()].filter(Boolean) : [];
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
        {filled.length > 0 && (
          <span className="block mt-0.5">
            Filled in by the AI: <span className="text-white">{filled.join(" · ")}</span>
          </span>
        )}
      </span>
    </label>
  );
}
