/**
 * What size of business each plan is built for. One place, used by the public pricing page and the
 * Billing page. The reasoning (and the cost arithmetic behind it) is in docs/new/pricing-sizing.md.
 *
 * These are sizes the plans are *designed for*, not hard cut-offs: nothing here stops a business that
 * goes past them. Prices live in krova-platform/shared/billing/plans.py.
 */
export type PlanKey = "starter" | "pro" | "scale";

type Guide = {
  tagline: string;
  /** Customer messages the AI reads and answers each month, across WhatsApp and Instagram. */
  messages: number;
  /** Phone lines for the Voice Agent. */
  numbers: number;
  /** People who can sign in. */
  team: number;
  /** How much of the business's own information the AI reads before a reply, in pages. */
  pages: number;
  /** Price per customer message (price / messages), before GST. */
  perMessage: string;
  /** Why this plan is worth its price, in a line. */
  why: string;
};

export const PLAN_GUIDE: Record<PlanKey, Guide> = {
  starter: {
    tagline: "For one-person and small teams",
    messages: 1000,
    numbers: 1,
    team: 3,
    pages: 9,
    perMessage: "3.00",
    why: "The AI answers from your own prices, hours and policies, and your team approves each reply before it goes out.",
  },
  pro: {
    tagline: "For growing businesses",
    messages: 2000,
    numbers: 3,
    team: 8,
    pages: 15,
    perMessage: "3.00",
    why: "The same rate per message, with room for a main line, a sales line and a branch, and a team of eight.",
  },
  scale: {
    tagline: "For busy, multi-person teams",
    messages: 3500,
    numbers: 5,
    team: 20,
    pages: 24,
    perMessage: "2.86",
    why: "The lowest rate per message, with the most room: five phone lines, twenty logins and the largest knowledge.",
  },
};

/** A typical enquiry is about six customer messages; this turns messages into people. */
export const MESSAGES_PER_ENQUIRY = 6;

export function enquiries(messages: number): { month: number; day: number } {
  const month = Math.round(messages / MESSAGES_PER_ENQUIRY / 10) * 10;
  return { month, day: Math.round(messages / MESSAGES_PER_ENQUIRY / 30) };
}

/** The "built for" lines shown on a plan card. */
export function guideLines(key: PlanKey): string[] {
  const g = PLAN_GUIDE[key];
  const e = enquiries(g.messages);
  return [
    `About ${g.messages.toLocaleString("en-IN")} customer messages a month - roughly ${e.month} new enquiries, ${e.day} a day`,
    `${g.numbers} phone ${g.numbers === 1 ? "line" : "lines"} for the Voice Agent`,
    `Up to ${g.team} team logins`,
    `The AI reads about ${g.pages} pages of your own business information before every reply`,
    `About ₹${g.perMessage} per customer message`,
  ];
}
