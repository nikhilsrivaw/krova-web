import type { Metadata } from "next";

import {
  Bullets,
  Contact,
  LegalPage,
  Notice,
  Section,
} from "@/components/spectrum/legal-page";

export const metadata: Metadata = {
  title: "Refund & Cancellation Policy - KROVA",
  description:
    "How cancelling a KROVA plan works, and when money is or is not returned.",
};

export default function RefundPolicyPage() {
  return (
    <LegalPage
      title="Refund & Cancellation Policy"
      summary="How cancelling works, and when money is or is not returned."
      updated="20 November 2026"
      active="/refund-policy"
    >
      <Section heading="Who this applies to">
        <p>
          This policy covers payments made to{" "}
          <strong>Aqirox Technology Private Limited</strong> for KROVA: monthly
          plan payments and wallet recharges. It forms part of our{" "}
          <a href="/terms">Terms of Service</a>.
        </p>
      </Section>

      <Section heading="Cancelling your plan">
        <Bullets
          items={[
            "The account owner can cancel the plan at any time from the Billing page.",
            "After you cancel, your plan keeps working until the end of the period you have already paid for. It does not renew after that.",
            "You can undo the cancellation from the same page before the period ends.",
          ]}
        />
      </Section>

      <Section heading="Plan payments">
        <p>
          Plan payments are <strong>not refundable</strong>, including for a
          partly used month. Cancelling stops the next renewal; it does not
          return the payment for the current period.
        </p>
      </Section>

      <Section heading="Wallet balance">
        <Bullets
          items={[
            "Money added to the wallet is used for calls and phone number rent.",
            "Wallet recharges are not refundable, and the payment gateway fee charged on a recharge is not refundable.",
            "If you close your account or stop using KROVA, any unused wallet balance is not returned.",
          ]}
        />
      </Section>

      <Section heading="Payments made by mistake">
        <p>
          If you were charged twice for the same payment, charged the wrong
          amount, or charged when the payment showed as failed, we will return
          the extra amount.
        </p>
        <Bullets
          items={[
            "Write to us within 30 days of the payment, with the payment date, amount, and transaction or receipt number.",
            "Once we confirm it, the amount is returned to the original payment method within 5 to 7 working days.",
            "When a payment fails but money left your account, your bank or the payment gateway usually reverses it on its own. If it has not come back, write to us and we will help.",
          ]}
        />
        <Notice>
          <p>
            <strong className="font-medium text-white">
              Messaging charges from Meta are not paid to KROVA.
            </strong>{" "}
            They are billed to you by Meta directly, so any question about them
            goes to Meta.
          </p>
        </Notice>
      </Section>

      <Section heading="Contact">
        <p>
          For billing questions write to{" "}
          <a href="mailto:support@aqirox.com">support@aqirox.com</a>.
        </p>
        <Contact />
      </Section>
    </LegalPage>
  );
}
