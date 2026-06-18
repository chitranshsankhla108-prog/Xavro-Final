# XAVRO — Visual Review (Correction Pass)

Focused correction pass on the existing site. No rebuild, no new concept, no section
re-order. Goal: one continuous cinematic editorial story where text holds long enough to
read, the veil is the main object, and the cards are born inside the veil before detaching.

Screenshots: `qa-screenshots/baseline` (before) vs `qa-screenshots/pass3`, plus
`qa-screenshots/bounds` (section transitions), `qa-screenshots/loader`, `qa-screenshots/zoom`.
Capture scripts live in `qa/` (Playwright). Run a static server then `node qa/shoot.mjs <name>`.

---

## What changed

- **Veil geometry (FIX 4 / 5).** `js/main.js` `SEG` centerline rebuilt as a gentle near-vertical
  S (amplitude ~±0.09). The diagonal sash now comes from the veil's rotation, not from
  overshooting control points — so the thick ribbon no longer coils back on itself. Ribbon
  band, rim/under/sheen/shadow offsets retuned for a wide matte surface with a lit left edge.
- **Cards (FIX 6 / 7).** Markup in `index.html` now carries a vertical **spine label**
  (embedded mode, reads bottom-to-top via `writing-mode`) and a horizontal **bar + detail**
  (detached mode). Cards are larger, brighter, and ride the live ribbon (rotation + depth).
  Three modes: embedded (Hero→System), detached (Deliverables stack), receding (Proof/CTA).
- **Text lifetime + overlap (FIX 1 / 2 / 3).** Reveal is now driven by each sticky inner's
  `getBoundingClientRect().top` (`--rv` enter, `--gx` ghost) instead of a tiny scroll range.
  Text enters on the rise, **holds for the entire pinned phase**, and ghosts only to ~10% as it
  unpins — which overlaps the next section already rising in. List rows stagger on `--pp`
  (pinned progress). Editorial cut reveal: clip-path + blur + translate + scaleX + a subtle
  light wipe across headlines.
- **Pacing (FIX 11).** Section heights set to 200/240/310/260/450/240/220 svh.
- **Deliverables (FIX 8).** Cards detach into a readable center-right stack (active forward,
  neighbours dimmed), with a thin connector (`#vlink`) from the active card back to the veil.
- **Proof / CTA (FIX 10).** Cards recede onto a calm veil; the final CTA never ghosts
  (`--gx` forced 0 for the last section) — it settles and holds.
- **Loader (FIX 9).** Rebuilt as a drawn SVG S-curve with a traveling cobalt light and matte
  mini slips that settle on the curve; on hand-off it drifts toward the hero veil behind it.

## Screenshots reviewed
Hero, Diagnosis, Pain, System, Deliverables (start/mid/late), Proof (entry/mid), CTA;
section boundaries; loader frames; mobile hero/deliverables/CTA (390×844).

## What works
- Veil reads as one wide cinematic S-curve sash, not a loop or a thin strip.
- Card spine labels are legible and follow the curve; cards feel embedded before Deliverables.
- Deliverables cards visibly detach from the same embedded cards into a multi-card stack.
- Text holds long enough to read; no empty/black moments at any section boundary.
- CTA settles and holds; loader hands off into the hero veil.
- No console/page errors across a full scroll. Mobile readable, no horizontal overflow.

## What does not work / deferred
- Diagnosis card→audit annotation lines from the reference are not drawn (kept the cleaner
  left-rows layout to avoid clutter); the single Deliverables connector is implemented.
- Proof keeps the existing 3 rotating quotes (existing content) rather than a single quote.

## Pass / Fail
**PASS** — veil is a wide S-curve carrying the cards, cards embed then detach in Deliverables,
text holds with overlap, loader connects to the hero, and the CTA holds at the end.

---
---

# Current Visual Audit Before Fixes
_(Correction pass 2026-06-17. Screenshots: `qa-screenshots/current-audit/` desktop 1440×900 +
mobile 390×844; zooms in `qa-screenshots/zoom/audit-*`. Compared frame-by-frame against
`refrences/hero-master-reference.jpg` (master) + diagnosis/pain/system/deliverables refs.)_

**Note on the references:** the per-section reference images show *different* card labels per
section (Pain = POST/REEL/CAPTION/DM bars; System = OFFER/HOOKS/REELS/AUTHORITY/CALENDAR
diagram). The brief overrides this: **one set of 5 cards (REELS…CALENDAR) transformed through
modes — never new cards per section.** So the references are read for *mood, ribbon shape, card
embedding/detach style*, NOT literal per-section card content. The audit judges accordingly.

### 01-hero  (vs hero-master-reference — the master)
- **What works:** matte dark cards embedded on a curved ribbon; cobalt glow right + top-left
  haze present; headline left in Anton holds and reads; no glass.
