import type { Metadata } from "next";

import {
  Bullets,
  Contact,
  LegalPage,
  Notice,
  Section,
} from "@/components/spectrum/legal-page";

export const metadata: Metadata = {
  title: "Terms of Service — KROVA",
  description:
    "The agreement between KROVA and the businesses that use it.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      summary="The agreement between KROVA and the businesses that use it. Plain language, no traps."
      updated="8 August 2026"
      active="/terms"
    >
      <Section heading="Agreement">
        <p>
          These terms are between <strong>Aqirox Technology Private Limited</strong>{" "}
          {'("KROVA", "we")'} and the business that creates an account{" "}
          {'("you")'}. By creating an account or using the service, you accept
          them. If you are accepting on behalf of a company, you confirm you are
          authorised to bind it.
        </p>
      </Section>

      <Section heading="What KROVA does">
        <p>
          KROVA connects to messaging and email channels you already own, reads
          the conversations on them, and produces business intelligence —
          customer profiles, follow-up priorities, commitments, and revenue
          signals. It can draft messages for you to approve, and send them
          through your own connected accounts.
        </p>
        <p>
          KROVA is a decision-support tool. It does not replace your commercial
          judgement.
        </p>
      </Section>

      <Section heading="Your account">
        <Bullets
          items={[
            "You must give accurate registration details and keep them current.",
            "You are responsible for activity under your account and for your team members' use of it.",
            "You must be at least 18 and using KROVA for a business purpose.",
            "Keep your credentials secure and tell us promptly if you suspect unauthorised access.",
          ]}
        />
      </Section>

      <Section heading="Connected channels">
        <p>
          You connect your own WhatsApp Business Account, Instagram Business
          account, Gmail, or Outlook. Those accounts remain yours. You confirm
          you are authorised to connect them and to allow KROVA to read and send
          on them.
        </p>
        <p>
          Your use of those channels also remains subject to the providers&rsquo;
          own terms, including the WhatsApp Business Messaging Policy and
          Meta&rsquo;s platform policies. You are responsible for complying with
          them, including obtaining any consent required before messaging your
          customers.
        </p>
        <Notice>
          <p>
            <strong className="font-medium text-white">
              Messaging charges are billed to you by Meta directly, at
              Meta&rsquo;s published rates.
            </strong>{" "}
            KROVA adds no markup to message costs. Your subscription to KROVA is
            separate and covers the software only.
          </p>
        </Notice>
      </Section>

      <Section heading="Automated sending">
        <p>
          KROVA can send messages automatically under rules you configure. If you
          enable this, you are responsible for the messages sent and for their
          compliance with applicable law and platform policy.
        </p>
        <p>
          You can disable automation at any time. We may suspend automated
          sending on an account if it threatens the deliverability, quality
          rating, or platform standing of other users.
        </p>
      </Section>

      <Section heading="Acceptable use">
        <p>You may not use KROVA to:</p>
        <Bullets
          items={[
            "Send unsolicited bulk messages, spam, or content that violates platform messaging policies.",
            "Process data you have no lawful basis or consent to process.",
            "Connect an account you do not own or control.",
            "Reverse engineer, resell, or white-label the service without written agreement.",
            "Attempt to access another customer's data, or probe or disrupt the service.",
            "Break any applicable law.",
          ]}
        />
        <p>
          We may suspend or terminate accounts that breach this section, without
          refund where the breach is serious.
        </p>
      </Section>

      <Section heading="Your data">
        <p>
          You own your data. You grant us the limited licence needed to host,
          process, and analyse it in order to provide the service — including
          transmitting conversation content to our AI subprocessor as described
          in the <a href="/privacy">Privacy Policy</a>.
        </p>
        <p>
          We do not sell your data, do not use it for advertising, and do not use
          your conversation content to serve other customers or to train models.
        </p>
      </Section>

      <Section heading="Fees">
        <Bullets
          items={[
            "Subscription fees are billed in advance on the cycle shown at checkout, and are stated exclusive of GST unless marked otherwise.",
            "Fees are non-refundable except where required by law.",
            "We may change pricing with 30 days' notice. Changes take effect at your next renewal.",
            "Non-payment may result in suspension after written notice.",
          ]}
        />
      </Section>

      <Section heading="Availability">
        <p>
          We aim to keep KROVA available and reliable, but we do not guarantee
          uninterrupted service. Scheduled maintenance, provider outages, and
          upstream platform changes can interrupt it. Analysis runs on a
          scheduled cycle and timing may vary.
        </p>
      </Section>

      <Section heading="AI output">
        <p>
          KROVA&rsquo;s intelligence, predictions, and drafted messages are
          generated by AI models and can be incomplete or wrong. Review them
          before acting. We make no warranty that any prediction is accurate or
          that any suggested action will produce a commercial result.
        </p>
      </Section>

      <Section heading="Liability">
        <p>
          To the maximum extent permitted by law, the service is provided
          &ldquo;as is&rdquo; without warranties of any kind. We are not liable
          for indirect, incidental, or consequential loss, or for lost profits,
          revenue, or data.
        </p>
        <p>
          Our total liability in any 12-month period is limited to the fees you
          paid us in that period.
        </p>
      </Section>

      <Section heading="Termination">
        <p>
          You may cancel at any time from Settings; access continues to the end
          of the paid period. We may terminate for breach of these terms, or for
          convenience with 30 days&rsquo; notice.
        </p>
        <p>
          On termination, your data is deleted as described in{" "}
          <a href="/data-deletion">Data Deletion</a>.
        </p>
      </Section>

      <Section heading="Changes">
        <p>
          We may update these terms. Material changes will be notified by email
          at least 30 days before they take effect. Continuing to use KROVA after
          that means you accept them.
        </p>
      </Section>

      <Section heading="Governing law">
        <p>
          These terms are governed by the laws of India. The courts at{" "}
          Gorakhpur, Uttar Pradesh have exclusive jurisdiction, subject to any
          non-waivable right you have to bring a claim locally.
        </p>
      </Section>

      <Section heading="Contact">
        <Contact />
      </Section>
    </LegalPage>
  );
}
