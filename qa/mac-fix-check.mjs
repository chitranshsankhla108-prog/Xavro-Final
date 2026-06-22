// Verify the desktop-Safari filter-free veil. Playwright WebKit reports as Safari
// (vendor "Apple Computer, Inc.") so it exercises the is-safari path; Chromium = full path.
import { webkit, chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { mkdirSync, readFileSync, existsSync } from "fs";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "qa-screenshots", "mac-fix");
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

async function run(engine, label) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }); // desktop (no touch -> not LITE)
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console:" + m.text()); });
  await page.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const f = await page.evaluate(() => {
    const cs = (sel, prop) => { const el = document.querySelector(sel); return el ? getComputedStyle(el).getPropertyValue(prop) : "(none)"; };
    return {
      vendor: navigator.vendor, lite: window.__XAVRO_LITE, safari: window.__XAVRO_SAFARI,
      isSafariClass: document.documentElement.classList.contains("is-safari"),
      veilDisplay: cs(".veil", "display"),
      glowDisplay: cs(".rb--glow", "display"),
      shadowDisplay: cs(".rb--shadow", "display"),
      grainDisplay: cs(".grain", "display"),
      veilGlowFilter: cs(".veil__glow", "filter"),
      bodyStroke: cs("#ribbonBodyPath", "stroke"),
    };
  });
  // scroll through to confirm no errors + screenshot hero
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const frac of [0.0, 0.26, 0.6, 0.97]) { await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac)); await page.waitForTimeout(400); }
  await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(500);
  await page.screenshot({ path: join(outDir, label + "-hero.png") });
  console.log(`\n=== ${label} === errors:${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5).join("\n"));
  console.log(JSON.stringify(f, null, 2));
  await browser.close();
}

await run(webkit, "webkit-as-safari");
await run(chromium, "chromium-full");
server.close();
console.log("\nshots ->", outDir);