- **What fails:** the ribbon is too **narrow and too vertical**, hugging the right ~40% — it
  reads as a right-side strip, not the master's **bold wide diagonal sash** sweeping from the
  top-right corner down across toward lower-centre. Top card (CALENDAR) is pushed off the
  top-right edge so only ~4 cards read. Embedded spine labels are **small and low-contrast**
  vs the master's large, bright diagonal labels.
- **Priority fix:** widen the ribbon band + raise hero rotation for a bolder diagonal + pull
  the veil slightly toward centre-right so all 5 cards sit on screen; enlarge/brighten the
  embedded spine label. **(P1)**

### 03 / 04 diagnosis
- **Works:** headline holds while audit rows stagger in; ribbon present carrying cards.
- **Fails:** no connector lines from the audit rows to the cards (the reference's "report"
  feel). Ribbon still narrow/vertical. Cards dim but spine labels hard to read.
- **Priority fix:** inherit the P1 veil widening + label legibility. Connector lines are
  *optional* (deferred last pass to avoid clutter) — leave unless cheap. **(P2)**

### 05 / 06 pain
- **Works:** headline + 2-column signals hold and read; veil darkens (heavier mood matches the
  pain reference); cards dim but stay.
- **Fails:** veil reads narrow; embedded labels low-contrast. (Reference's standing-bar look is
  intentionally not literal — fine.)
- **Priority fix:** P1 veil + label only. **(P2)**

