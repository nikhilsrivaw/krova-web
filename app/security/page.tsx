import type { Metadata } from "next";
import Link from "next/link";

import {
  Bullets,
  ContentPage,
  Notice,
  Section,
} from "@/components/spectrum/content-page";

export const metadata: Metadata = {
  title: "Krova Security",
  description:
    "The technical and organisational measures Krova uses to protect business and customer data.",
};

export default function SecurityPage() {
  return (
    <ContentPage
      eyebrow="Security"
      title="How Krova protects data"
      summary="Krova handles customer conversations, so the measures below describe what is actually implemented today — not aspirations, and not certifications we do not hold."
    >
      <Section heading="Access to your account">
        <Bullets
          items={[
            "Authentication is handled by Supabase. Krova does not store account passwords.",
            "Access within a business account follows roles the business sets — an owner or manager sees the whole workspace, while a team member sees only what has been assigned to them.",
            "Access to third-party channels is granted by the business and can be revoked by the business at any time from Settings.",
          ]}
        />
      </Section>

      <Section heading="Separation between businesses">
        <p>
          Krova serves many businesses from the same system, so keeping them
          separate is the most important control it has.
        </p>
        <Bullets
          items={[
            "Every record that holds business or customer data carries a business identifier and is indexed on it.",
            "Every query filters by that identifier in the database itself, rather than relying on application code to filter results after fetching them.",
            "Requests are scoped to the business of the signed-in user, resolved at authentication time.",
          ]}
        />
      </Section>

      <Section heading="Encryption">
        <Bullets
          items={[
            "All traffic between browsers, Krova and third-party services is served over TLS.",
            "Access tokens for connected channels and any third-party provider keys are encrypted at rest using Fernet symmetric encryption before being stored.",
            "The underlying database is hosted on managed infrastructure with encryption at rest provided by the platform.",
          ]}
        />
      </Section>

      <Section heading="Infrastructure">
        <p>
          Krova runs on managed cloud infrastructure rather than
          self-administered servers:
        </p>
        <Bullets
          items={[
            "Application and background processing on Railway",
            "Web application on Vercel",
            "Database and authentication on Supabase (PostgreSQL)",
            "AI processing by Anthropic",
          ]}
        />
        <p>
          Each of these providers operates its own security programme. Krova&rsquo;s
          use of them, and what data reaches each one, is set out in the{" "}
          <Link href="/privacy">Privacy Policy</Link>.
        </p>
      </Section>

      <Section heading="Handling of message content">
        <Bullets
          items={[
            "Message content is processed to provide the features a business has enabled, such as organising conversations, drafting replies and producing insights.",
            "Message content is sent to Krova's AI provider for processing. That provider does not use data submitted through its API to train its models.",
            "Krova does not train any model on business or customer data.",
            "Krova does not sell business or customer data.",
          ]}
        />
      </Section>

      <Section heading="Deletion">
        <p>
          A business can disconnect any channel at any time, which stops further
          collection from it. Data already stored can be deleted on request, and
          account data is deleted within 30 days of a verified request. The
          process is described on the{" "}
          <Link href="/data-deletion">Data Deletion</Link> page.
        </p>
      </Section>

      <Section heading="What we do not claim">
        <Notice>
          <p>
            Krova is an actively developed product operated by a small team. We
            hold <strong>no third-party security certifications</strong> at this
            time — no SOC 2, no ISO 27001, no HIPAA attestation — and we do not
            describe the service as certified, audited or fully secure. If a
            certification becomes relevant to customers we serve, this page will
            say so once it is actually held.
          </p>
        </Notice>
      </Section>

      <Section heading="Reporting a security issue">
        <p>
          If you believe you have found a vulnerability in Krova, please contact
          us through the details on the <Link href="/contact">Contact</Link>{" "}
          page. Please include enough detail to reproduce the issue, and give us
          a reasonable opportunity to address it before disclosing it publicly.
        </p>
        <p>
          Krova is a product of{" "}
          <strong>Aqirox Technology Private Limited</strong>.
        </p>
      </Section>
    </ContentPage>
  );
}
