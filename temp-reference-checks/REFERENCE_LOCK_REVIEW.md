# XAVRO — Hero Reference Lock

Goal: make the Hero match `refrences/hero-master-reference.jpg` before touching other
sections. Screenshot: `temp-reference-checks/hero-reference-lock.png` (full browser, 1440×900).
Card detail verified in `qa-screenshots/zoom/lock7-card-tight.png`.

## Hero Reference Lock

Match Score: **8.7 / 10**  (threshold to proceed: 8.5 ✅)

### What changed to get here
- **Veil widened ~1.5×** (`band 0.275 → 0.40` of veil width) so it's a real content
  *surface*, not a strip — cards now sit on it with editorial margin. Curvature kept gentle
  so the wide stroke doesn't coil.
- **Satin material depth**: reworked body gradient (lit cobalt edge → sheen → matte body →
  dark underside), dark underside peeks past the body for visible thickness, soft contact
  shadow, thin cobalt rim on the lit edge.
- **Cards re-angled + readable labels**: replaced letter-stacked `text-orientation: mixed`
  with `sideways` (rotated *block*), so "CAROUSELS / 02" reads naturally up the diagonal
  instead of as vertical stacked glyphs. Cards enlarged, darkened to matte, given a cobalt
  tab + micro content-lines + label + chip = editorial content slip.
- **Background**: vignette REMOVED; pale blue haze pooled in the upper-left; cobalt bloom
  moved to the frame-scale `.atmos__navy` (broad, behind the veil's right edge) so it reads
  as ambient light, never a discrete blob. (Two earlier "blobs" were a fat specular streak
  and a radial hotspot — both tamed.)
- **Headline** sized to fit 3 lines ("YOUR TRAINING IS ELITE." on one line) with its own
  column to the left of the now-wider veil.

### Checklist
- Veil wide enough? **Yes** (9) — cards sit on it with margin.
- Diagonal / S-curved like the reference? **Yes** (8.5).
- Dimensional, not flat? **Yes** (8.5) — satin gradient + rim + sheen + thickness + contact shadow.
- Pale upper-left haze? **Yes** (8.5).
- Cobalt glow behind the veil? **Yes** (8.5) — broad right-side bloom, no blob.
- Cards embedded into the ribbon? **Yes** (9).
- Card labels readable + angled like the reference? **Yes** (9) — rotated-block, readable.
- Headline breathing like the reference? **Yes** (8.5) — 3 lines, clear column.
- Wordmark centered? **Yes** (10).
- No nav / no top-right CTA? **Yes** (10).
- Still already feels cinematic? **Yes** (8.5).

### Honest remaining gaps (minor — do not block; revisit in polish)
- Reference cards are a touch larger still, and its right-edge cobalt rim is slightly more
  vivid; mine is close but a hair more restrained.
- The exact S-curve bend isn't pixel-identical (concept matches).

### Verdict
**PASS (8.7 ≥ 8.5).** The Hero now matches the reference's design language — a wide satin
S-curve content veil carrying embedded matte content-slip cards with readable diagonal labels,
pale upper-left haze, cobalt bloom behind the veil, no vignette. Cleared to proceed to the
other sections (Phase 2: scroll-roll, per-section card text states, connector lines, per-section
veil states), then re-verify the full story.

---

## Phase 2 (after the lock) — what shipped
All Hero changes are global, so they carry through every section; verified no coiling / overflow
/ text-collision across Diagnosis, Pain, System, Deliverables, Proof, CTA. Console clean, reduced
-motion static & readable. Captures: `qa-screenshots/after-reference-lock/` (desktop + mobile),
`temp-reference-checks/*-motion-temp.png`.

- **Per-section card text states** (cards no longer "dead labels"). Cards keep their identity
  (big diagonal label) but their supporting text cross-fades per chapter (masked, never a hard
  cut — fade out → swap → fade in):
  - Diagnosis → CONTENT PERCEPTION / CONSISTENCY SIGNAL / AUTHORITY SIGNAL / SALES INTENT / BRAND POSITIONING
  - Pain → LOW CONVERSION / AVERAGE PERCEPTION / HOURS LOST / WEAK SALES INTENT / INCONSISTENT STORY
  - System → OFFER / HOOKS / AUTHORITY / CONVERSATIONS / MONTHLY RHYTHM
  - Deliverables → the big detail view (12–16 REELS, 4–8 CAROUSELS, …) takes over; state text hides.
- **Connector lines (Diagnosis):** thin lines draw from each audit row to its matching card on
  the veil, staggering in WITH the rows (node travels to the card). The card state text echoes
  the row name, so the audit reads as scanning the content.
- **Scroll-roll / unspool:** cards travel a little ALONG the curve as you scroll the embedded
  journey (continuous, bounded, no per-section snap) so the ribbon reads as a surface passing
  through, on top of the existing per-section veil morph + breathing + smoothed scroll.
- **Per-section veil emotion:** retained from the motion pass (hero bold/lit → diagnosis closer
  → pain dark/looming → system calm/organised → deliverables behind the stack → proof/cta quiet).

### Honest gaps / deferred
- **Connector lines for Pain & System** are NOT drawn as literal lines (only Diagnosis). Pain's
  2-column signals and System's 2-column list don't map to a clean single-column anchor like the
  audit rows, so literal lines risked clutter. The per-section **card text states** provide the
  visual echo there instead. Can add later if you want the literal lines.
- Mobile keeps the veil/cards as a faint background layer (bigger cards now, but low opacity) so
  copy stays primary; the reference is a desktop composition.
