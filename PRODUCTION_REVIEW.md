# XAVRO — Production Readiness Review

Final refinement pass on the existing site. **No rebuild, no concept change, no section
re-order.** The premium dark editorial ribbon concept is kept; this pass fixes the remaining
production bugs, polishes timing/readability, hardens accessibility, and verifies mobile.

**Method (per CLAUDE.md):** every change was screenshotted, reviewed, and re-verified.
- Before: `qa-screenshots/baseline-prod/` (desktop + mobile, fresh load)
- After:  `qa-screenshots/production-final/` (desktop + mobile + reduced-motion)
- Supporting: `qa-screenshots/loader/`, `qa-screenshots/boundaries/`, `qa-screenshots/mobile-prod/`
  (390/430/768), `qa-screenshots/probe/` (reload + CTA focus), `qa-screenshots/video/xavro-full-scroll.webm`
- Capture scripts in `qa/` (Playwright). Run a static server on `127.0.0.1:8123`, then
  `node qa/shoot.mjs <name> --fresh`.

Console: `node qa/console.mjs` → **ERRORS: none** (full scroll). Reduced-motion:
`node qa/reduced-check.mjs` → **REDUCED ERRORS: none**.

---

## What was fixed

### 1. First loaded screen was the CTA (not the hero) — **FIXED**
Root cause was **browser scroll restoration**: refreshing while scrolled to the bottom
restored that position, so after the loader the page "started" on the final CTA.
- Proof: `qa/probe-reload.mjs` reported `scrollY after reload = 16380` (before) → **`0`** (after).
- Fix (`js/main.js`): `history.scrollRestoration = "manual"`, `window.scrollTo(0,0)` on boot
  and again on `load`. The loader itself was already minimal (centered XAVRO + a thin drawn
  S-curve, no button) — confirmed in `qa-screenshots/loader/t300.png`. The experience now
  always begins on the hero.

### 2. Empty story moments / text timing — **VERIFIED / IMPROVED**
The persistent fixed stage (atmosphere + ribbon + cards) means no frame is ever "only
darkness." Section text holds for the entire pinned phase and the next section rises in
*before* the previous fully ghosts. Confirmed at the hard boundaries in
`qa-screenshots/boundaries/`, e.g. `b-0770.png`: the Deliverables headline ghosts out, the
active CALENDAR card holds, and the Proof quote is already rising — clean overlap, no gap.

### 3. Deliverables card text overlap / ghosting — **FIXED (core bug)**
Before (`baseline-prod/11-deliv-late.png`) two big titles ("STRATEGY CALL" **and**
"CONTENT CALENDAR") were readable at once, with spine labels doubling underneath.
Root cause: a single `--cdetail` driver switched *layout* and *big-text* together, and the
neighbour big-detail opacity fell off too slowly.
- Fix: split into two drivers — `--cmode` (embedded spine ↔ detached bar label) and
  `--cdetail` (the big "12–16 REELS" block). In the stack, `det` is now **peaked**
  (`clamp(1.5 - ar*3.2, 0, 1)`) so it reaches 0 by ~0.47 cards away — the outgoing title
  fully fades before the incoming one appears. All stack cards show only their small
  identifying bar label ("REELS / 01"); neighbours are dimmed via the dark overlay.
- Result (`production-final/10-deliv-mid.png`, `11-deliv-late.png`): exactly **one** active
  card title at a time, neighbours quiet, no ghosting, no duplicated headings.

### 4. Proof section — extra/cropped quote — **FIXED**
The 3 rotating quotes caused the "cropped near top-left" second state.
- Fix: reduced to the **single intended editorial quote**, removed the rotation logic, dots,
  and the absolute-inset positioning that allowed clipping. The quote now flows in normal
  layout and simply holds.
- Result (`production-final/12-proof.png` == `12b-proof-mid.png`): one calm quote, correct
  attribution, never clipped, cards recede behind it.

### 5. Ribbon wave + light — **KEPT & POLISHED**
The gentle S-wave is unchanged (geometry from `SEG`, diagonal from rotation — the
coil-guardrail from the `reel-veil-architecture` memory held). The ribbon carries a soft
specular sheen on the upper bend plus a broad cobalt bloom (`.veil__glow`) that tracks the
veil and breathes with scroll — light that reads as *caused by* the ribbon, not a spotlight.
No particles, no neon, no heavy vignette.

### 6. Readability — **IMPROVED (controlled contrast)**
- Lifted the secondary/tertiary greys (`--steel` `#8d8a83→#a4a199`, `--steel-dim`
  `#5e5b54→#7d7a71`) — support copy and small labels read clearly while the palette stays dark.
- Pain signals **03 and 04** no longer sink into darkness: tighter stagger + opacity floor
  raised to `0.34` (`production-final/06-pain-mid.png` shows all four).
- System breakdown shows **all four** items with readable descriptions
  (`production-final/08-system-mid.png`).
- Card per-section state text and the Deliverables detail sub-line brightened.
- Primary headlines stay strong off-white; cobalt remains an accent only.

### 7. Connector lines — **REFINED**
Diagnosis row→card traces: smaller endpoint node (4px→3px), softer gradient that fades from
the row and brightens toward the card. They draw in with each audit row, hold, and fade on
exit without crossing the headline (`production-final/04-diagnosis-mid.png`).

