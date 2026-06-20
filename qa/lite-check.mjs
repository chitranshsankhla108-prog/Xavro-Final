// Verify the touch/LITE performance profile in WebKit (Safari engine):
//  - desktop (mouse) context: LITE off, grain present (desktop untouched)
//  - iPad-like touch context: LITE on, grain/glow stripped, still renders + scrolls, no errors
import { webkit } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { mkdirSync, readFileSync, existsSync } from "fs";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "qa-screenshots", "lite-check");
mkdirSync(outDir, { recursive: true });
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".otf": "font/otf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const URL = `http://127.0.0.1:${port}/index.html`;

async function probe(ctxOpts, label, scroll) {
  const browser = await webkit.launch();
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console:" + m.text()); });
  await page.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1600);
  await page.screenshot({ path: join(outDir, label + "-onload.png") });
  const facts = await page.evaluate(() => {
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).getPropertyValue(prop) : "(none)"; };
    return {
      LITE: window.__XAVRO_LITE,
      maxTouchPoints: navigator.maxTouchPoints,
      coarse: matchMedia("(pointer: coarse)").matches,
      bodyClass: document.body.className,
      grainDisplay: cs(".grain", "display"),
      rbGlowDisplay: cs(".rb--glow", "display"),
      veilGlowFilter: cs(".veil__glow", "filter"),
      copyWillChange: cs(".section--hero .copy", "will-change"),
      heroLineOpacity: cs(".section--hero .line__ink", "opacity"),
      heroCopyOpacity: cs(".section--hero .copy", "opacity"),
      heroGx: cs(".section--hero .section__inner", "--gx"),
      bodyStroke: cs("#ribbonBodyPath", "stroke"),
    };
  });
  if (scroll) {
    const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
    for (const frac of [0.0, 0.26, 0.6, 0.97]) {
      await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
      await page.waitForTimeout(500);
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
  }
  await page.screenshot({ path: join(outDir, label + ".png") });
  await browser.close();
  console.log(`\n[${label}] errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 6).join("\n"));
  console.log(JSON.stringify(facts, null, 2));
}

await probe({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, "desktop", false);
await probe({ viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }, "ipad-landscape", true);
server.close();
console.log("\ncaptured ->", outDir);
