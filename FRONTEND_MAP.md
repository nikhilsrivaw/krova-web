# Frontend map

This repo (`web/`) is **one Next.js app that contains two different products**,
not just the internal dashboard:

1. **The public marketing site** — `/`, `/about`, `/contact`, `/pricing`,
   `/privacy`, `/terms`, `/security`, `/data-deletion`, `/docs`, `/login`,
   `/signup`, `/onboarding`. Anyone can visit these without an account.
2. **The internal app** — `/customers`, `/campaigns`, `/analytics`,
   `/whatsapp`, `/conversations`, `/ledger`, `/settings`, `/cases`,
   `/orders`, `/properties`, `/scheduling`, `/flows`, `/knowledge`,
   `/signals`, `/approvals`, `/intelligence`, `/dashboard`, `/workspace`,
   `/voice`. This is what a signed-in business owner uses.

They share one `app/` directory and one `package.json`, but they use two
**separate component systems** — mixing them up is the #1 way to waste time
here, so that split is the first thing to learn.

---

## 1. Landing page — where every component lives

The main landing page is **`app/page.tsx`** (a single file, ~970 lines,
default-exported as `Hero` — the name is a leftover, it renders the whole
page, not just the hero section). It's built from two kinds of pieces:

### Shared components it imports

| Component | File | What it does on the landing page |
|---|---|---|
| `Navbar` | `components/spectrum/navbar.tsx` | Fixed top nav. Every public page uses this — the "must render first" comment in `page.tsx` is about avoiding HMR flicker, not a style choice. |
| `SiteFooter` | `components/spectrum/site-footer.tsx` | Footer, every public page. |
| `HowItWorks` | `components/spectrum/how-it-works.tsx` | The animated beam diagram in the "How it works" section. |
| `PhoneBriefing` | `components/spectrum/phone-briefing.tsx` | The phone mockup showing the 8am WhatsApp briefing. |
| `DataFlowVideo` | `components/spectrum/data-flow-video.tsx` | The autoplaying product-film section between "How it works" and the phone mockup. |
| `SpotlightCard` | `components/spectrum/spotlight-card.tsx` | The two metric cards (Reply Rate / Going Cold) inside the hero's OS-window mockup. |
| `FaqAccordion` | `components/spectrum/faq-accordion.tsx` | FAQ section — content comes from the `FAQ_ITEMS` array at the top of `page.tsx`, not from the component. |
| `AuroraText` | `components/magicui/aurora-text.tsx` | The gradient-animated "AI analyst" text in the final CTA headline. |
| `BorderBeam` | `components/magicui/border-beam.tsx` | The animated border glow on every "OS window" mockup (hero, final CTA). |
| `NumberTicker` | `components/magicui/number-ticker.tsx` | The counting-up numbers in the metric cards (94%, 7). |
| `Marquee` | `components/magicui/marquee.tsx` | The scrolling "plugs into the tools you already use" logo strip. |
| `AnimatedList` | `components/magicui/animated-list.tsx` | The "What KROVA found" notification stack in the hero mockup. |
| `DotPattern` | `components/magicui/dot-pattern.tsx` | Background dot texture inside the hero's OS-window mockup. |
| `TypingAnimation` | `components/magicui/typing-animation.tsx` | The typewriter effect on the "Briefing" text inside `LiveBrainWindow`. |

### Components defined inline, inside `page.tsx` itself

These aren't reused anywhere else, which is why they live in the page file
instead of `components/`:

- `LiveBrainWindow` — the hero's centerpiece: three channel icons feeding
  one hub node, animated packets (`InputPacket`/`OutputPacket`), a typed
  briefing on the right. This is the single most complex piece on the page.
- `ChannelNode`, `InputPacket`, `OutputPacket` — building blocks used only
  by `LiveBrainWindow`.
- `NotificationItem` — one row in the "What KROVA found" list.
- `Eyebrow` — the small uppercase label above every section heading
  ("How it works", "Pricing", etc.) — a one-line wrapper, not worth its own
  file.
- `StaggeredWords` — animates the hero headline word-by-word on load.
- `Magnetic` — wraps the primary CTA button so it drifts slightly toward
  the cursor on hover.

### Content that's data, not markup

Editing copy (not layout) usually means editing one of these arrays at the
top of `page.tsx`, not touching JSX at all: `PLANS` (pricing), `NOTIFICATIONS`
(hero mockup), `VERTICALS` (coaching/clinic/salon/agency cards), `INTELLIGENCE_CARDS`
(the 4-card feature grid), `FAQ_ITEMS`.

### Other marketing pages

Most of the *other* public pages don't rebuild their own layout — they use
one of two shared templates:

- **`components/spectrum/content-page.tsx`** — used by `/about`, `/contact`,
  `/security`. A generic "heading + prose sections" template.
- **`components/spectrum/legal-page.tsx`** — used by `/privacy`, `/terms`,
  `/data-deletion`. Same idea, styled for legal copy (numbered sections,
  last-updated date).
