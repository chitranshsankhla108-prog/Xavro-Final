/* =================================================================
   XAVRO — lightweight client-side error capture
   Self-hosted, zero-dependency, runs before the engine so a broken
   scroll never fails silently. Inspect captured errors in DevTools
   via window.__xavroErrors. To forward to a collector later, POST the
   payload inside report() to your endpoint (and add it to connect-src).
   ================================================================= */
(function () {
  "use strict";
  var MAX = 50;
  var store = (window.__xavroErrors = []);
  function report(kind, detail) {
    try {
      var payload = {
        kind: kind,
        message: detail && detail.message ? String(detail.message) : String(detail),
        source: (detail && detail.filename) || "",
        line: (detail && detail.lineno) || 0,
        col: (detail && detail.colno) || 0,
        stack: detail && detail.error && detail.error.stack ? String(detail.error.stack) : "",
        url: location.href,
        ua: navigator.userAgent,
        ts: new Date().toISOString()
      };
      if (store.length >= MAX) store.shift();
      store.push(payload);
      if (window.console && console.error) console.error("[XAVRO] " + kind + ":", payload.message, payload);
      // To ship errors to a collector, point this at your endpoint
      // (and add the origin to connect-src in vercel.json):
      // if (navigator.sendBeacon) navigator.sendBeacon("/__errors", JSON.stringify(payload));
    } catch (e) { /* the reporter must never throw */ }
  }
  window.addEventListener("error", function (e) {
    if (e && e.target && e.target !== window && (e.target.src || e.target.href)) {
      report("resource", { message: "Failed to load " + (e.target.src || e.target.href) });
    } else {
      report("error", e);
    }
  }, true);
  window.addEventListener("unhandledrejection", function (e) {
    var reason = e && e.reason;
    report("unhandledrejection", { message: reason && reason.message ? reason.message : reason, error: reason });
  });
})();

