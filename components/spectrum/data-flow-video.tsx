/**
 * "See the data flow" section — an autoplaying, muted, looping product film
 * that walks through how a message travels from any channel into KROVA's
 * unified inbox, the AI brain, and back to the owner.
 */
export function DataFlowVideo() {
  return (
    <section className="max-w-5xl mx-auto px-6 py-28">
      <div className="mb-12">
        <div className="font-mono text-[13px] uppercase tracking-[0.2em] text-teal-bright mb-4">
          See the data flow
        </div>
        <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-os-ink max-w-xl">
          One message. The whole journey.
        </h2>
        <p className="text-os-text-dim max-w-xl leading-relaxed">
          Watch a single WhatsApp, Instagram, Gmail or Outlook message travel into your
          unified inbox, through the AI brain overnight, and back to you as a morning brief.
        </p>
      </div>

      <div className="rounded-lg border border-os-border overflow-hidden">
        <div className="h-9 border-b border-os-border flex items-center px-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-os-text-dim">
            krova / data-flow.mp4
          </span>
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