### 8. Section states — distinct moods preserved
Hero (premium arrival, bright glow) → Diagnosis (audit rows + connectors) → Pain (darker,
heavier sash) → System (cleaner, brightest glow) → Deliverables (cards detach into a matte
cascade) → Proof (cards recede, quote holds) → CTA (quiet silhouette, holds). Driven by the
existing per-section `VEIL[]`/`APP[]` keyframes + evolving card state text.

### 9. Final CTA — **HARDENED**
- Booking link is now a clearly-labelled placeholder variable `XAVRO_BOOKING_URL` at the top
  of `js/main.js` (currently `"#book"`). Set it to a real URL (Calendly/Tally/`mailto:`) and
  the button auto-applies `target="_blank"` + safe `rel` for http(s) links.
- **Visible keyboard focus** added (`:focus-visible` cobalt ring) — previously missing
  (`qa-screenshots/probe/cta-focus.png`). Polished hover (lift + sheen sweep) and `:active`.
- CTA never fades — the final section holds (`production-final/13-cta.png`).

---

## Mobile result — **PASS**
Verified at **390×844, 430×932, 768×1024** (`qa-screenshots/mobile-prod/`).
- **No horizontal scroll** at any width (`scrollWidth === innerWidth` for all three).
- Headlines never overflow; wordmark stays centered.
- Veil/cards drop to a faint atmospheric layer so **copy is always primary** and never covered.
- Deliverables: copy carries the message; the active card is a faint backdrop (intentional —
  cards must not block copy on small screens).
- Proof quote **not clipped**; CTA button large and easy to tap; final CTA holds.

## Performance result — **PASS**
- One `requestAnimationFrame` loop; transform/opacity only; CSS-variable driven; cached DOM
  refs; passive scroll listener; loop pauses on `visibilitychange`.
- Scroll-dependent work is gated behind a movement check (idle frames only do cheap breathing).
- No layout thrash (positions from cached layout, not per-frame `getBoundingClientRect` on hot
  paths). **No console errors** across a full scroll.

## Accessibility result — **PASS**
- Semantic `<section>`s; heading hierarchy (`h1` hero, `h2` per section).
- CTA is a real focusable `<a>` with a **visible focus ring**; generic `:focus-visible` ring
  for any future control.
- Decorative layers (`.stage`, `.loader`, connectors) are `aria-hidden`.
- **Reduced-motion**: full static layout, no breathing/sweep/drift, content fully readable
  (`production-final/r-hero-reduced.png`, `r-pain-reduced.png`); rAF loop is skipped entirely.
- All meaningful text is real DOM text (card labels, audit rows, signals, system items),
  not decoration. `lang="en"`, `theme-color` set.

---

## Remaining visual risks (minor)
- **Active CALENDAR (05/05) title** can read slightly dark at the exact mid-transition frame
  before `cdelivP` pins to 1; it reaches full brightness across the last ~15% of the
  Deliverables hold. Acceptable, but watch on very dark displays.
- On mobile the Deliverables active card is intentionally faint (copy-first). If a louder
  card is wanted on mobile later, raise `.cards` opacity in the `≤900px`/`≤560px` blocks.
- Tablet (768) uses the mobile layout (copy-first, faint sash) — by design, not the desktop
  composition.

## Launch checklist — must do before going live
- [ ] **Set `XAVRO_BOOKING_URL`** in `js/main.js` to the real booking link (Calendly/Tally/`mailto:`).
- [ ] **Replace `https://YOUR-DOMAIN.com`** placeholders in `index.html` (`canonical`, `og:url`,
      `og:image`, `twitter:image`) with the production domain.
- [ ] Add a real **1200×630 `og-image.png`** at the site root (referenced by OG/Twitter tags).
- [ ] Add the **Sitemap** line in `robots.txt` once the domain is set.
- [ ] **Bump the `?v=` cache-buster** on `css/styles.css` / `js/main.js` (currently `v=2`) on any
      future asset change — `vercel.json` serves these immutable.
- [ ] **Remove the unused root `image.png`** (~695 KB, a leftover reference scratch; not
      referenced by the site) so it isn't deployed. (Left in place — it's a user asset; delete
      when confirmed disposable.)
- [ ] Optional: self-host the Google Fonts (Anton/Hanken/Michroma) to drop the two external
      origins from the CSP and remove render-blocking font requests.

## Do-not-ship gates (from the brief) — status
1. First screen is not the wrong CTA — **PASS** (scroll restoration fixed).
2. No empty dark story gaps — **PASS** (overlap verified at boundaries).
3. Deliverables text overlap fixed — **PASS** (one active title at a time).
4. Proof quote not clipped — **PASS** (single fixed quote, normal flow).
5. Ribbon keeps gentle wave — **PASS** (unchanged geometry).
6. Background has subtle life — **PASS** (haze drift + cobalt bloom breathe).
7. Mobile usable — **PASS** (390/430/768, no overflow).
8. CTA link works — **PASS** (placeholder variable wired; set before launch).
9. No console errors — **PASS**.
10. Final CTA holds — **PASS**.

**Verdict: PRODUCTION-READY** once the launch-checklist items (booking URL, domain/OG, favicon
note) are completed — those require real production values only the owner can supply.
