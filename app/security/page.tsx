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
            "Passwords are never stored - only a one-way hash (argon2id). Repeated wrong passwords lock sign-in for a while, and one-time codes allow only a few attempts.",
            "A sign-in lasts 30 minutes and is renewed with a refresh token; the owner can remove a team member at any time.",
            "Inside a business, people see what their role and the owner allow - money, payments, phone numbers and templates can each be hidden from team members, and owner-only actions are refused for everyone else. Every action, including refused attempts, goes to the activity log.",
            "Access to WhatsApp, Instagram and other channels is granted by the business through the official provider sign-in, and can be revoked by the business at any time from Settings.",
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
            "Every record that holds business or customer data carries the business it belongs to.",
            "Every request is limited to the business of the signed-in person, decided when they sign in. A record asked for by its id is checked against that business before anything is returned.",
            "An automated check runs over the code and fails if a new route loads a record by id without that check.",
          ]}
        />
      </Section>

      <Section heading="Encryption">
        <Bullets
          items={[
            "All traffic between browsers, the Krova app, Krova's servers and third-party services is served over HTTPS (TLS).",
            "Access tokens for connected channels, payment gateway keys and similar secrets are encrypted before they are stored (Fernet: AES-128 with an integrity check). The key is kept outside the database, so a copy of the database alone cannot open any connected account. The key can be rotated without downtime.",
            "API keys a business creates for its own software are stored only as a hash.",
          ]}
        />
      </Section>

      <Section heading="What reaches Krova, and from whom">
        <Bullets
          items={[
            "Messages from WhatsApp, Instagram, the phone provider, Shopify and payment gateways are checked against the sender's signature before they are accepted - a forged message is rejected.",
            "Every response carries browser security headers (HTTPS-only, no embedding in other sites, no content sniffing), and requests above a fixed size are refused.",
            "Logs never contain a full phone number or email address, and do not contain what customers said unless switched on briefly to fix a problem.",
          ]}
        />
      </Section>

      <Section heading="Infrastructure">
        <Bullets
          items={[
            "Krova's application, background workers and database run on Amazon Web Services in Mumbai, India. The database is not reachable from the internet.",
            "Replies and summaries are written by language models served from AWS in Mumbai. Some tasks may use Anthropic's API.",
            "Phone calls use Plivo and Sarvam AI (speech); payments use the gateway the business connects.",
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
            "Message content is processed to provide the features a business has enabled, such as answering customers, organising conversations and producing insights.",
            "Only the business's own information and the one customer's conversation are given to a language model for a reply - never another customer's data.",
            "The model providers Krova uses do not train their models on data sent through their APIs, and Krova does not train any model on business or customer data.",
            "Customers a business marks as private are left out of processing, and marketing messages go only to customers who opted in.",
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
