import type { Metadata } from "next";
import Link from "next/link";

import {
  ContentPage,
  Notice,
  Section,
} from "@/components/spectrum/content-page";

export const metadata: Metadata = {
  title: "Contact Krova",
  description:
    "Contact details for Krova and Aqirox Technology Private Limited.",
};

export default function ContactPage() {
  return (
    <ContentPage
      eyebrow="Contact"
      title="Get in touch"
      summary="Krova is developed and operated by Aqirox Technology Private Limited. Use the details below for support, privacy requests or general enquiries."
    >
      <Section heading="Company">
        <p>
          <strong>Aqirox Technology Private Limited</strong>
          <br />
          Shivje Nagar, Muhisudharpur, Shivpurinewcolony
          <br />
          Gorakhpur Sadar, Gorakhpur- 273016
          <br />
          Uttar Pradesh, India
        </p>
      </Section>

      <Section heading="Websites">
        <p>
          Company:{" "}
          <a href="https://www.aqirox.com" target="_blank" rel="noreferrer">
            www.aqirox.com
          </a>
          <br />
          Product:{" "}
          <a href="https://www.krova.space" target="_blank" rel="noreferrer">
            www.krova.space
          </a>
        </p>
      </Section>

      <Section heading="Email">
        <p>
          General enquiries and support:{" "}
          <a href="mailto:support@aqirox.com">support@aqirox.com</a>
          <br />
          Privacy and data requests:{" "}
          <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a>
        </p>
      </Section>

      <Section heading="Data and privacy requests">
        <p>
          To request access to, correction of, or deletion of your data, see the{" "}
          <Link href="/data-deletion">Data Deletion</Link> page, which sets out
          the process and what gets removed. Requests are answered within 30
          days.
        </p>
        <p>
          Our approach to data handling is described in the{" "}
          <Link href="/privacy">Privacy Policy</Link>, and the technical
          measures in place are on the <Link href="/security">Security</Link>{" "}
          page.
        </p>
      </Section>

      <Section heading="Grievance Officer">
        <Notice>
          <p>
            Under India&rsquo;s Digital Personal Data Protection Act, 2023,
            complaints about how personal data is handled can be raised with our
            Grievance Officer:{" "}
            <strong>Nikhil Srivastava</strong>,{" "}
            <a href="mailto:privacy@aqirox.com">privacy@aqirox.com</a>.
          </p>
        </Notice>
      </Section>
    </ContentPage>
  );
}
