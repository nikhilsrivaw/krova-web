import type { Metadata } from "next";
import Link from "next/link";

import {
  Bullets,
  ContentPage,
  Section,
} from "@/components/spectrum/content-page";

export const metadata: Metadata = {
  title: "About Krova and Aqirox Technology Private Limited",
  description:
    "Krova is an AI-powered business intelligence and customer communication platform, developed by Aqirox Technology Private Limited.",
};

export default function AboutPage() {
  return (
    <ContentPage
      eyebrow="About"
      title="Krova is a product of Aqirox Technology Private Limited"
      summary="Aqirox builds software that helps businesses use technology and AI to improve how they operate and how they look after their customers. Krova is its business intelligence and customer communication platform."
    >
      <Section heading="About Aqirox">
        <p>
          <strong>Aqirox Technology Private Limited</strong> is a company
          registered in India. It builds software products that help businesses
          use technology and AI to improve their operations and their customer
          relationships.
        </p>
        <p>
          Krova is developed, operated and supported by Aqirox Technology
          Private Limited. Where these pages refer to &ldquo;Krova&rdquo;, the
          contracting and operating entity is Aqirox Technology Private Limited.
        </p>
      </Section>

      <Section heading="About Krova">
        <p>
          Krova is an AI-powered business intelligence and customer
          communication platform for small and medium businesses.
        </p>
        <p>
          Small businesses talk to their customers across WhatsApp, email and
          other channels, and the important detail gets lost in the noise — who
          is waiting for a reply, what was promised and when, which enquiry went
          cold, what work was delivered but never invoiced. Krova reads the
          conversations a business already has and turns them into a clear view
          of what needs attention.
        </p>
        <p>With a business&rsquo;s authorization, Krova can:</p>
        <Bullets
          items={[
            "Bring customer conversations together in one place",
            "Organise interactions by customer rather than by chat thread",
            "Highlight enquiries, commitments and customers that need follow-up",
            "Draft replies for the business to review before sending",
            "Send customer updates and reminders the business has approved or configured",
            "Produce insights from the business's own customer activity",
          ]}
        />
      </Section>

      <Section heading="How Krova is built">
        <p>
          Krova is a hosted software service. Businesses sign in to a web
          dashboard and connect the communication channels they already use.
          Krova processes the information from those channels to provide the
          features the business has chosen.
        </p>
        <p>
          Details of how data is handled, stored and deleted are set out in the{" "}
          <Link href="/privacy">Privacy Policy</Link>, and the technical
          measures in place are described on the{" "}
          <Link href="/security">Security</Link> page.
        </p>
      </Section>

      <Section heading="Contact">
        <p>
          For questions about Krova or Aqirox, see the{" "}
          <Link href="/contact">Contact</Link> page.
        </p>
      </Section>
    </ContentPage>
  );
}
