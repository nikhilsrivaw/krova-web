# Landing page image prompts (for Gemini / Nano Banana)

One consistent style across every image — flat, warm, friendly illustration
in the vein of Google's own product-marketing illustration language
(Workspace/Material-style: rounded simple character shapes, warm limited
color blocking, no photorealism, no heavy gradients-as-shading, no visible
brush texture). Every prompt below repeats the same style line on purpose —
paste that line into every generation so Gemini doesn't drift between them.

**Shared style line — include verbatim in every prompt:**
> Flat, friendly vector-style illustration, Google Material/Workspace
> marketing-illustration aesthetic. Simple rounded geometric character
> shapes, warm limited palette (cream/off-white base, terracotta-brass
> accent, deep teal secondary), soft flat color blocking, minimal clean
> linework, no photorealism, no gradient shading, no visible texture or
> brush strokes.

Save the generated files into `web/public/images/` with the filenames
below — once they're there, tell me and I'll wire them into `page.tsx`.

---

## 1. Hero image — `hero-owner.png`

**Replaces:** the abstract "OS window mockup" as the dominant visual, or
sits alongside it — this is the single most important image on the page,
the thesis shot.

**Prompt:**
> [shared style line] A small clinic owner character, a woman in a simple
> kurta with hair tied back, sitting at a modest reception desk early in
> the morning, looking at her phone with a calm, relieved half-smile. A
> simple potted plant and an appointment register on the desk, a
> stethoscope shape draped over her chair. Background kept minimal —
> a soft suggestion of a clinic waiting area, one or two simple chair
> shapes, no clutter. Warm morning-light color treatment even though it's
> flat illustration (soft cream/yellow wash, not literal rays). 4:3 aspect
> ratio.

**Why this framing:** the copy above it is "It reads / thinks / predicts /
drafts / remembers. You sleep peacefully." — the image should show the
*relief* that promise delivers, not a generic "person at a laptop." A
clinic owner specifically (not generic "office worker") because Clinics &
Doctors is one of the four named verticals, and specificity beats generic.

---

## 2–5. Vertical cards — one per vertical, same character-illustration system

**Replaces:** nothing currently exists here — the `VERTICALS` section
today is icon + text only. Add a small illustration to each `GlowCard`.

**2a. Coaching Institutes — `vertical-coaching.png`**
> [shared style line] A coaching-institute owner character at a desk with
> a stack of admission forms and a phone showing a small chat-bubble
> icon, a simple whiteboard shape with a minimal batch-timetable grid
> behind them. Square 1:1.

**2b. Clinics & Doctors — `vertical-clinic.png`**
> [shared style line] A doctor character in a simple white coat at a
> small reception desk, phone in hand showing a chat-bubble icon with a
> small calendar-check mark, a simple stethoscope shape nearby. Square
> 1:1.

**2c. Salons & Spas — `vertical-salon.png`**
> [shared style line] A salon owner character holding a simple
> scissors-shape prop, standing near a styling-chair silhouette, phone
> showing a chat-bubble icon with a small clock mark. Square 1:1.

**2d. Agencies & Studios — `vertical-agency.png`**
> [shared style line] An agency-founder character at a small standing
> desk with a laptop silhouette and a simple document/quote-paper shape,
> phone showing a chat-bubble icon with a small checkmark. Square 1:1.

**Why matched, not photo:** four real photos of "diverse business owners"
reads as stock-photo cliché fast. One consistent illustrated character
system across all four (now matching the hero too) reads as a deliberate
design, and scales cleanly if a fifth vertical gets added later.

---

## 6. Phone-briefing section — `phone-briefing-moment.png`

**Sits behind/beside** the existing `<PhoneBriefing />` animated mockup
component, in the "Wake up to a full intelligence brief on WhatsApp"
section — a real moment, not another mockup.

**Prompt:**
> [shared style line] Close, cropped-in illustration of two hands holding
> a phone at a kitchen table early morning, a simple cup of chai next to
> the phone with a soft steam-curl shape, a minimal suggestion of a home
> kitchen in the background (kept very simple — a window shape, nothing
> cluttered). The phone screen itself is a soft flat glow/blank rectangle
> (not readable text or UI — this sits behind a real product mockup, so
> the screen content doesn't need to show anything). 4:5 aspect ratio.

**Why:** the copy sells "your first briefing before your first chai" —
the image should be the literal chai moment, grounding an otherwise
abstract "AI sends you a message" claim in something physically warm and
specific, in the same illustrated language as the hero and the verticals.

---

## Notes on generating these

- Ask Gemini for each one individually, not as a batch — you'll get better
  adherence to the specific composition notes, and always paste the shared
  style line verbatim so the six images actually read as one system
  instead of six different illustration styles.
- If a result drifts toward photorealism, 3D-render look, or a "corporate
  stock illustration" feel (forced poses, generic clip-art vibe), regenerate
  rather than settle — the whole point is a warm, specific, consistent
  character system, not filler art.
- PNG or JPG both fine. Keep file sizes reasonable (under ~500KB each) —
  I'll add proper Next.js `<Image>` optimization once they're wired in
  regardless, but starting smaller means faster local iteration.
