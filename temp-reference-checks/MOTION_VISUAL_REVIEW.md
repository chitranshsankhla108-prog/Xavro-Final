# XAVRO — Motion & Atmosphere Pass Review

Focused motion/atmosphere correction. No redesign, no copy change, no new sections, no
particles. Captures via `node qa/motion-temp.mjs` (full-browser, 1440×900, settled states).
Motion that a still can't show is evidenced by `motion-proof-a.png` vs `motion-proof-b.png`
(same scroll position, 6s apart — the veil + cards have drifted/breathed).

## What changed (engine)
- **Continuous rAF loop with smoothed scroll** (`js/main.js`). The old engine only rendered
  *on scroll* (so it was dead when idle). Now a persistent loop eases `currentY` toward the
  real scroll (`lerp 0.085`) for a premium heavy scroll, and drives `performance.now()` sine
  waves: `--veil-breathe`, `--veil-drift`, `--glow-pulse`. Idle frames only do the cheap
  breathing work (scroll-dependent recalcs are gated behind a "moved" check); the loop pauses
  on `visibilitychange`. Per-frame `getBoundingClientRect` was removed (computed from cached
  layout instead) — less layout thrash than before.
- **Veil is alive** (`css/styles.css`). Its transform now adds a tiny architectural
  breathe/float (scale ±0.012, rotate ±0.22°, drift ±9px) on top of the scroll pose; the
  cobalt glow breathes (scale + opacity); a **specular glint travels the lit edge** (SVG
  `#ribbonSpecPath`, 12s loop, soft cobalt, screen blend — "light on satin", not neon).
- **Atmosphere has depth + movement.** Richer blue-black base with a cobalt radial behind the
  veil; the top-left haze is now a **drifting "ray of light"** (24s ease loop); grain set to
  `soft-light` so it sits into the surface; vignette softened + biased to bottom/right.
- **Cards inherit the veil's life** — they breathe/float with it when embedded (`life=1`) and
  barely move once detached in Deliverables (`life=0.3`), so they read as sitting *on* the
  surface, not pasted over it.
- **Reduced-motion**: the rAF loop is skipped entirely (static veil, no breathing/sweep/haze
  drift), text fully readable, quotes still sync. Verified: 2 frames 3s apart are identical.

Console: `node qa/console.mjs` → **ERRORS: none** across a full scroll.

---

### Hero State
Screenshot: hero-motion-temp.png  · Reference: hero-master-reference.jpg
Motion Score: **9/10** · Atmosphere Score: **9/10** · Veil Life Score: **8.5/10**
What improved:
- Wide diagonal sash breathes/floats; edge catches a slow cobalt glint; glow breathes behind it.
- Background reads deep and dimensional (cobalt mass behind veil + drifting top-left ray), not a flat gradient.
- Cards drift subtly with the veil (see motion-proof a/b) — they feel attached to the surface.
What still feels static:
- The glint is intentionally subtle; on a bright LCD it can be easy to miss in a freeze-frame.
Fix before continuing: none.

### Diagnosis State
Screenshot: diagnosis-motion-temp.png · Reference: diagnosis-reference.png
Motion Score: **8.5/10** · Atmosphere Score: **8.5/10** · Veil Life Score: **8.5/10**
What improved:
- Veil eases closer + keeps breathing while the audit rows hold; glow narrows/cools toward the diagnostic mood.
What still feels static:
- No literal row→card connector lines (deferred; brief mandates the same 5 cards, not the reference's per-section set).
Fix before continuing: none.

### Pain State
Screenshot: pain-motion-temp.png · Reference: ain-reference.jpg
Motion Score: **8.5/10** · Atmosphere Score: **9/10** · Veil Life Score: **8.5/10**
What improved:
- Veil darkens + looms; glow goes colder/sharper; vignette heavier — controlled tension, not chaos.
- Headline holds fully (enter→hold), signals readable; the breathing keeps it from feeling frozen.
What still feels static:
- Sweep dims here by design (`opacity - vdark`), so the edge glint is quieter in Pain.
Fix before continuing: none.

### System State
Screenshot: system-motion-temp.png · Reference: system-reference.jpg
Motion Score: **8.5/10** · Atmosphere Score: **8.5/10** · Veil Life Score: **8.5/10**
What improved:
- Veil smooths/stabilises to its cleanest pose; glow broadens/calms; the 01–04 list holds while the surface keeps breathing — "scattered → structured".
What still feels static:
- Organised flow-diagram connectors from the reference not drawn (same brief reason as Diagnosis).
Fix before continuing: none.

### Deliverables State
Screenshot: deliverables-motion-temp.png · Reference: deliverables-reference.jpg
Motion Score: **9/10** · Atmosphere Score: **8.5/10** · Veil Life Score: **8/10**
What improved:
- Cards lift off the veil into a matte cascade; active REELS/01 forward + readable; veil stays behind as the origin and the breathing damps so detached cards feel physically lifted (not floating loosely).
What still feels static:
- Veil sweep recedes behind the stack (correct), so its life is felt more than seen here.
Fix before continuing: none.

### Proof State
Screenshot: proof-motion-temp.png · Reference: (calm editorial hold)
Motion Score: **8.5/10** · Atmosphere Score: **8.5/10** · Veil Life Score: **8/10**
What improved:
- Cards recede toward the veil; glow drops; atmosphere opens up and calms; quote holds. Breathing is barely-there here, which is right for the calm-down.
Fix before continuing: none.

### CTA State
Screenshot: cta-motion-temp.png · Reference: (final lock / stillness)
Motion Score: **8.5/10** · Atmosphere Score: **8.5/10** · Veil Life Score: **8/10**
What improved:
- Veil settles to a quiet right-side silhouette that *barely* breathes; glow calm; CTA settles and **holds — no fade-out**.
Fix before continuing: none.

---

## Verdict
Pass complete. The veil now **breathes, floats, catches a travelling cobalt rim glint, and
morphs emotionally per section**, the background is a moving cinematic atmosphere (cobalt depth
+ drifting light ray + grain + soft vignette) rather than a flat dark gradient, and the cards
ride the surface before detaching in Deliverables. Verified alive even in stills via the
motion-proof pair; smoothed scroll gives premium weight; reduced-motion stays static and
readable; zero console errors.

Carried over (needs sign-off, not motion): reference-style **connector lines** for
Diagnosis/System. Still deferred because the brief mandates one consistent 5-card set rather
than the references' per-section cards, and they risk clutter.
