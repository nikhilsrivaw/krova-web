"use client";

import { useEffect, type RefObject } from "react";

/** Keyboard focus management for the refined workspace's modal surfaces. */
export function useOverlayFocus(active: boolean, panelRef: RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!active) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const elements = () => Array.from(panelRef.current?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), summary, [tabindex="0"]',
    ) || []).filter((element) => element.getClientRects().length > 0);
    const frame = requestAnimationFrame(() => {
      const panel = panelRef.current;
      const initial = panel?.querySelector<HTMLElement>('input:not([disabled]), button[aria-label="Close dialog"]') || elements()[0];
      initial?.focus();
    });

    const handleKey = (event: KeyboardEvent) => {
      if (event.key !== "Tab") return;
      const focusable = elements();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      const inside = panelRef.current?.contains(document.activeElement);
      if (event.shiftKey && (document.activeElement === first || !inside)) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
        event.preventDefault(); first.focus();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKey);
      if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0 && getComputedStyle(previousFocus).visibility !== "hidden") {
        previousFocus.focus();
      } else {
        document.querySelector<HTMLElement>('button[aria-controls="workspace-navigation"]')?.focus();
      }
    };
  }, [active, panelRef]);
}
