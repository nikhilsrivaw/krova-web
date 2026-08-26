import Link from "next/link";
import type { ReactNode } from "react";

import { Navbar } from "@/components/spectrum/navbar";
import { SiteFooter } from "@/components/spectrum/site-footer";

const LEGAL_LINKS = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data Deletion" },
];

export function LegalPage({
  title,
  summary,
  updated,
  active,
  children,
}: {
  title: string;
  summary: string;
  updated: string;
  active: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-os-bg text-white">
      <Navbar />

      <div className="mx-auto w-full max-w-3xl px-6 pb-32 pt-32 sm:pt-40">
        <header className="flex flex-col gap-5 border-b border-os-border pb-10">
          <p className="font-mono text-xs uppercase tracking-[0.18em] text-brand-secondary">
            Legal
          </p>
          <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            {title}
          </h1>
          <p className="max-w-xl text-lg leading-relaxed text-os-text-dim">
            {summary}
          </p>
          <p className="font-mono text-xs text-os-text-dim">
            Last updated {updated}
          </p>
        </header>

        <nav className="flex flex-wrap gap-2 py-8">
          {LEGAL_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={
                link.href === active
                  ? "rounded-full border border-os-border-bright bg-os-card px-4 py-1.5 text-sm text-white"
                  : "rounded-full border border-os-border px-4 py-1.5 text-sm text-os-text-dim transition-colors hover:border-os-border-bright hover:text-white"
              }
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <article className="flex flex-col gap-10">{children}</article>
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

export function Notice({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-lg border border-os-border bg-os-card p-5 text-[15px] leading-relaxed text-os-text-dim">
      {children}
    </div>
  );
}

export function Contact() {
  return (
    <Notice>
      <p>
        <strong className="font-medium text-white">
          Aqirox Technology Private Limited
        </strong>
        <br />
        Shivje Nagar, Muhisudharpur, Shivpurinewcolony
        <br />
        Gorakhpur Sadar, Gorakhpur- 273016
        <br />
        Uttar Pradesh, India
        <br />
        Email:{" "}
        <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a>
        <br />
        Grievance Officer: Nikhil Srivastava &mdash;{" "}
        <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a>
      </p>
    </Notice>
  );
}
