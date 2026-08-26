import type { ReactNode } from "react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";

export function ContentPage({
  eyebrow,
  title,
  summary,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-os-bg text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-4xl px-6 pb-24 pt-32 sm:pt-40">
        <header className="flex flex-col gap-5 border-b border-os-border pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-secondary">
            {eyebrow}
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-2xl text-lg leading-relaxed text-os-text-dim">
            {summary}
          </p>
        </header>

        <article className="flex flex-col gap-12 pt-12">{children}</article>
      </div>

      <SiteFooter />
    </main>
  );
}

export function Section({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xl font-semibold tracking-tight text-white">
        {heading}
      </h2>
      <div className="flex flex-col gap-4 text-[15px] leading-relaxed text-os-text-dim [&_a]:text-brand-secondary [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-medium [&_strong]:text-white">
        {children}
      </div>
    </section>
  );
}

export function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-os-border-bright">
      {items.map((item, i) => (
        <li key={i} className="pl-1">
          {item}
        </li>
      ))}
    </ul>
  );
}

export function Steps({
  steps,
}: {
  steps: { title: string; body: string }[];
}) {
  return (
    <ol className="flex flex-col gap-6">
      {steps.map((s, i) => (
        <li key={s.title} className="grid grid-cols-[2rem_1fr] gap-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-md border border-os-border bg-os-card font-mono text-xs text-brand-secondary">
            {i + 1}
          </span>
          <div className="flex flex-col gap-1">
            <span className="font-medium text-white">{s.title}</span>
            <span className="text-[15px] leading-relaxed text-os-text-dim">
              {s.body}
            </span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-os-border bg-os-card p-5 text-[15px] leading-relaxed text-os-text-dim [&_strong]:font-medium [&_strong]:text-white">
      {children}
    </div>
  );
}
