import type { Metadata } from "next";

import {
  Bullets,
  Contact,
  LegalPage,
  Notice,
  Section,
} from "@/components/spectrum/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy — KROVA",
  description:
    "How KROVA collects, processes, stores, and deletes business and customer data.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      summary="KROVA reads the conversations a business already has with its own customers and turns them into business intelligence. This policy explains exactly what we access, why, who processes it, and how to get it deleted."
      updated="8 August 2026"
      active="/privacy"
    >
      <Section heading="Who we are">
        <p>
          KROVA is operated by <strong>Aqirox Technology Private Limited</strong>{" "}
          {'("KROVA", "we", "us")'}, registered in India. We provide a
          multi-tenant business intelligence platform to small and medium
          businesses {'("Customers")'}.
        </p>
        <p>
          This policy covers the KROVA web application, mobile web app, and
          backend services operating at krova.space and app.krova.space.
        </p>
      </Section>

      <Section heading="Two kinds of people in this policy">
        <p>
          Keeping these separate matters, because our obligations differ for
          each.
        </p>
        <Bullets
          items={[
            <>
              <strong>Customers</strong> — the business owners and team members
              who hold a KROVA account. We are the data controller for their
              account data.
            </>,
            <>
              <strong>End Customers</strong> — the people who message our
              Customers on WhatsApp, Instagram, or email. We process their data
              only as a <strong>data processor</strong> acting on our
              Customer&rsquo;s instructions. We never contact End Customers on
              our own behalf, and we never sell or share their data.
            </>,
          ]}
        />
      </Section>

      <Section heading="What we collect">
        <p>
          <strong>Account data.</strong> Name, email address, phone number,
          business name, business category, and team member roles. Authentication
          is handled by Supabase; we do not store passwords.
        </p>
        <p>
          <strong>Connected channel data.</strong> When a Customer connects a
          channel, we access the conversations on that channel:
        </p>
        <Bullets
          items={[
            <>
              <strong>WhatsApp Business Platform</strong> — message content,
              sender and recipient phone numbers, timestamps, message status, and
              WhatsApp Business Account metadata including phone number
              registration status, quality rating, messaging limits, and message
              templates. Accessed under the{" "}
              <code className="font-mono text-xs">
                whatsapp_business_messaging
              </code>{" "}
              and{" "}
              <code className="font-mono text-xs">
                whatsapp_business_management
              </code>{" "}
              permissions the Customer authorises when connecting their own
              WhatsApp Business account.
            </>,
            <>
              <strong>Instagram</strong> — direct messages, comments, and
              mentions on the Customer&rsquo;s connected Instagram Business
              account.
            </>,
            <>
              <strong>Gmail and Outlook</strong> — the content, sender,
              recipient, subject, and timestamp of business email in the
              connected mailbox. Messages our classifier identifies as
              newsletters, notifications, or other non-business mail are
              discarded and not stored.
            </>,
          ]}
        />
        <p>
          <strong>Derived intelligence.</strong> From the above we generate and
          store structured records: customer profiles and status, relationship
          health and churn indicators, commitments and their due dates, revenue
          signals, competitor mentions, and suggested follow-up messages.
        </p>
        <p>
          <strong>Technical data.</strong> IP address, browser and device type,
          and application logs, used for security, debugging, and abuse
          prevention.
        </p>
      </Section>

      <Section heading="What we do with it">
        <Bullets
          items={[
            "Provide the service — surfacing which customers need attention, what was promised, and what revenue is at risk.",
            "Generate analysis on a scheduled nightly cycle and on demand.",
            "Draft suggested replies for the Customer to review. Messages are sent only when the Customer approves them, or under automation rules the Customer has explicitly configured.",
            "Send the Customer operational notifications, such as their morning briefing.",
            "Maintain security, prevent abuse, and meet legal obligations.",
          ]}
        />
        <Notice>
          <p>
            <strong className="font-medium text-white">
              We do not sell personal data.
            </strong>{" "}
            We do not use conversation content for advertising, and we do not
            use one Customer&rsquo;s conversation content to serve another
            Customer. Where we publish comparative benchmarks, they are derived
            from aggregated, anonymised statistics that cannot be traced to an
            individual business or person.
          </p>
        </Notice>
      </Section>

      <Section heading="AI processing">
        <p>
          KROVA uses large language models supplied by{" "}
          <strong>Anthropic</strong> to analyse conversations and generate
          intelligence. Conversation content is transmitted to Anthropic&rsquo;s
          API for processing and returned as structured output.
        </p>
        <p>
          Anthropic acts as a subprocessor under contract and does not use data
          submitted through its API to train its models. We do not train any
          model on Customer or End Customer data.
        </p>
      </Section>

      <Section heading="Who else processes your data">
        <Bullets
          items={[
            <>
              <strong>Anthropic</strong> — AI analysis of conversation content.
            </>,
            <>
              <strong>Supabase</strong> — authentication and PostgreSQL database
              hosting.
            </>,
            <>
              <strong>Railway</strong> — backend application and worker hosting.
            </>,
            <>
              <strong>Vercel</strong> — web application hosting.
            </>,
            <>
              <strong>Meta Platforms</strong> — WhatsApp and Instagram message
              delivery. Meta bills Customers directly for messaging usage; we
              take no margin on it.
            </>,
            <>
              <strong>Google and Microsoft</strong> — Gmail and Outlook mailbox
              access, where connected.
            </>,
          ]}
        />
        <p>
          Some of these providers process data outside India. Where that
          happens, transfers are made under the provider&rsquo;s standard
          contractual protections.
        </p>
      </Section>

      <Section heading="Google user data — limited use">
        <p>
          KROVA&rsquo;s use of information received from Google APIs adheres to
          the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noreferrer"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>
        <p>
          Specifically: we use Gmail data only to provide user-facing features
          within KROVA; we do not transfer it except as necessary to provide
          those features, for security purposes, or to comply with law; we do not
          use it for advertising; and no human reads it except with the
          Customer&rsquo;s explicit permission, for security purposes, or where
          required by law.
        </p>
      </Section>

      <Section heading="How we protect it">
        <Bullets
          items={[
            "OAuth tokens and third-party API keys are encrypted at rest using Fernet symmetric encryption.",
            "Every database record is scoped to a business identifier, and every query is filtered by it at the database layer, so one Customer's data cannot be returned to another.",
            "All traffic is served over TLS.",
            "Access within a Customer's account follows their configured roles — team members see only what their role permits.",
          ]}
        />
      </Section>

      <Section heading="How long we keep it">
        <p>
          Conversation and intelligence data is retained for as long as the
          Customer&rsquo;s account is active. When an account is closed, data is
          deleted within <strong>30 days</strong>, except where we are required
          to retain records to meet a legal or tax obligation.
        </p>
        <p>
          Disconnecting a channel stops further collection from that channel
          immediately. Data already collected is removed on request, or with the
          account.
        </p>
      </Section>

      <Section heading="Your rights">
        <p>
          Under India&rsquo;s Digital Personal Data Protection Act, 2023, and
          equivalent laws where they apply, you may request access to your
          personal data, correction of inaccurate data, erasure, and withdrawal
          of consent. You may also raise a grievance with our Grievance Officer,
          named below.
        </p>
        <p>
          To exercise any of these, see{" "}
          <a href="/data-deletion">Data Deletion</a> or write to the address
          below. We respond within 30 days.
        </p>
        <p>
          If you are an End Customer and want your data removed, contact the
          business you were messaging — they control that data, and we act on
          their instruction. You may also write to us and we will route your
          request to them.
        </p>
      </Section>

      <Section heading="Children">
        <p>
          KROVA is a business tool and is not directed at anyone under 18. We do
          not knowingly collect data from children.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We will post any change to this policy on this page and update the date
          above. Material changes will be notified to Customers by email before
          they take effect.
        </p>
      </Section>

      <Section heading="Contact">
        <Contact />
      </Section>
    </LegalPage>
  );
}
