"use client";

import { BorderBeam } from "@/components/magicui/border-beam";

/**
 * "See the data flow" section — an autoplaying, muted, looping product film
 * that walks through how a message travels from any channel into KROVA's
 * unified inbox, the AI brain, and back to the owner. Framed in the OS window
 * chrome so it matches the rest of the site.
 */
export function DataFlowVideo() {
  return (
    <section className="max-w-6xl mx-auto px-6 py-32 relative">
      <div className="text-center mb-16">
        <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-os-text-dim mb-4">
          See the data flow
        </div>
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4 text-os-ink">
          One message. The whole journey.
        </h2>
        <p className="text-os-text-dim max-w-xl mx-auto text-lg">
          Watch a single WhatsApp, Instagram, Gmail or Outlook message travel into your
          unified inbox, through the AI brain overnight, and back to you as a morning brief.
        </p>
      </div>

      <div className="os-window max-w-5xl mx-auto relative group">
        <BorderBeam size={300} duration={14} colorFrom="#C9973F" colorTo="#5B8A72" />

        {/* window chrome */}
        <div className="h-10 border-b border-os-border flex items-center justify-between px-4 bg-os-bg/50">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-os-border" />
              <div className="w-3 h-3 rounded-full bg-os-border" />
              <div className="w-3 h-3 rounded-full bg-os-border" />
            </div>
            <div className="h-4 w-[1px] bg-os-border mx-2" />
            <div className="text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
              KROVA / Data Flow
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-seal animate-pulse" />
            <span className="text-[10px] font-mono text-os-text-dim uppercase tracking-widest">
              Live render
            </span>
          </div>
        </div>

        <video
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          poster="/videos/krova-dataflow-poster.jpg"
          className="w-full h-auto block bg-os-bg"
        >
          <source src="/videos/krova-dataflow.webm" type="video/webm" />
          <source src="/videos/krova-dataflow.mp4" type="video/mp4" />
        </video>
      </div>
    </section>
  );
}
