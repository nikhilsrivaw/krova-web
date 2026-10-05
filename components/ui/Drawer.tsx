"use client";

import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useWorkspaceAppearance } from "./WorkspaceDesign";
import { useOverlayFocus } from "./useOverlayFocus";
import { WorkspaceContent } from "../shell/WorkspaceContent";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  width?: "sm" | "md" | "lg" | "xl";
}

const WIDTH_CLASSES = {
  sm: "max-w-md",
  md: "max-w-lg",
  lg: "max-w-2xl",
  xl: "max-w-4xl",
};

export function Drawer({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  width = "md",
}: DrawerProps) {
  const appearance = useWorkspaceAppearance();
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

  const content = (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
          />

          {/* Drawer Panel */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            ref={panelRef}
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            className={`relative w-full ${WIDTH_CLASSES[width]} ${appearance === "refined" ? "bg-[#111111]" : "bg-[#0B0F17]"} border-l border-white/[0.08] shadow-2xl flex flex-col h-full z-10`}
          >
            {/* Header */}
            <div className={`flex shrink-0 items-center justify-between gap-3 px-5 py-4 border-b border-white/[0.08] ${appearance === "refined" ? "bg-white/[0.02]" : "bg-[#0E131E]/80 backdrop-blur-md"}`}>
              <div className="min-w-0 flex-1">
                <h3 className="break-words text-base font-semibold text-white tracking-tight">
                  {title}
                </h3>
                {subtitle && (
                  <p className="break-words text-xs text-os-text-dim mt-0.5">{subtitle}</p>
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

            {/* Content Body */}
            <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{appearance === "refined" ? <WorkspaceContent route="drawer">{children}</WorkspaceContent> : children}</div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
  return appearance === "refined" && typeof document !== "undefined"
    ? createPortal(<div className="workspace-refined workspace-overlay">{content}</div>, document.body)
    : content;
}