/* =================================================================
   XAVRO — Editorial Reel Veil engine
   One persistent visual stage driven by a single scroll → rAF loop.
   Transforms / opacity only. Cached refs. Passive listeners.
   ================================================================= */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* LITE = touch-primary device (iPad / iPhone / Android). On these, the GPU is far weaker
     than the desktop this was tuned on, and the continuous breathe loop re-rasterises blurred /
     blended / soft-shadowed full-screen layers every frame -> severe scroll lag (the iPad bug).
     In LITE mode we drop the continuous breathe and only spend frames WHILE the user is actually
     scrolling. The condition mirrors the CSS `@media (hover:none),(pointer:coarse)` block EXACTLY
     so JS and CSS can never disagree (a touch-primary device = coarse pointer / no hover). We
     deliberately do NOT use maxTouchPoints, which would mis-flag touch-screen laptops (real
     desktops with a mouse) as mobile. */
  var LITE = !REDUCED && (
    window.matchMedia("(hover: none)").matches ||
    window.matchMedia("(pointer: coarse)").matches
  );
  window.__XAVRO_LITE = LITE; /* exposed for QA introspection */

  /* SAFARI = desktop Safari (Mac). Real WebKit's GPU mishandles the veil's SVG <filter>
     feGaussianBlur on the wide ribbon strokes: the soft blur is dropped and the white glow
     stroke renders as a hard bright band (the "white line"), and re-rasterising those filters
     every breathe-frame lags. Headless WebKit (software raster) hides this, so it only shows on
     a physical Mac. We give desktop Safari a filter-free veil (CSS `.is-safari` block) + freeze
     the idle breathe (below). iOS Safari is already covered by LITE (veil hidden), so exclude it
     here. vendor==="Apple Computer, Inc." is true for Safari, false for Chrome/Firefox. */
  var SAFARI = !LITE && (
    navigator.vendor === "Apple Computer, Inc." ||
    /^((?!chrome|crios|fxios|android).)*safari/i.test(navigator.userAgent)
  );
  if (SAFARI) document.documentElement.classList.add("is-safari");
  window.__XAVRO_SAFARI = SAFARI; /* exposed for QA introspection */

  /* =====================================================================
     CTA TARGET — the site's only conversion action.
     ⚠️ BEFORE LAUNCH: set this to your real booking link, e.g.
        "https://calendly.com/xavro/strategy-call"  or  "mailto:hello@xavro.com".
     Left as "#book" it is a no-op placeholder (button still focus/hover works).
     An http(s) URL automatically opens in a new tab with safe rel attributes.
     ===================================================================== */
  var XAVRO_BOOKING_URL = "#book";

  /* ---------- cached DOM ---------- */
  var body    = document.body;
  var loader  = document.getElementById("loader");
  var veil    = document.getElementById("veil");
  var veilSvg = document.getElementById("veilSvg");
  var rbGlow   = document.getElementById("ribbonGlowPath");
  var rbShadow = document.getElementById("ribbonShadowPath");
  var rbUnder  = document.getElementById("ribbonUnderPath");
  var rbBody   = document.getElementById("ribbonBodyPath");
  var rbSheen  = document.getElementById("ribbonSheenPath");
  var rbRim    = document.getElementById("ribbonRimPath");
  var rbSpec   = document.getElementById("ribbonSpecPath");
  var cardEls = Array.prototype.slice.call(document.querySelectorAll("#cards .card"));
  var stateEls = Array.prototype.slice.call(document.querySelectorAll("#cards .card__state"));
  var vlink   = document.getElementById("vlink");
  var dlinks  = Array.prototype.slice.call(document.querySelectorAll(".dlink"));
  var auditRows = Array.prototype.slice.call(document.querySelectorAll("#diagnosis .audit__row"));
  var sectionEls = Array.prototype.slice.call(document.querySelectorAll("[data-section]"));
  var inners  = sectionEls.map(function (s) { return s.querySelector(".section__inner"); });
  var ticker  = document.querySelector("#delivTicker .ticker__cur");
  var bookBtn = document.getElementById("bookBtn");

  /* section phase indices */
  var IDX = { hero: 0, diagnosis: 1, pain: 2, system: 3, deliverables: 4, cta: 5 };
  var LAST = sectionEls.length - 1;

  /* ---------- viewport ---------- */
  var vw = window.innerWidth, vh = window.innerHeight;

  /* Live SVG user-space size (px). SAFARI FIX: the veil SVG now uses a viewBox that exactly
     matches its pixel box (1 user unit = 1 px, UNIFORM scale) instead of viewBox="0 0 1000 1500"
     + preserveAspectRatio="none". The old non-uniform stretch forced `vector-effect:
     non-scaling-stroke` on the wide ribbon strokes, which WebKit's GPU compositor mis-rasterises
     (the dark body band drops out, leaving only a bright edge — the Safari-only bug). With a 1:1
     viewBox the strokes are plain, uniformly scaled, and render identically on every engine.
     Paths + userSpaceOnUse gradients are rebuilt into this px space each measure(), so the
     on-screen geometry is byte-for-byte the same as before — only the rendering path is safer. */
  var VBW = 1000, VBH = 1500;

  /* ---------- layout (document-space starts + heights) ---------- */
  var starts = [], fulls = [], ranges = [];
  function measure() {
    vw = window.innerWidth; vh = window.innerHeight;
    var sy = window.pageYOffset;
    starts = []; fulls = []; ranges = [];
    for (var i = 0; i < sectionEls.length; i++) {
      var r = sectionEls[i].getBoundingClientRect();
      starts[i] = r.top + sy;
      fulls[i]  = sectionEls[i].offsetHeight;
      ranges[i] = Math.max(1, fulls[i] - vh);
    }
    starts[sectionEls.length] = starts[LAST] + fulls[LAST]; /* sentinel */
    syncVeilSpace(); /* size the SVG user space to px + rebuild paths/gradients/widths */
    lastSY = -1; /* force a full scroll-dependent recompute next frame after any relayout */
    lastRenderedY = NaN; /* LITE: force the next frame to re-place cards after a relayout/rotate */
  }

  /* ---------- math helpers ---------- */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); }

  /* ---------- keyframes ---------- */
  /* Veil pose is now FIXED (no rotation swing) — the ribbon does not rotate between sections;
     instead the CONTENT rolls down it (see gRoll). Only glow/darkness change per section for
     emotion, with a slight recede right at the very end. */
  var VEIL = [
    { vx: 16, vy: 0, vrot: 29, vscale: 1.06, vglow: 0.80, vdark: 0.00 }, /* hero */
    { vx: 16, vy: 0, vrot: 29, vscale: 1.06, vglow: 0.64, vdark: 0.16 }, /* diagnosis */
    { vx: 16, vy: 0, vrot: 29, vscale: 1.06, vglow: 0.46, vdark: 0.55 }, /* pain: darker, heavier */
    { vx: 16, vy: 0, vrot: 29, vscale: 1.06, vglow: 0.90, vdark: 0.02 }, /* system: clean, calm glow */
    { vx: 18, vy: 0, vrot: 29, vscale: 1.06, vglow: 0.58, vdark: 0.08 }, /* deliverables: behind the stack */
    { vx: 24, vy: 4, vrot: 29, vscale: 0.96, vglow: 0.22, vdark: 0.60 }  /* cta: quiet silhouette */
  ];

  /* Base position of each card along the ribbon (0=top .. 1=bottom), DOM order
     REELS, CAROUSELS, CAPTIONS, STRATEGY, CALENDAR — evenly spaced so they form a
     continuous conveyor. At roll 0 this reads CALENDAR(top) -> STRATEGY(bottom) like the
     reference. Scroll increases gRoll, so every card's position rises -> the ribbon ROLLS
     DOWN, wrapping top<->bottom (with edge fades hiding the wrap). */
  var BASE = [0.25, 0.45, 0.65, 0.85, 0.05];
  var CARD_BASE = 1.0;

  /* Per-section supporting card text (DOM order: REELS, CAROUSELS, CAPTIONS, STRATEGY,
     CALENDAR). The cards keep their identity (the big spine label) but their supporting
     state text evolves through the story — scanned in Diagnosis, pained in Pain, organised
     in System. Hero/Deliverables/CTA show no state text (deliverables uses the big
     detail view instead). Keyed by phase index (1=diagnosis, 2=pain, 3=system). */
  var CARD_STATE = {
    1: ["Content Perception", "Consistency Signal", "Authority Signal", "Sales Intent", "Brand Positioning"],
    2: ["Low Conversion", "Average Perception", "Hours Lost", "Weak Sales Intent", "Inconsistent Story"],
    3: ["Offer", "Hooks", "Authority", "Conversations", "Monthly Rhythm"]
  };

  /* per-phase card APPEARANCE (geometry always comes from the live ribbon).
     Cards stay readable while embedded — dim, never disappear. */
  var APP = [
    { op: 0.96, dim: 0.06 }, /* hero */
    { op: 0.94, dim: 0.16 }, /* diagnosis */
    { op: 0.80, dim: 0.46 }, /* pain: dim but readable */
    { op: 0.96, dim: 0.06 }, /* system: clean */
    { op: 1.00, dim: 0.04 }, /* deliverables (stack overrides) */
    { op: 0.20, dim: 0.78 }  /* cta: quiet */
  ];

  /* ---- ribbon centerline: an organic "S" WAVE in normalized veil space (reference-lock).
     Two cubic segments form one full sine period: the top half bows to the RIGHT (peak near
     t=0.25) and the bottom half bows to the LEFT (trough near t=0.75) — the letter-S silhouette
     from hero-master-reference.jpg / diagnosis-reference.png. The control points are mirrored
     about the mid-join (x=0.50, y=0.50) so the two beziers meet tangent-continuous (C1) — no
     kink. The whole wave then rides the veil's fixed 29° rotation, so on screen it reads as a
     diagonal ribbon that snakes left↔right as it descends, with the cards riding the curve.
     AMP (~±0.11) is kept under the wide stroke's coil threshold so the band never self-pinches. ---- */
  var SEG = [
    [ { x: 0.500, y: -0.12 }, { x: 0.605, y: 0.09 }, { x: 0.605, y: 0.29 }, { x: 0.500, y: 0.50 } ],
    [ { x: 0.500, y: 0.50 },  { x: 0.395, y: 0.71 }, { x: 0.395, y: 0.91 }, { x: 0.500, y: 1.12 } ]
  ];
  function cubic(p, u) {
    var m = 1 - u;
    return {
      x: m*m*m*p[0].x + 3*m*m*u*p[1].x + 3*m*u*u*p[2].x + u*u*u*p[3].x,
      y: m*m*m*p[0].y + 3*m*m*u*p[1].y + 3*m*u*u*p[2].y + u*u*u*p[3].y
    };
  }
  function cubicD(p, u) {
    var m = 1 - u;
    return {
      x: 3*m*m*(p[1].x-p[0].x) + 6*m*u*(p[2].x-p[1].x) + 3*u*u*(p[3].x-p[2].x),
      y: 3*m*m*(p[1].y-p[0].y) + 6*m*u*(p[2].y-p[1].y) + 3*u*u*(p[3].y-p[2].y)
    };
  }
  function centerline(t) {
    var p, u;
    if (t < 0.5) { p = SEG[0]; u = t / 0.5; } else { p = SEG[1]; u = (t - 0.5) / 0.5; }
    var c = cubic(p, u), d = cubicD(p, u);
    return { x: c.x, y: c.y, dx: d.x, dy: d.y };
  }

  /* veil element size in px — must match CSS (.veil width min(86vw,1280px), height 150vh) */
  function veilSize() { return { w: Math.min(0.86 * vw, 1280), h: 1.50 * vh }; }

  /* ---- build the ribbon SVG (centerline + offset copies for material depth) ----
     Coordinates are emitted in the LIVE px user space (VBW x VBH). Because VBW/VBH equal the
     veil element's pixel box and the viewBox matches 1:1, multiplying the normalised curve by
     VBW/VBH yields the exact same on-screen position the old (×1000 / ×1500 then stretched)
     path produced — geometry-preserving, just without the non-uniform stretch. */
  function pathD(ox, oy) {
    function P(pt) { return ((pt.x + ox) * VBW).toFixed(1) + " " + ((pt.y + oy) * VBH).toFixed(1); }
    var s0 = SEG[0], s1 = SEG[1];
    return "M " + P(s0[0]) +
           " C " + P(s0[1]) + " " + P(s0[2]) + " " + P(s0[3]) +
           " C " + P(s1[1]) + " " + P(s1[2]) + " " + P(s1[3]);
  }

  /* userSpaceOnUse gradients were authored in the old 1000x1500 space; rescale their endpoints
     into the live px space so the satin shading + glow highlight stay in the same place. */
  var GRADS = {
    ribbonBody:     [180, 260, 900, 1180],
    ribbonGlowGrad: [120, 40,  760, 1360]
  };
  function rescaleGradients() {
    var sx = VBW / 1000, sy = VBH / 1500;
    for (var id in GRADS) {
      var g = document.getElementById(id); if (!g) continue;
      var c = GRADS[id];
      g.setAttribute("x1", (c[0] * sx).toFixed(1));
      g.setAttribute("y1", (c[1] * sy).toFixed(1));
      g.setAttribute("x2", (c[2] * sx).toFixed(1));
      g.setAttribute("y2", (c[3] * sy).toFixed(1));
    }
  }

  /* size the SVG user space to the element's px box, then rebuild everything that lives in it */
  function syncVeilSpace() {
    var sz = veilSize();
    VBW = sz.w; VBH = sz.h;
    veilSvg.setAttribute("viewBox", "0 0 " + VBW.toFixed(1) + " " + VBH.toFixed(1));
    rescaleGradients();
    buildRibbonPaths();
    updateRibbonWidths();
  }
  function buildRibbonPaths() {
    rbGlow.setAttribute("d",   pathD(-0.040, -0.018)); /* luminous halo, biased to the lit edge, tracks the wave */
    rbShadow.setAttribute("d", pathD(0.034, 0.046)); /* soft contact shadow, down-right */
    rbUnder.setAttribute("d",  pathD(0.014, 0.018)); /* dark underside peeks past body = thickness */
    rbBody.setAttribute("d",   pathD(0, 0));         /* matte satin body */
    rbSheen.setAttribute("d",  pathD(-0.026, -0.014)); /* satin highlight, just left of centre (small offset = no bunching on the curve) */
    rbRim.setAttribute("d",    pathD(-0.182, -0.030)); /* crisp cobalt rim on the lit (left) edge */
    rbSpec.setAttribute("d",   pathD(-0.085, -0.020)); /* glint rides ON the satin surface, just inside the lit edge */
  }
  /* set stroke width as a USER-UNIT attribute (not a CSS px style). In the 1:1 viewBox 1 user
     unit = 1 px, so this is the same on-screen width as before — but it no longer relies on
     vector-effect:non-scaling-stroke, the construct WebKit's GPU path mis-handles. */
  function setW(el, w) { el.setAttribute("stroke-width", w.toFixed(1)); el.style.strokeWidth = ""; }
  function updateRibbonWidths() {
    /* WIDE satin ribbon (reference-lock): a true content surface, not a strip. The cards
       (~216px) then sit on it with editorial margin. Kept below the curve's coil threshold. */
    var band = VBW * 0.30;
    setW(rbGlow,   band * 1.05); /* white light sits over the band, not a wide halo */
    setW(rbShadow, band * 1.10);
    setW(rbUnder,  band * 1.02); /* dark underside peeks past the body = thickness */
    setW(rbBody,   band);
    setW(rbSheen,  band * 0.34); /* satin highlight band */
    setW(rbRim,    band * 0.055);
    setW(rbSpec,   band * 0.05); /* thin glint, not a fat streak */
  }

  /* current (already-lerped) veil transform; set every frame before placing cards */
  var cur = { vx: 16, vy: 0, vrot: 14, vscale: 1 };

  /* time-based "life" (sin waves), written each frame by the rAF loop; 0 when static */
  var gBreathe = 0, gDrift = 0, gGlow = 0;
  /* roll-down: how far the content has rolled along the ribbon, in cycles (0 at the very top,
     grows with scroll through the embedded journey). Drives the conveyor in embedGeom. */
  var gRoll = 0;
  /* cached scroll-derived phase so idle frames only redo the cheap breathing work */
  var lastSY = -1, ck = 0, cmfrac = 0, cdelivP = 0;

  /* Embedded geometry: where card i sits ON the LIVE ribbon, as a screen-space
     offset from viewport centre, inheriting the veil's translate/rotate/scale. */
  function embedGeom(i) {
    /* ROLL-DOWN conveyor: position = base + roll, wrapped to 0..1 so cards travel down the
       ribbon as you scroll and recycle top<->bottom. Depth scaling (small/far at top, large/
       near at bottom) gives the 3D, in-perspective feel. `edge` fades cards at the ribbon ends
       so the wrap is invisible. */
    var pos = BASE[i] + gRoll;
    pos = pos - Math.floor(pos);                 /* wrap into 0..1 */
    var t = pos;
    var c = centerline(t);
    var sz = veilSize();
    var Lx = (c.x - 0.5) * sz.w;             /* px from veil centre, veil-local */
    var Ly = (c.y - 0.5) * sz.h;
    var r = cur.vrot * Math.PI / 180, s = cur.vscale, co = Math.cos(r), si = Math.sin(r);
    var ox = (Lx * co - Ly * si) * s;        /* rotate + scale into screen space */
    var oy = (Lx * si + Ly * co) * s;
    var tdeg = Math.atan2(c.dy * sz.h, c.dx * sz.w) * 180 / Math.PI;
    var lean = clamp(tdeg - 90, -34, 34) * 0.55; /* damped tilt toward the local tangent */
    var depth = lerp(0.70, 1.16, t);             /* stronger perspective: far(top) -> near(bottom) */
    var edge = smooth(clamp(pos / 0.06, 0, 1)) * smooth(clamp((1 - pos) / 0.06, 0, 1));
    return {
      x: cur.vx / 100 * vw + ox,
      y: cur.vy / 100 * vh + oy,
      rot: cur.vrot + lean,
      sc: s * depth * CARD_BASE,
      z: Math.round(40 + t * 50),
      edge: edge
    };
  }

  /* deliverables stack state for card i at progress p (0..1) — screen-space, offset
     from viewport centre. The stack sits to the right of the copy; active card forward
     and readable, neighbours behind it dimmed — content assets pulled from the ribbon. */
  function stack(i, p) {
    var activeF = p * 4;
    var rel = i - activeF;
    var ar = Math.abs(rel);
    return {
      x: (0.105 + rel * 0.102) * vw,
      y: (0.01 + rel * 0.096) * vh,
      rot: rel * -3,
      sc: clamp(1.22 - ar * 0.16, 0.62, 1.22),
      /* Stay matte: neighbours keep a high element opacity (no see-through to the
         ribbon) and recede via the dark overlay (--cdim) instead of going glassy. */
      op: clamp(1 - ar * 0.19, 0.6, 1),
      dim: clamp(ar * 0.44, 0, 0.82),
      /* mode=1 → ALL stack cards show the small "REELS / 01" bar label (so every card is
         identifiable), but they are in detached layout. */
      mode: 1,
      /* det = the BIG detail block ("12–16 REELS" + sub). PEAKED so ONLY the card nearest
         the active index shows it; it falls to 0 by ar≈0.47, so during the slide between two
         cards the outgoing big text fully fades out before the incoming one appears — no two
         titles readable at once (fixes the deliverables text-overlap/ghosting bug). */
      det: clamp(1.5 - ar * 3.2, 0, 1),
      z: Math.round(220 - ar * 14)
    };
  }

  function lerpCard(a, b, t) {
    return {
      x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t), rot: lerp(a.rot, b.rot, t),
      sc: lerp(a.sc, b.sc, t), op: lerp(a.op, b.op, t), dim: lerp(a.dim, b.dim, t),
      det: lerp(a.det, b.det, t), mode: lerp(a.mode || 0, b.mode || 0, t), z: t < 0.5 ? a.z : b.z
    };
  }

  /* card states for phase k with already-eased morph factor t.
     Embedded phases ride the live ribbon; only deliverables detaches into a stack. */
  function formation(k, t, delivP) {
    var out = [], i, st;
    if (k === IDX.deliverables) {
      for (i = 0; i < 5; i++) out[i] = stack(i, delivP);
      return out;
    }
    var Aa = APP[k], Ba = APP[Math.min(k + 1, LAST)];
    for (i = 0; i < 5; i++) {
      var g = embedGeom(i);
      out[i] = { x: g.x, y: g.y, rot: g.rot, sc: g.sc,
                 op: lerp(Aa.op, Ba.op, t) * g.edge, dim: lerp(Aa.dim, Ba.dim, t), det: 0, mode: 0, z: g.z };
    }
    /* system -> deliverables: ease the ribbon cards into the stack start */
    if (k + 1 === IDX.deliverables) {
      for (i = 0; i < 5; i++) { st = stack(i, 0); st.det = 0; out[i] = lerpCard(out[i], st, t); }
    }
    /* deliverables -> cta: ease the stack end back onto the ribbon */
    if (k === IDX.cta) {
      for (i = 0; i < 5; i++) { st = stack(i, 1); st.det = 0; out[i] = lerpCard(st, out[i], t); }
    }
    return out;
  }

  /* ---------- apply to DOM ---------- */
  function applyVeil(s) {
    veil.style.setProperty("--vx", s.vx.toFixed(2) + "vw");
    veil.style.setProperty("--vy", s.vy.toFixed(2) + "vh");
    veil.style.setProperty("--vrot", s.vrot.toFixed(2) + "deg");
    veil.style.setProperty("--vscale", s.vscale.toFixed(3));
    veil.style.setProperty("--vglow", s.vglow.toFixed(3));
    veil.style.setProperty("--vdark", s.vdark.toFixed(3));
  }
  function applyCards(states, life) {
    /* cards inherit the veil's breathe/float so they read as sitting ON the surface,
       not pasted over it. `life` damps it (≈0 when detached / static). */
    if (life === undefined) life = 0;
    var dy = gDrift * 7 * life;
    var ds = gBreathe * 0.01 * life;
    for (var i = 0; i < 5; i++) {
      var s = states[i], el = cardEls[i];
      var cy = s.y + dy * (0.7 + i * 0.06);
      el.style.transform = "translate3d(" + s.x.toFixed(1) + "px," + cy.toFixed(1) + "px,0) rotate(" + s.rot.toFixed(2) + "deg) scale(" + (s.sc * (1 + ds)).toFixed(3) + ")";
      el.style.opacity = s.op.toFixed(3);
      el.style.zIndex = s.z;
      el.style.setProperty("--cdim", s.dim.toFixed(3));
      el.style.setProperty("--cdetail", s.det.toFixed(3));
      el.style.setProperty("--cmode", (s.mode || 0).toFixed(3));
    }
  }

  /* ---------- deliverables connector ---------- */
  function updateLink(delivP, op) {
    if (op <= 0.01) { vlink.style.opacity = "0"; return; }
    var active = clamp(Math.round(delivP * 4), 0, 4);
    var r = cardEls[active].getBoundingClientRect();
    var cx = r.left + r.width * 0.5, cy = r.top + r.height * 0.5;
    /* anchor on the veil body, to the right of the stack */
    var ax = vw * 0.5 + (cur.vx / 100 * vw) + vw * 0.17;
    var ay = vh * 0.5 + (cur.vy / 100 * vh);
    var dx = ax - cx, dy = ay - cy;
    var len = Math.sqrt(dx * dx + dy * dy);
    var ang = Math.atan2(dy, dx) * 180 / Math.PI;
    vlink.style.left = cx.toFixed(1) + "px";
    vlink.style.top = cy.toFixed(1) + "px";
    vlink.style.width = len.toFixed(1) + "px";
    vlink.style.transform = "rotate(" + ang.toFixed(2) + "deg)";
    vlink.style.opacity = (op * 0.85).toFixed(3);
  }

  /* ---------- diagnosis connectors (row -> card on the veil) ---------- */
  function hideDiagLinks() {
    for (var i = 0; i < dlinks.length; i++) dlinks[i].style.opacity = "0";
  }
  function updateDiagLinks(pp) {
    for (var i = 0; i < dlinks.length; i++) {
      /* same staggered reveal the audit rows use, so a line draws in with its row */
      var rp = clamp((pp - (0.10 + i * 0.13)) / 0.14, 0, 1);
      var dl = dlinks[i];
      if (rp <= 0.01 || !auditRows[i]) { dl.style.opacity = "0"; continue; }
      var rr = auditRows[i].getBoundingClientRect();
      var rc = cardEls[i].getBoundingClientRect();
      var sx = rr.right + 8, sy = rr.top + rr.height * 0.5;
      var ex = rc.left + rc.width * 0.18, ey = rc.top + rc.height * 0.5;
      var dx = ex - sx, dy = ey - sy;
      var len = Math.sqrt(dx * dx + dy * dy);
      var ang = Math.atan2(dy, dx) * 180 / Math.PI;
      var draw = smooth(rp); /* node travels toward the card as the line draws in */
      var cardOp = parseFloat(cardEls[i].style.opacity);
      if (isNaN(cardOp)) cardOp = 1;
      dl.style.left = sx.toFixed(1) + "px";
      dl.style.top = sy.toFixed(1) + "px";
      dl.style.width = (len * draw).toFixed(1) + "px";
      dl.style.transform = "rotate(" + ang.toFixed(2) + "deg)";
      dl.style.opacity = (clamp(rp * 1.3, 0, 1) * 0.85 * clamp(cardOp * 1.4, 0, 1)).toFixed(3);
    }
  }

  var lastTick = -1;
  function setTicker(n) {
    if (n === lastTick || !ticker) return;
    lastTick = n;
    ticker.textContent = (n < 10 ? "0" : "") + n;
  }

  /* card supporting-text state — masked cross-fade (never a hard cut): fade the old text
     out via --cstate, swap the text while invisible, fade the new text in. */
  var stateK = -2, stateTimer = null;
  function setCardStates(k) {
    if (k === stateK) return;
    stateK = k;
    for (var i = 0; i < 5; i++) cardEls[i].style.setProperty("--cstate", "0"); /* fade out */
    if (stateTimer) clearTimeout(stateTimer);
    var arr = CARD_STATE[k];
    if (!arr) return; /* hero / deliverables / cta: no supporting state text */
    stateTimer = setTimeout(function () {
      for (var j = 0; j < 5; j++) {
        stateEls[j].textContent = arr[j];
        cardEls[j].style.setProperty("--cstate", "1"); /* fade in */
      }
    }, 300);
  }

  /* ---------- main render ---------- */
  /* `sy` is the SMOOTHED scroll position (lerped toward the real scrollY) so the whole
     stage moves with a premium, heavy inertia rather than snapping to raw scroll. */
  function render(sy) {
    var docH = document.documentElement.scrollHeight - vh;
    document.documentElement.style.setProperty("--scroll", (docH > 0 ? clamp(sy / docH, 0, 1) : 0).toFixed(4));

    /* publish the time-based life to the veil subtree (veil + its glow inherit these) —
       runs EVERY frame so the stage breathes even when the user isn't scrolling. */
    veil.style.setProperty("--veil-breathe", gBreathe.toFixed(4));
    veil.style.setProperty("--veil-drift", gDrift.toFixed(4));
    veil.style.setProperty("--glow-pulse", gGlow.toFixed(4));

    /* SCROLL-DEPENDENT work only when the (smoothed) scroll actually moved — keeps idle
       breathing frames cheap (no section-subtree recalcs, no veil-pose rewrites). */
    if (Math.abs(sy - lastSY) > 0.4) {
      lastSY = sy;

      /* TEXT LIFETIME — from each sticky inner's viewport-top, computed from cached layout
         (starts/ranges), not getBoundingClientRect (no layout thrash). enter: reveals on
         the rise into pin. hold: rt≈0 across the pinned scroll. exit: ghosts as it unpins. */
      var pVals = [];
      for (var i = 0; i < sectionEls.length; i++) {
        var top = starts[i] - sy;                       /* section top in the viewport */
        var rt = top > 0 ? top : (sy <= starts[i] + ranges[i] ? 0 : (starts[i] + ranges[i]) - sy);
        var enter = smooth(1 - clamp((rt - 0.12 * vh) / (0.50 * vh), 0, 1));
        var exit  = (i === LAST) ? 0 : smooth(clamp((-rt - 0.05 * vh) / (0.52 * vh), 0, 1));
        var pp = clamp((sy - starts[i]) / ranges[i], 0, 1);
        pVals[i] = pp;
        var st = inners[i].style;
        st.setProperty("--rv", enter.toFixed(4));
        st.setProperty("--gx", exit.toFixed(4));
        st.setProperty("--pp", pp.toFixed(4));
      }

      /* global phase index + frac across full section spans */
      var k = 0;
      for (var s = 0; s < sectionEls.length; s++) {
        if (sy >= starts[s] && sy < starts[s + 1]) { k = s; break; }
        if (s === LAST) k = LAST;
      }
      if (sy < starts[0]) k = 0;
      var span = (starts[k + 1] || (starts[k] + fulls[k])) - starts[k];
      var frac = clamp((sy - starts[k]) / span, 0, 1);

      /* brief settled hold, then a continuous morph to the next keyframe — the veil is
         almost always subtly transforming, never a dead static frame. */
      var mfrac = smooth(clamp((frac - 0.20) / 0.80, 0, 1));

      /* veil pose: morph keyframe[k] -> keyframe[k+1]; cache the live transform in `cur`
         so the embedded cards ride exactly on this frame's ribbon. */
      var A = VEIL[k], B = VEIL[Math.min(k + 1, LAST)];
      cur.vx = lerp(A.vx, B.vx, mfrac);
      cur.vy = lerp(A.vy, B.vy, mfrac);
      cur.vrot = lerp(A.vrot, B.vrot, mfrac);
      cur.vscale = lerp(A.vscale, B.vscale, mfrac);
      applyVeil({
        vx: cur.vx, vy: cur.vy, vrot: cur.vrot, vscale: cur.vscale,
        vglow: lerp(A.vglow, B.vglow, mfrac), vdark: lerp(A.vdark, B.vdark, mfrac)
      });

      cdelivP = clamp(pVals[IDX.deliverables] / 0.85, 0, 1);
      ck = k; cmfrac = mfrac;
      /* ROLL-DOWN: content rolls ~1.15 cycles down the ribbon across the embedded journey
         (hero..system), then freezes as cards detach in Deliverables. Continuous, no jumps. */
      gRoll = clamp(sy / (starts[IDX.deliverables] || 1), 0, 1) * 1.15;
      setCardStates(k); /* evolve the supporting card text per section (masked cross-fade) */

      /* deliverables ticker + connector from the active card back to the veil origin */
      if (k === IDX.deliverables) {
        setTicker(Math.round(cdelivP * 4) + 1);
        updateLink(cdelivP, clamp((pVals[IDX.deliverables] - 0.04) / 0.12, 0, 1) * (1 - smooth(clamp((cdelivP - 0.9) / 0.1, 0, 1))));
      } else {
        vlink.style.opacity = "0";
      }

      /* diagnosis connectors: draw row -> card lines as the audit rows reveal */
      if (k === IDX.diagnosis) updateDiagLinks(pVals[IDX.diagnosis]);
      else hideDiagLinks();
    }

    /* cards — re-placed every frame so embedded cards breathe with the veil; the detached
       stack barely breathes. Uses cached phase (ck/cmfrac/cdelivP) when scroll is idle. */
    var cardLife = (ck === IDX.deliverables) ? 0.3 : 1;
    applyCards(formation(ck, cmfrac, cdelivP), cardLife);
  }

  /* ---------- reduced-motion static layout ---------- */
  function renderStatic() {
    for (var i = 0; i < inners.length; i++) {
      var st = inners[i].style;
      st.setProperty("--rv", "1"); st.setProperty("--gx", "0"); st.setProperty("--pp", "1");
    }
    cur.vx = VEIL[0].vx; cur.vy = VEIL[0].vy; cur.vrot = VEIL[0].vrot; cur.vscale = VEIL[0].vscale;
    applyVeil({ vx: VEIL[0].vx, vy: VEIL[0].vy, vrot: VEIL[0].vrot, vscale: VEIL[0].vscale, vglow: VEIL[0].vglow, vdark: VEIL[0].vdark });
    applyCards(formation(0, 0, 0));
  }

  /* =================================================================
     LITE (touch / tablet) — COMPOSITOR-ONLY CARD PIPELINE
     Client requirement: keep the scroll-scrubbed card animation on iPad while killing WebKit
     scroll lag. So on LITE we run a stripped loop that writes ONLY each card's transform +
     opacity per frame — NO CSS custom-var writes (--rv/--gx/--cdim/...), so nothing triggers
     main-thread layout or paint while scrolling. Text reveals + card content modes are set to
     their FINAL static values once (like reduced-motion). The veil (150vh SVG + #ribbonBlur +
     glow) is display:none in CSS; cards are flat + GPU-promoted (will-change:transform). The
     veil POSE is still computed here (cheap math) purely to place the cards on the same curve. */
  var cardVis = [1, 1, 1, 1, 1];     /* IntersectionObserver: is card i within the buffered viewport */
  var cardParked = [0, 0, 0, 0, 0];  /* 1 = currently culled (not being written) */

  /* one-time: reveal all text + lock each card to its embedded look. After this the only thing
     that changes per frame is card transform/opacity. */
  function initLiteStatic() {
    for (var i = 0; i < inners.length; i++) {
      var si = inners[i].style;
      si.setProperty("--rv", "1"); si.setProperty("--gx", "0"); si.setProperty("--pp", "1");
    }
    for (var c = 0; c < cardEls.length; c++) {
      var cc = cardEls[c].style;
      cc.setProperty("--cmode", "0"); cc.setProperty("--cdetail", "0");
      cc.setProperty("--cstate", "0"); cc.setProperty("--cdim", "0");
    }
  }

  /* CULLING. The cheap geometry math runs every frame for every card (it MUST — that's how we
     know when a card should reappear); we only skip the costly transform/opacity WRITE for cards
     that are invisible (op~0) or scrolled outside the viewport (IntersectionObserver). A periodic
     resync re-writes every card so a culled one can never freeze off-screen. (Pausing the math on
     an IO callback alone would deadlock here: a frozen card stops moving, so its own IO never
     fires to un-freeze it — hence math-always, write-sometimes.) */
  function setupCardCulling() {
    if (!("IntersectionObserver" in window)) return; /* fallback: cardVis stays 1; op-cull still applies */
    var io = new IntersectionObserver(function (entries) {
      for (var j = 0; j < entries.length; j++) {
        var idx = cardEls.indexOf(entries[j].target);
        if (idx >= 0) cardVis[idx] = entries[j].isIntersecting ? 1 : 0;
      }
    }, { root: null, rootMargin: "30%", threshold: 0 });
    for (var i = 0; i < cardEls.length; i++) io.observe(cardEls[i]);
  }

  /* is card i's freshly-computed target outside the viewport box? (s.x/s.y are offsets from the
     viewport centre). This is the ANTI-FREEZE guard: a card is only culled when BOTH the
     IntersectionObserver and the live geometry agree it's gone, and it resumes the instant the
     geometry re-enters — so a parked card can never get stuck off-screen waiting on its own IO. */
  function offViewport(s) {
    return Math.abs(s.x) > vw * 0.5 + 220 || Math.abs(s.y) > vh * 0.5 + 260;
  }
  function applyCardsLite(states) {
    for (var i = 0; i < 5; i++) {
      var s = states[i], el = cardEls[i];
      /* CULL the costly write for cards we can't see: invisible (op~0), or scrolled out of the
         viewport per IntersectionObserver AND confirmed off by current geometry. */
      var hidden = s.op <= 0.012 || (cardVis[i] === 0 && offViewport(s));
      if (hidden) {
        if (cardParked[i] !== 1) { el.style.opacity = "0"; cardParked[i] = 1; }
        continue;
      }
      cardParked[i] = 0;
      el.style.transform = "translate3d(" + s.x.toFixed(1) + "px," + s.y.toFixed(1) + "px,0) rotate(" + s.rot.toFixed(2) + "deg) scale(" + s.sc.toFixed(3) + ")";
      el.style.opacity = s.op.toFixed(3);
      el.style.zIndex = s.z;
    }
  }

  /* compositor-only render: phase + veil-pose MATH only (veil is hidden), then cards. No section
     vars, no veil styles, no connectors — those are set once / hidden for LITE. */
  function renderLite(sy) {
    var k = 0, s;
    for (s = 0; s < sectionEls.length; s++) {
      if (sy >= starts[s] && sy < starts[s + 1]) { k = s; break; }
      if (s === LAST) k = LAST;
    }
    if (sy < starts[0]) k = 0;
    var span = (starts[k + 1] || (starts[k] + fulls[k])) - starts[k];
    var frac = clamp((sy - starts[k]) / span, 0, 1);
    var mfrac = smooth(clamp((frac - 0.20) / 0.80, 0, 1));

    var A = VEIL[k], B = VEIL[Math.min(k + 1, LAST)];
    cur.vx = lerp(A.vx, B.vx, mfrac);
    cur.vy = lerp(A.vy, B.vy, mfrac);
    cur.vrot = lerp(A.vrot, B.vrot, mfrac);
    cur.vscale = lerp(A.vscale, B.vscale, mfrac);

    gRoll = clamp(sy / (starts[IDX.deliverables] || 1), 0, 1) * 1.15;
    cdelivP = clamp(clamp((sy - starts[IDX.deliverables]) / ranges[IDX.deliverables], 0, 1) / 0.85, 0, 1);
    ck = k; cmfrac = mfrac;
    if (k === IDX.deliverables) setTicker(Math.round(cdelivP * 4) + 1);

    applyCardsLite(formation(ck, cmfrac, cdelivP));
  }

  /* ---------- scroll + continuous rAF loop ---------- */
  /* Real scroll feeds targetY; currentY eases toward it for a premium heavy scroll, and
     performance.now() drives the breathe/drift/glow sines so the stage is alive even when
     the user is not scrolling. The loop pauses when the tab is hidden. */
  var targetY = window.pageYOffset || 0;
  var currentY = targetY;
  var running = false;

  function onScroll() { targetY = window.pageYOffset; }

  /* Debounced resize. iOS Safari fires `resize` when its address/tab bar shows/hides DURING
     scroll; running the full measure() (7x getBoundingClientRect + offsetHeight + an SVG path
     rebuild) on the scroll thread is a major iPad jank source. We coalesce bursts and IGNORE
     height-only changes under ~120px (the toolbar), only re-measuring on a real width change or
     a large height swing (orientation). */
  var resizeT = null, lastW = window.innerWidth, lastH = window.innerHeight;
  function onResize() {
    if (resizeT) clearTimeout(resizeT);
    resizeT = setTimeout(function () {
      var w = window.innerWidth, h = window.innerHeight;
      if (w === lastW && Math.abs(h - lastH) <= 120) return; /* iOS toolbar — skip */
      lastW = w; lastH = h;
      measure();
    }, 150);
  }

  var lastRenderedY = NaN; /* LITE: last position we actually rendered, to skip idle frames */
  function frame() {
    if (!running) return;
    /* __XAVRO_INSTANT lets QA/screenshot tooling snap the eased scroll (headless rAF is
       throttled, so the lerp won't settle in a capture window). No effect for real users. */
    var ease = window.__XAVRO_INSTANT ? 1 : 0.085;
    currentY += (targetY - currentY) * ease;
    var moving = Math.abs(targetY - currentY) >= 0.35;
    if (!moving) currentY = targetY;

    if (LITE) {
      /* touch: compositor-only pipeline (transform/opacity on cards only). No continuous breathe,
         and we only spend a frame while the scroll is actually moving (plus one settle frame), so
         an idle iPad does ~zero work. */
      if (moving || currentY !== lastRenderedY) { renderLite(currentY); lastRenderedY = currentY; }
    } else if (SAFARI) {
      /* desktop Safari: full veil + cards (the filter-free `.is-safari` variant), but freeze the
         continuous breathe (gBreathe/gDrift/gGlow stay 0) and only render while scrolling — so an
         idle Mac does ~zero work instead of re-compositing the veil every frame. */
      if (moving || currentY !== lastRenderedY) { render(currentY); lastRenderedY = currentY; }
    } else {
      var t = performance.now() * 0.001;
      gBreathe = Math.sin(t * 0.62);          /* slow scale/rotate pulse */
      gDrift   = Math.sin(t * 0.34 + 1.3);    /* slower vertical float */
      gGlow    = Math.sin(t * 0.50 + 0.6);    /* cobalt glow breathe */
      render(currentY);
    }
    requestAnimationFrame(frame);
  }
  function startLoop() { if (!running) { running = true; requestAnimationFrame(frame); } }
  function stopLoop() { running = false; }

  /* ---------- boot wiring ---------- */
  function startSite() {
    measure(); /* sizes the SVG user space + builds the ribbon paths/gradients/widths */
    window.addEventListener("resize", onResize, { passive: true });

    if (REDUCED) {
      renderStatic();
      window.addEventListener("load", function () { measure(); renderStatic(); });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { measure(); renderStatic(); });
      return;
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) stopLoop(); else startLoop();
    });
    /* fonts / late layout shifts: just re-measure; the loop renders the next frame */
    window.addEventListener("load", measure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

    if (LITE) { initLiteStatic(); setupCardCulling(); }

    startLoop();
  }

  function runLoader() {
    var seen = false;
    try { seen = sessionStorage.getItem("xavro_seen") === "1"; } catch (e) {}
    var dur = seen ? 950 : 2450;
    if (seen) loader.classList.add("is-fast");
    if (REDUCED) dur = seen ? 300 : 700;

    setTimeout(function () {
      body.classList.remove("is-loading");
      try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {}
    }, dur);
  }

  /* The experience must ALWAYS begin on the hero. Browsers restore the previous scroll
     position on reload — if the visitor refreshed while reading the CTA, the page would
     "start" on the CTA behind the loader. Take manual control and pin to the top on boot. */
  function pinToTop() {
    try { if ("scrollRestoration" in history) history.scrollRestoration = "manual"; } catch (e) {}
    window.scrollTo(0, 0);
    targetY = currentY = 0;
  }

  /* Wire the single conversion action from the clearly-labelled placeholder above. */
  function wireCTA() {
    if (!bookBtn) return;
    bookBtn.setAttribute("href", XAVRO_BOOKING_URL);
    if (/^https?:/i.test(XAVRO_BOOKING_URL)) {
      bookBtn.setAttribute("target", "_blank");
      bookBtn.setAttribute("rel", "noopener noreferrer");
    }
  }

  /* ---------- boot ---------- */
  pinToTop();
  wireCTA();
  startSite();
  /* one more pin after the browser's own load-time scroll restoration fires */
  window.addEventListener("load", function () { window.scrollTo(0, 0); });
  if (document.readyState === "complete" || document.readyState === "interactive") runLoader();
  else document.addEventListener("DOMContentLoaded", runLoader);

})();

