import { PixelLoader } from "@/components/spectrum/pixel-loader";

export default function Loading() {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center gap-6 bg-os-bg">
      <PixelLoader size={140} />
      <p className="font-mono text-xs tracking-[0.3em] text-os-text-dim uppercase">Loading</p>
    </div>
  );
}
