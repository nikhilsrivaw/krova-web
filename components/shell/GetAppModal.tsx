"use client";

import { useEffect, useState } from "react";
import { Apple, Smartphone, Copy, Check } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { installUrl } from "@/lib/app-nav";

/**
 * "How do I install this on my phone" lives here, inside the desktop OS -
 * not just on the public /mobile marketing page - so someone already
 * signed in doesn't have to go find that page to install the PWA. Same
 * install steps as /mobile, condensed for a modal instead of a full
 * scrolling section.
 */
export function GetAppModal({ isOpen, onClose, appearance = "default" }: { isOpen: boolean; onClose: () => void; appearance?: "default" | "refined" }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) setUrl(installUrl());
  }, [isOpen]);

  const copy = () => {
    if (!url) return;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal appearance={appearance} isOpen={isOpen} onClose={onClose} title="Get the KROVA app" subtitle="Installs straight from the browser - no app store.">
      <div className="space-y-5">
        {url && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-black/30 border border-os-border">
            <span className="flex-1 min-w-0 truncate font-mono text-xs text-os-ink">{url}</span>
            <button
              type="button"
              onClick={copy}
              className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wide text-os-ink bg-white/[0.06] hover:bg-white/[0.1]"
            >
              {copied ? <Check className="w-3 h-3 text-teal" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="p-4 rounded-xl bg-white/[0.03] border border-os-border">
            <div className="flex items-center gap-2 mb-3">
              <Apple className="w-4 h-4 text-os-ink" />
              <h4 className="text-xs font-bold text-os-ink">iPhone · Safari</h4>
            </div>
            <ol className="space-y-2 text-[12px] text-os-text-dim leading-snug">
              <li>1. Open the link above in <strong className="text-os-ink">Safari</strong> (not Chrome - Apple only allows this from Safari)</li>
              <li>2. Tap <strong className="text-os-ink">Share</strong> at the bottom</li>
              <li>3. Tap <strong className="text-os-ink">Add to Home Screen</strong></li>
              <li>4. Open KROVA from the home screen</li>
            </ol>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.03] border border-os-border">
            <div className="flex items-center gap-2 mb-3">
              <Smartphone className="w-4 h-4 text-os-ink" />
              <h4 className="text-xs font-bold text-os-ink">Android · Chrome</h4>
            </div>
            <ol className="space-y-2 text-[12px] text-os-text-dim leading-snug">
              <li>1. Open the link above in Chrome</li>
              <li>2. Tap the <strong className="text-os-ink">Install app</strong> prompt (or the three-dot menu → Install app)</li>
              <li>3. Confirm - KROVA lands on the home screen</li>
            </ol>
          </div>
        </div>
      </div>
    </Modal>
  );
}
