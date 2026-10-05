"use client";

import { useCallback, useEffect, useState } from "react";

/** Mobile navigation state only; account, permissions and page routing stay in the shell. */
export function useWorkspaceNavigation(enabled: boolean) {
  const [isOpen, setIsOpen] = useState(false);
  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);

  useEffect(() => {
    if (!enabled || !isOpen) return;
    const panel = document.getElementById("workspace-navigation");
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.documentElement.style.overflow;
    const desktop = window.matchMedia("(min-width: 1024px)");

    const focusable = () => Array.from(panel?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex="0"]',
    ) || []).filter((element) => element.getClientRects().length > 0);

    document.documentElement.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>('[data-navigation-close]')?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
      if (event.key === "Tab") {
        const elements = focusable();
        const first = elements[0];
        const last = elements[elements.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && (document.activeElement === first || !panel?.contains(document.activeElement))) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !panel?.contains(document.activeElement))) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    const handleResize = () => { if (desktop.matches) close(); };
    handleResize();
    document.addEventListener("keydown", handleKey);
    desktop.addEventListener("change", handleResize);

    return () => {
      document.documentElement.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKey);
      desktop.removeEventListener("change", handleResize);
      if (previousFocus?.isConnected && previousFocus.getClientRects().length > 0) previousFocus.focus();
    };
  }, [enabled, isOpen, close]);

  return { isOpen, open, close };
}