### 07 / 08 system
- **Works:** headline holds, 2×2 system list staggers in; veil calmer/brighter glow.
- **Fails:** at the settled frame the ribbon is the most diagonal/best-looking of the embedded
  phases — but embedded card labels are still small/dim. No "organised diagram" connectors
  (acceptable per brief — same 5 cards, not the reference's OFFER/HOOKS diagram).
- **Priority fix:** P1 label legibility. **(P2)**

### 09–11 deliverables (most important section)
- **Works:** cards genuinely **detach** from the embedded positions into a center-right stack;
  active card lifts forward and is fully readable (CAROUSELS → 4–8 CAROUSELS, STRATEGY CALL,
  CONTENT CALENDAR); ticker counts 01→05; neighbours stay visible. Headline holds left.
- **Fails:** dimmed neighbour cards read slightly **glassy/translucent** (ribbon + glow show
  through) — brief says matte. Stack is a touch **small & cramped** vs the master deliverables
  reference's large overlapping cascade. 09-deliv-start (~0.52) catches the prev headline
  ghosting while the stack is mid-detach — borderline thin moment but the detach itself carries it.
- **Priority fix:** make dimmed cards more opaque/matte; enlarge the stack + spread it a little. **(P1)**

### 12 proof
- **Works:** big quote holds and reads; cards recede to a calm veil on the right; attribution clear.
- **Fails:** nothing significant. (3 rotating quotes kept — existing content.)
- **Priority fix:** none. **(PASS)**

### 13 cta
- **Works:** XAVRO wordmark + one line + button + micro line; **settles and holds, no fade-out**;
  veil a quiet silhouette behind-right. Matches the brief exactly.
- **Priority fix:** none. **(PASS)**

### mobile (hero / pain / deliverables / cta)
- **Works:** headlines readable, no horizontal overflow; CTA clean and holds.
- **Fails:** on hero/pain/deliverables the veil **cards sit on top of / behind the copy and
  compete with it** (e.g. m-deliv: the 4–8 CAROUSELS card overlaps the headline; m-pain: card
  spines cross the signal text). Feels cluttered, not premium.
- **Priority fix:** push the veil further off-canvas right and/or drop card opacity more on
  small screens so copy is clean. **(P1)**

### Checklist verdict
1. Hero matches master? **Partly** — concept yes, ribbon too narrow/vertical. (P1)
2. Veil a wide S-curve ribbon or a strip? **Leans strip** — widen + more diagonal. (P1)
3. Cards embedded before Deliverables? **Yes.**
4. Cards matte not glass? **Embedded yes; deliverables dimmed cards slightly glassy.** (P1)
5. Cards readable enough? **Active/detail yes; embedded spine labels too small/dim.** (P1)
6. Text stays long enough? **Yes** — holds across each pinned phase.
7. Empty story moments? **No real dead frames**; one borderline at sys→deliv handoff.
8. Deliverables detach from the veil? **Yes** — the strongest section.
9. CTA settles and holds? **Yes.**
10. Mobile premium & readable? **Readable but cluttered by cards over copy.** (P1)

### Fix plan (this pass) — smallest changes, screenshot after each
- **P1-A Veil:** widen ribbon band (`updateRibbonWidths`), raise hero/embedded rotation +
  pull centre-right (`VEIL[]`), so it's a bold wide diagonal sash on screen with all 5 cards.
- **P1-B Embedded labels:** enlarge + brighten `.card__sp-label` / spine.
- **P1-C Deliverables cards:** more opaque/matte dimmed cards; enlarge + spread the stack.
- **P1-D Mobile:** shift veil further right + lower card opacity so copy is clean.
- Geometry guardrail (from `reel-veil-architecture` memory): keep the `SEG` S **gentle**
  (amplitude ±0.09); get the diagonal from **rotation**, never control-point overshoot, or the
  thick stroke coils into a loop.

---
---

# After Fixes Review
_(Screenshots: `qa-screenshots/after-fixes/` desktop + mobile; zoom `qa-screenshots/zoom/af-*`,
`wip1-hero-cards`. Console: `node qa/console.mjs` → **ERRORS: none** across a full scroll.)_

### What changed (this pass)
- **Veil (`js/main.js`).** Ribbon band widened `0.235 → 0.275` of veil width — a noticeably
  **more massive matte sash**. `VEIL[]` rotations raised for a bolder diagonal and the embedded
  phases pulled slightly centre-right: hero `vrot 20→27 / vx 14→12 / scale 1.02→1.06`,
  diagnosis `13→19`, pain `7→12`, system `15→22` (glow/dark untouched). `SEG` centerline left
  alone — diagonal comes from rotation only, so no coil (guardrail held).
- **Embedded card legibility (`css/styles.css`).** `.card__sp-label` enlarged
  (`1.3–1.9rem → 1.55–2.35rem`) with a soft text-shadow; `.card__sp-num` brighter (cobalt-ice,
  700). Card gradient top-left lifted + border brightened so labels read off the dark ribbon.
- **Deliverables cards (`stack()` in `js/main.js`).** Neighbours now stay **matte/opaque**
  (element-opacity floor `0.16 → 0.6`) and recede via the dark overlay instead of going
  see-through; active scale `1.14 → 1.22`, cascade spread/size increased.
- **Mobile (`css/styles.css`).** Veil/cards dropped to a faint background layer
  (`<900`: cards `0.45→0.30`; `<560`: veil `0.35→0.30`, cards `0.30→0.20`) so copy is always
  primary and cards no longer compete with the text.

### Section-by-section
| Section | Improved | Still imperfect | Verdict |
|---|---|---|---|
| Hero | Bold wide diagonal sash; all 5 cards on screen + labels legible; matches master | Bottom card (STRATEGY) runs off lower edge — intentional, matches ref | **PASS** |
| Diagnosis | Wider ribbon carrying cards; headline holds while audit rows stagger | Reference's card→row connector lines still not drawn (deferred, avoids clutter) | **PASS** |
| Pain | Heavier/darker looming sash; signals hold; labels still readable when dim | Standing-bar look intentionally not literal | **PASS** |
| System | Most diagonal embedded frame; 2×2 list staggers; labels legible | OFFER/HOOKS diagram not literal (same 5 cards per brief) | **PASS** |
| Deliverables | Cards detach into a larger **matte** cascade; active forward + readable; ticker 01→05; no see-through | Faint detail bleed on neighbour cards (subtle) | **PASS** |
| Proof | Quote holds; cards recede onto a calm veil right | — | **PASS** |
| CTA | Wordmark + line + button + micro; **settles, never fades**; quiet veil silhouette | — | **PASS** |
| Mobile | Copy clean & primary; cards a premium faint layer; no overflow; CTA holds | Cards faint by design on small screens | **PASS** |

### Checklist verdict (after)
1. Hero matches master? **Yes** — wide bold diagonal sash with embedded cards.
2. Wide S-curve ribbon vs strip? **Yes** — widened band + bolder rotation.
3. Cards embedded before Deliverables? **Yes.**
4. Cards matte not glass? **Yes** — deliverables neighbours no longer see-through.
5. Cards readable? **Yes** — bigger/brighter spine labels + active detail.
6. Text holds long enough? **Yes.**
7. Empty story moments? **No** — sys→deliv handoff carried by ghost headline + detaching card.
8. Deliverables detach from veil? **Yes** — strongest section.
9. CTA settles and holds? **Yes.**
10. Mobile premium & readable? **Yes** — copy primary, cards faint.

### Overall: **PASS**
The veil reads as one massive matte S-curve sash carrying the 5 cards through Hero → Diagnosis →
Pain → System, the cards detach into a matte cascade in Deliverables, then recede for Proof/CTA —
one continuous brand film, not text sections with a decorative shape. No console errors; desktop
and mobile both hold.

### Not done (intentional, would need sign-off)
- Diagnosis/System reference **connector-line diagrams** (kept the cleaner layout per the last
  pass's note to avoid clutter; brief mandates the same 5 cards, not per-section card sets).
- Proof keeps the **3 rotating quotes** (existing content) rather than a single fixed quote.
