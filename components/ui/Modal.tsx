"use client";

import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useOverlayFocus } from "./useOverlayFocus";

interface ModalProps {
  appearance?: "default" | "refined";
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl";
}

const MAX_WIDTHS = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-xl",
  xl: "max-w-3xl",
};

export function Modal({
  appearance = "default",
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = "md",
}: ModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  useOverlayFocus(isOpen && appearance === "refined", panelRef);
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-md"
          />

          {/* Modal Card - capped to the viewport height and laid out as a
              column so a tall form (lots of fields) scrolls inside the
              content area instead of pushing the card past the screen's
              top/bottom, which `items-center` centering on a too-tall flex
              child does not handle on its own. The header and close button
              stay put; only the content area scrolls. */}
          <motion.div
            role="dialog"
            ref={panelRef}
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 350 }}
            className={`relative w-full ${MAX_WIDTHS[maxWidth]} max-h-[90dvh] flex flex-col rounded-2xl border border-white/[0.1] shadow-2xl overflow-hidden z-10 ${appearance === "refined" ? "bg-[#131313]" : "bg-[#0D121F]"}`}
          >
            {/* Header */}
            <div className={`shrink-0 flex items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] ${appearance === "refined" ? "bg-white/[0.02]" : "bg-[#111728]/60"}`}>
              <div>
                <h3 className="text-base font-semibold text-white tracking-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="text-xs text-os-text-dim mt-0.5">{subtitle}</p>
                )}
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close dialog"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-os-text-dim hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="min-h-0 p-5 sm:p-6 overflow-y-auto">{children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
