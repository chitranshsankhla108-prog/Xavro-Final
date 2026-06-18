// Motion-pass temp captures (full browser only). Waits long enough for the SMOOTHED
// scroll (eased currentY) to settle before each shot. Usage: node qa/motion-temp.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "temp-reference-checks");
mkdirSync(outDir, { recursive: true });
const URL = "http://127.0.0.1:8123/index.html";

const STATES = [
  ["hero-motion-temp",         0.015],
  ["diagnosis-motion-temp",    0.170],
  ["pain-motion-temp",         0.290],
  ["system-motion-temp",       0.500],
  ["deliverables-motion-temp", 0.555],
  ["proof-motion-temp",        0.840],
  ["cta-motion-temp",          0.985],
];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(1400);
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (const [name, frac] of STATES) {
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
  await p.waitForTimeout(900); // INSTANT flag snaps scroll; brief wait covers the breathe phase
  await p.screenshot({ path: join(outDir, name + ".png") });
}
await b.close();
console.log("motion temp captures ->", outDir);
