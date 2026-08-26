import type { Metadata } from "next";

import {
  Bullets,
  Contact,
  LegalPage,
  Notice,
  Section,
} from "@/components/spectrum/legal-page";

export const metadata: Metadata = {
  title: "Data Deletion — KROVA",
  description:
    "How to delete your KROVA account and all associated data, and what happens when you do.",
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      title="Data Deletion"
      summary="How to have your data removed from KROVA, what gets deleted, and how long it takes."
      updated="8 August 2026"
      active="/data-deletion"
    >
      <Section heading="How to request deletion">
        <p>
          Email <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a>{" "}
          from the address on the account, with the subject{" "}
          <strong>&ldquo;Delete my data&rdquo;</strong>. Include your business
          name so we can locate the account.
        </p>
        <p>
          We verify that you control the account before deleting anything, then
          confirm in writing once it is done. Deletion completes within{" "}
          <strong>30 days</strong> of a verified request, and cannot be undone.
        </p>
      </Section>

      <Section heading="What gets deleted">
        <Bullets
          items={[
            "Your account, profile, and team member records.",
            "All customer records and contact details stored in your workspace.",
            "All message content synced from WhatsApp, Instagram, Gmail, and Outlook.",
            "All derived intelligence — profiles, predictions, commitments, revenue signals, competitor mentions, briefs, and reports.",
            "All stored credentials, including OAuth tokens and any third-party API keys.",
            "Analytics and activity history tied to your business.",
          ]}
        />
      </Section>

      <Section heading="What we may keep, and why">
        <p>
          We retain a minimal record of invoices and payments where tax and
          accounting law requires it. These contain billing details only — no
          conversation content, no customer records, no derived intelligence.
        </p>
        <p>
          Aggregated, anonymised statistics that cannot identify your business or
          any individual may be retained. These cannot be reversed to recover
          deleted data.
        </p>
        <p>
          Encrypted backups are rotated on a rolling schedule and purge deleted
          data within 30 days of the deletion request.
        </p>
      </Section>

      <Section heading="Disconnecting a channel instead">
        <p>
          If you want to stop KROVA reading a channel without closing your
          account, disconnect it from{" "}
          <strong>Settings → Connected Channels</strong>, or email us naming the
          channel. Collection from that channel stops immediately.
        </p>
        <Notice>
          <p>
            Disconnecting stops <strong>future</strong> collection but does not
            remove what was already synced. To delete that too, email us at{" "}
            <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a> naming
            the channel, and we will remove its data while leaving the rest of
            your account intact.
          </p>
        </Notice>
        <p>
          Disconnecting WhatsApp does not affect your WhatsApp Business Account
          itself, your phone number, or your relationship with Meta. Your number
          and message templates remain yours.
        </p>
      </Section>

      <Section heading="If you messaged a business that uses KROVA">
        <p>
          If you are not a KROVA account holder but exchanged messages with a
          business that uses KROVA, that business controls your data and we
          process it only on their instruction. Contact them directly to have it
          removed.
        </p>
        <p>
          You can also write to{" "}
          <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a> and we
          will forward your request to the relevant business and confirm once it
          has been actioned.
        </p>
      </Section>

      <Section heading="Contact">
        <Contact />
      </Section>
    </LegalPage>
  );
}