/* =================================================================
   ON-DEVICE PERFORMANCE DIAGNOSTIC  (opt-in via ?debug=1)
   For real-device debugging we cannot do from a desktop: open the live URL with ?debug=1
   on the iPad, scroll, and read the overlay. It tells us the two things we can't otherwise
   know — whether the LITE profile actually activated on THAT device, and the live/min FPS
   while scrolling. Self-origin (CSP-safe), gated, and does negligible work. No effect for
   normal visitors. Remove later or leave it — it never runs without the query flag.
   ================================================================= */
(function () {
  "use strict";
  if (location.search.indexOf("debug=1") === -1) return;
  function start() {
    var box = document.createElement("div");
    box.setAttribute("aria-hidden", "true");
    box.style.cssText = "position:fixed;top:8px;left:8px;z-index:99999;font:12px/1.5 monospace;" +
      "color:#9fe6b0;background:rgba(0,0,0,0.85);padding:8px 10px;border:1px solid #3a6;" +
      "border-radius:6px;pointer-events:none;white-space:pre;max-width:70vw;";
    document.body.appendChild(box);
    var mq = function (q) { return window.matchMedia(q).matches; };
    var frames = 0, fps = 0, last = performance.now(), lo = 999;
    function tick(now) {
      frames++;
      if (now - last >= 500) {
        fps = Math.round(frames * 1000 / (now - last));
        if (fps < lo) lo = fps; /* min FPS captures the worst scroll dip */
        frames = 0; last = now;
        box.textContent =
          "XAVRO debug\n" +
          "LITE: " + (window.__XAVRO_LITE ? "ON ✓" : "OFF ✗") + "\n" +
          "FPS: " + fps + "   min: " + lo + "\n" +
          "DPR: " + (window.devicePixelRatio || 1) + "\n" +
          "viewport: " + window.innerWidth + " x " + window.innerHeight + "\n" +
          "pointer: " + (mq("(pointer: coarse)") ? "coarse" : "fine") +
          "   hover: " + (mq("(hover: none)") ? "none" : "hover") + "\n" +
          "reduced-motion: " + (mq("(prefers-reduced-motion: reduce)") ? "ON" : "off") + "\n" +
          "touchPoints: " + (navigator.maxTouchPoints || 0) + "   platform: " + navigator.platform;
      }
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }
  if (document.body) start();
  else document.addEventListener("DOMContentLoaded", start);
})();