- **`/pricing`** and **`/docs`** are the exceptions — they build their own
  layout directly with `Navbar` + `magicui` components (`Particles`,
  `Meteors`, `ShinyText`, `AnimatedGridPattern`), the same way `page.tsx`
  does, rather than using a shared template.

If a new page is mostly text (another legal page, another static info
page), reach for `content-page.tsx` or `legal-page.tsx` first — writing a
one-off layout for it is very likely redoing work that already exists.

---

## 2. What a landing page actually needs — the checklist

For anyone new to landing pages, not just this one: these are the sections
that earn their place on *any* SaaS landing page, and where each one
already lives in `app/page.tsx`. If you're asked to rework the landing page
and one of these is missing or weak, that's the gap to flag.

| Must-have | Why | Where it is here |
|---|---|---|
| **A one-sentence claim, above the fold** | The visitor decides to keep reading in the first 3 seconds. | The `<h1>` — "Reads every conversation. Tells you what to do next." |
| **Show the product, not a mood photo** | Screenshots/mockups convert better than lifestyle stock imagery for software. | `LiveBrainWindow` + the OS-window mockup — the mechanism, animated, not a stock photo. |
| **One primary CTA, repeated, never competing with a second one** | Multiple equal-weight CTAs split intent and lower conversion. | "Start Free Trial" appears in the hero, the final CTA, and every pricing card — always the same action. |
| **How it works, in 3-ish steps** | Visitors who don't already know the category need the mechanism explained plainly. | The `#how-it-works` section + `HowItWorks` beam diagram. |
| **Concrete features, not adjectives** | "Powerful AI" says nothing; "Drafts replies that sound like you" says something. | `INTELLIGENCE_CARDS` — each one names a real capability. |
| **Who it's for, specifically** | Generic landing pages convert worse than ones that let the right visitor self-identify. | The `VERTICALS` section — coaching/clinic/salon/agency, pain + win for each. |
| **Social proof or a trust signal** | Reduces perceived risk of trying something new. | Currently the thinnest section — the "Powered by Claude API" badge is the only trust signal on the page. Worth knowing if this page gets revisited: **no testimonials, logos, or usage numbers exist yet.** |
| **Pricing, or a clear reason it's hidden** | Hidden pricing is a legitimate choice for enterprise sales, but for a self-serve SMB product it's usually friction. | `#pricing` section, three tiers, all self-serve. |
| **Objection-handling (FAQ)** | Catches the "yes, but what about X" that stops a visitor from converting. | `FAQ_ITEMS` — note it directly addresses the "is this a CRM?" objection head-on. |
| **A final, low-friction CTA** | Someone who scrolled the whole page is warm — don't make them scroll back up to convert. | The last section before the footer, same "Start Free Trial" action. |
| **Footer with real legal/contact links** | Required for trust and for Meta/payment-provider compliance review, not just nicety. | `SiteFooter` — links to `/privacy`, `/terms`, `/data-deletion`, `/contact`. |

---

## 3. The internal app, briefly

Everything under `/customers`, `/campaigns`, `/analytics`, `/whatsapp`,
`/conversations`, `/ledger`, `/settings`, etc. is a **separate design
system** from the marketing site — don't reach for `magicui`/`spectrum`
components here.

- **`components/shell/AppLayout.tsx`** — every internal page wraps its
  content in this. It takes `title`, `subtitle`, and an `actions` slot for
  header buttons. Look at any file under `app/customers/`, `app/campaigns/`,
  etc. for the pattern — they all start the same way.
- **`components/ui/`** — the internal design system's primitives:
  `GlassCard`, `Badge`, `Modal`, `Drawer`, `EmptyState`, `Skeleton`,
  `MetricCard`, `AutonomyPill`. These are what every internal page is built
  from, the same way marketing pages are built from `magicui`/`spectrum`.
- **`lib/api.ts`** — the single file with every backend call and every
  response type. If you're wiring a new internal feature to the backend,
  this is where the request function and its TypeScript type both live,
  already grouped by feature area (`ledger`, `crm`, `campaigns`, `channels`,
  `analytics`, etc.).
- **Feature-specific components** live in their own folder under
  `components/` — e.g. `components/crm/PipelineBoard.tsx`,
  `components/whatsapp/CarouselTemplateModal.tsx` — reach for these when a
  piece of UI is complex enough that it shouldn't live inline in the page
  file, the same judgment call as the landing page's `LiveBrainWindow`.

---

## 4. Where to start as a new contributor

1. Run it locally, click through both halves — the marketing site at `/`
   and the internal app at `/customers` (needs a logged-in session).
2. Pick one small, contained task first that touches only one system —
   don't take on a task spanning both halves until the two component
   systems above feel natural.
3. `lib/api.ts` is the map of the backend from the frontend's side — read
   the relevant section before touching any internal-app page, since every
   type there is meant to match the backend response exactly, not guessed.
