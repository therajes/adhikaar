# ADHIKAAR visual direction

Status: approved prerequisite for the next implementation session.

## Personality

ADHIKAAR should feel like a beautifully designed public-safety service: human, calm, warm, and trustworthy. It must not resemble a hacker console, AI product, crypto exchange, generic admin template, or government portal.

Three adjectives guide every screen: **reassuring, editorial, effortless**.

## Typography

### English

- **Fraunces Variable** — display headings, big verdict statements, pull quotes, and section numerals. Its optical-size and soft-serif personality gives the product a recognisable editorial voice.
- **Plus Jakarta Sans Variable** — navigation, buttons, forms, explanations, dashboards, and proof details. It is contemporary and friendly while remaining clear at small sizes.
- Recommended display settings: weight 620–700, optical sizing enabled, tight but not compressed tracking.
- Recommended UI settings: weight 450 for prose, 600 for labels, and 700 for primary actions.

### Hindi

- **Noto Sans Devanagari** — citizen-facing Hindi at 400 and 600 because it has correct Devanagari shaping, proportions, and legibility.
- Fraunces is not forced onto Devanagari. Hindi headings use Noto Sans Devanagari with stronger size, weight, and spacing to preserve the same hierarchy.

All fonts are bundled locally. The next session will replace current Manrope/Source Serif imports and remove packages that are no longer used.

## Palette

- Ink navy `#102A43` — authority and main actions.
- Midnight `#071D31` — display text and high-contrast panels.
- Powder blue `#E7F3FB` — calm receiver surfaces.
- Sea-glass teal `#16827C` — verified identity and privacy.
- Warm cream `#F8F3EA` — primary canvas.
- Paper `#FFFDF8` — cards.
- Coral `#E8795E` — human accent and blocked requests.
- Amber `#C57A20` — caution without panic.
- Leaf green `#1B7652` — authorised verdicts.

Avoid neon green, terminal black, glowing purple AI gradients, circuit-board wallpaper, fake code, excessive glassmorphism, and padlock overload.

## Generated image library

All production copies are optimized JPEGs in `apps/web/public/assets`; the original PNG generations remain in Codex's generated-image library.

1. `adhikaar-two-sided-trust.jpg` — home hero; receiver and employee connected by a permission check.
2. `receiver-safety.jpg` — receiver page; an Indian woman calmly checks a call at home. Copy space is intentionally on the left.
3. `employee-authority.jpg` — employee page; an Indian representative selects permitted actions, with one unsafe request visibly blocked. Copy space is intentionally on the right.
4. `consortium-transparency.jpg` — transparency page; three human validators and a clear two-of-three trust metaphor.

Art direction across the library: sophisticated editorial illustration, gentle paper grain, layered shapes, warm daylight, deep navy/powder blue/teal/cream/coral, no text, no real logos, no hackers, no AI motifs, and no crypto imagery.

## Screen composition for the next session

- **Home:** keep the two-sided hero, add oversized editorial headline composition, a small “two sides / one safe answer” visual rail, and more intentional asymmetry.
- **Receiver:** use `receiver-safety.jpg` as a cinematic upper panel, then place the two-step challenge journey in a layered paper card that overlaps the image. Make the private code the visual focal point.
- **Employee:** use `employee-authority.jpg` in a compact dashboard welcome panel; make policy-approved actions feel like a curated conversation checklist, not a generic settings form.
- **Transparency:** open with the consortium illustration and explain governance through three friendly validator profiles before technical hashes.
- **Safety lab:** use editorial numbered tiles and plain-language threat stories. Technical evidence remains in expandable drawers.
- **Verdicts:** large Fraunces verdict, one unmistakable color, one action sentence, and one safe callback. Technical data stays secondary.

## Interaction and accessibility

- 44px minimum interactive targets; visible focus rings; logical tab order; skip link.
- No essential information conveyed by color alone.
- Reduced-motion mode disables decorative transitions.
- Mobile receives a clear bottom navigation and single-column journeys.
- QR always has a manual six-character fallback.
- Illustrations require useful alt text; decorative textures use empty alt text.
- Keep body copy at 16px or larger on citizen screens.
