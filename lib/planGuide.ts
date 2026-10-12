/**
 * What each plan can hold. One place, used by the public pricing page and the Billing page.
 * The same numbers are enforced on the server: krova-platform/shared/billing/limits.py. Keep the two
 * in step. The reasoning (and the cost arithmetic behind it) is in docs/new/pricing-sizing.md.
 *
 * Only capacity differs between plans. Every feature is on every plan. Customer messages are the one
 * number that is a size, not a switch: nothing is cut off, we talk about moving up.
 * Prices live in krova-platform/shared/billing/plans.py.
 */
export type PlanKey = "starter" | "pro" | "scale";

type Guide = {
  tagline: string;
  /** Customer messages the AI reads and answers each month, across WhatsApp and Instagram. */
  messages: number;
  /** Phone lines for the Voice Agent. */
  numbers: number;
  /** People who can sign in (the owner counts as one). */
  team: number;
  /** How much of the business's own information the AI reads before a reply, in pages. */
  pages: number;
  /** People one WhatsApp or Instagram campaign can reach. */
  campaign: number;
  /** Contacts in one bulk import. */
  importRows: number;
  /** Connected lead sources; null = all. */
  leadSources: number | null;
  apiKeys: number;
  webhooks: number;
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
    campaign: 500,
    importRows: 5000,
    leadSources: 1,
    apiKeys: 0,
    webhooks: 0,
    perMessage: "3.00",
    why: "Everything KROVA does, sized for a small business: the AI answers from your own prices, hours and policies.",
  },
  pro: {
    tagline: "For growing businesses",
    messages: 2000,
    numbers: 3,
    team: 8,
    pages: 15,
    campaign: 3000,
    importRows: 20000,
    leadSources: null,
    apiKeys: 2,
    webhooks: 5,
    perMessage: "3.00",
    why: "The same rate per message, with room for a main line, a sales line and a branch, a team of eight, and your own systems connected.",
  },
  scale: {
    tagline: "For busy, multi-person teams",
    messages: 3500,
    numbers: 5,
    team: 20,
    pages: 24,
    campaign: 10000,
    importRows: 50000,
    leadSources: null,
    apiKeys: 10,
    webhooks: 20,
    perMessage: "2.86",
    why: "The lowest rate per message, with the most room: five phone lines, twenty logins, the largest campaigns and the most information for the AI.",
  },
};

/** A typical enquiry is about six customer messages; this turns messages into people. */
export const MESSAGES_PER_ENQUIRY = 6;

export function enquiries(messages: number): { month: number; day: number } {
  const month = Math.round(messages / MESSAGES_PER_ENQUIRY / 10) * 10;
  return { month, day: Math.round(messages / MESSAGES_PER_ENQUIRY / 30) };
}

const n = (v: number) => v.toLocaleString("en-IN");
const KEYS = ["starter", "pro", "scale"] as const;

/** The "built for" lines shown on a plan card. */
export function guideLines(key: PlanKey): string[] {
  const g = PLAN_GUIDE[key];
  const e = enquiries(g.messages);
  return [
    `About ${n(g.messages)} customer messages a month - roughly ${e.month} new enquiries, ${e.day} a day`,
    `${g.numbers} phone ${g.numbers === 1 ? "line" : "lines"} for the Voice Agent`,
    `Up to ${g.team} team logins`,
    `The AI reads about ${g.pages} pages of your own business information before every reply`,
    `Campaigns to up to ${n(g.campaign)} people at a time; imports of up to ${n(g.importRows)} contacts`,
    g.leadSources === null ? "Every lead source: Justdial, IndiaMART, MagicBricks, 99acres, Housing, email" : "1 connected lead source, plus file import and manual entry",
    g.apiKeys === 0 ? "No API keys or outbound webhooks" : `${g.apiKeys} API keys and ${g.webhooks} outbound webhooks`,
    `About ₹${g.perMessage} per customer message`,
  ];
}

/** The comparison table: label, then Starter, Pro, Scale. */
export function planTable(): { label: string; values: [string, string, string] }[] {
  const g = KEYS.map((k) => PLAN_GUIDE[k]);
  const row = (label: string, f: (x: Guide) => string) => ({ label, values: g.map(f) as [string, string, string] });
  return [
    row("Customer messages a month", (x) => n(x.messages)),
    row("New enquiries (about 6 messages each)", (x) => `${enquiries(x.messages).month} (${enquiries(x.messages).day} a day)`),
    row("Phone lines (Voice Agent)", (x) => String(x.numbers)),
    row("Team logins", (x) => String(x.team)),
    row("Business information the AI reads", (x) => `About ${x.pages} pages`),
    row("People in one campaign", (x) => n(x.campaign)),
    row("Contacts in one import", (x) => n(x.importRows)),
    row("Lead sources", (x) => (x.leadSources === null ? "All" : "1, plus file import and manual entry")),
    row("API keys", (x) => (x.apiKeys === 0 ? "Not included" : String(x.apiKeys))),
    row("Outbound webhooks", (x) => (x.webhooks === 0 ? "Not included" : String(x.webhooks))),
  ];
}

/** Included on every plan, with no difference between them. */
export const SAME_ON_EVERY_PLAN = [
  "WhatsApp, Instagram and the Voice Agent",
  "Ask KROVA and the owner's morning and nightly briefings",
  "Every reply mode: draft, rule-based auto-send and fully automatic",
  "Automations and unlimited rules",
  "Voice call campaigns (calls are paid from the wallet)",
  "Team tools: auto-assign, late-reply alerts, team phone routing, keypad menu",
  "Photo to product match and live suggestions during a call",
  "Full analytics",
  "The same support",
];
