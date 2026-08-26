import Link from "next/link";

const PRODUCT = [
  { href: "/", label: "Home" },
  { href: "/whatsapp", label: "WhatsApp Business" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/pricing", label: "Pricing" },
  { href: "/docs", label: "Docs" },
];

const COMPANY = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
  { href: "/security", label: "Security" },
];

const LEGAL = [
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Service" },
  { href: "/data-deletion", label: "Data Deletion" },
];

function Column({
  heading,
  links,
}: {
  heading: string;
  links: { href: string; label: string }[];
}) {
  return (
    <div className="flex flex-col gap-4">
      <h4 className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-white">
        {heading}
      </h4>
      <ul className="flex flex-col gap-3">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={l.href}
              className="text-sm text-os-text-dim transition-colors hover:text-white"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-os-border bg-os-bg">
      <div className="mx-auto w-full max-w-6xl px-6 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex flex-col gap-3">
            <span className="flex items-center gap-2.5">
              <img
                src="/logo-mark.svg"
                alt="Krova logo"
                width={32}
                height={32}
                className="h-8 w-8"
              />
              <span className="text-lg font-semibold tracking-tight text-white">
                KROVA
              </span>
            </span>
            <p className="text-sm leading-relaxed text-os-text-dim">
              AI-powered business intelligence and customer communication.
            </p>
            <p className="text-sm leading-relaxed text-os-text-dim">
              A product of{" "}
              <span className="text-white">
                Aqirox Technology Private Limited
              </span>
              .
            </p>
          </div>

          <Column heading="Product" links={PRODUCT} />
          <Column heading="Company" links={COMPANY} />
          <Column heading="Legal" links={LEGAL} />
        </div>

        <div className="mt-12 flex flex-col gap-2 border-t border-os-border pt-8 text-xs text-os-text-dim sm:flex-row sm:items-center sm:justify-between">
          <span>
            &copy; {new Date().getFullYear()} Aqirox Technology Private Limited.
            All rights reserved.
          </span>
          <span>
            KROVA is not affiliated with, endorsed by, or sponsored by Meta
            Platforms, Inc. WhatsApp is a trademark of Meta Platforms, Inc.
          </span>
        </div>
      </div>
    </footer>
  );
}
