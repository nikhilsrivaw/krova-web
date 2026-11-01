/**
 * What each plan can hold. One place, used by the public pricing page and the Billing page.
 * The same numbers are enforced on the server: krova-platform/shared/billing/limits.py. Keep the two
 * in step. The reasoning (and the cost arithmetic behind it) is in docs/new/pricing-sizing.md.
 *
 * Plans differ in size; the entry plan, Solo, also leaves out a few features (NOT_ON_SOLO, enforced by
 * krova-platform/shared/billing/features.py). Customer messages are the one number that is a size, not a
 * switch: nothing is cut off, we talk about moving up.
 * Prices live in krova-platform/shared/billing/plans.py (and PLANS on the pricing page).
 */
export type PlanKey = "solo" | "starter" | "pro" | "scale";

/** What Solo leaves out - every other plan has all of it. Same list as shared/billing/features.py. */
export const NOT_ON_SOLO = ["Website chat", "Feedback", "Analytics reports", "Ask KROVA", "Teams and routing rules"];

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
  solo: {
    tagline: "For one person running the business",
    messages: 500,
    numbers: 1,
    team: 1,
    pages: 6,
    campaign: 300,
    importRows: 1000,
    leadSources: 0,
    apiKeys: 0,
    webhooks: 0,
    perMessage: "3.40",
    why: "WhatsApp, Instagram and the Voice Agent answered for you, with automations and campaigns - for an owner who runs it alone.",
  },
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
    perMessage: "4.00",
    why: "Room for a main line, a sales line and a branch, a team of eight, and your own systems connected.",
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
    perMessage: "3.57",
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
const KEYS = ["solo", "starter", "pro", "scale"] as const;

/** The "built for" lines shown on a plan card. */
export function guideLines(key: PlanKey): string[] {
  const g = PLAN_GUIDE[key];
  const e = enquiries(g.messages);
  return [
    `About ${n(g.messages)} customer messages a month - roughly ${e.month} new enquiries, ${e.day} a day`,
    `${g.numbers} phone ${g.numbers === 1 ? "line" : "lines"} for the Voice Agent`,
    g.team === 1 ? "Your own login - no team logins" : `Up to ${g.team} team logins`,
    `The AI reads about ${g.pages} pages of your own business information before every reply`,
    `Campaigns to up to ${n(g.campaign)} people at a time; imports of up to ${n(g.importRows)} contacts`,
    g.leadSources === null ? "Every lead source: Justdial, IndiaMART, MagicBricks, 99acres, Housing, email"
      : g.leadSources === 0 ? "Your own forms, file import and manual entry" : "1 connected lead source, plus file import and manual entry",
    g.apiKeys === 0 ? "No API keys or outbound webhooks" : `${g.apiKeys} API keys and ${g.webhooks} outbound webhooks`,
    `About ₹${g.perMessage} per customer message`,
  ];
}

/** The comparison table: label, then Solo, Starter, Pro, Scale. */
export function planTable(): { label: string; values: string[] }[] {
  const g = KEYS.map((k) => PLAN_GUIDE[k]);
  const row = (label: string, f: (x: Guide) => string) => ({ label, values: g.map(f) });
  return [
    row("Customer messages a month", (x) => n(x.messages)),
    row("New enquiries (about 6 messages each)", (x) => `${enquiries(x.messages).month} (${enquiries(x.messages).day} a day)`),
    row("Phone lines (Voice Agent)", (x) => String(x.numbers)),
    row("Team logins", (x) => String(x.team)),
    row("Business information the AI reads", (x) => `About ${x.pages} pages`),
    row("People in one campaign", (x) => n(x.campaign)),
    row("Contacts in one import", (x) => n(x.importRows)),
    row("Lead sources", (x) => (x.leadSources === null ? "All" : x.leadSources === 0 ? "Own forms, import, manual" : "1, plus file import and manual entry")),
    row("API keys", (x) => (x.apiKeys === 0 ? "Not included" : String(x.apiKeys))),
    row("Outbound webhooks", (x) => (x.webhooks === 0 ? "Not included" : String(x.webhooks))),
    ...NOT_ON_SOLO.map((name) => ({ label: name, values: KEYS.map((k) => (k === "solo" ? "Not included" : "Included")) })),
  ];
}

/** Included on every plan, Solo too, with no difference between them. */
export const SAME_ON_EVERY_PLAN = [
  "WhatsApp, Instagram and the Voice Agent",
  "Every reply mode: draft, rule-based auto-send and fully automatic",
  "Automations and unlimited rules",
  "WhatsApp, Instagram and voice call campaigns (calls are paid from the wallet)",
  "Bookings, walk-in queue, orders and the rest of your business type's tools",
  "Talk to team, escalations, keypad menu and phone routing",
  "Photo to product match and live suggestions during a call",
  "The same support",
];
