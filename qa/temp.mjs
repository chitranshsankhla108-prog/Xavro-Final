// Temp reference-match capture. Full 1440x900 frames at each section's settled state.
// Usage: node qa/temp.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "temp-reference-checks");
mkdirSync(outDir, { recursive: true });
const URL = "http://127.0.0.1:8123/index.html";

// name -> fraction of total scroll where that section sits SETTLED (text held, veil at keyframe)
const STATES = [
  ["hero-temp",         0.015],
  ["diagnosis-temp",    0.170],
  ["pain-temp",         0.290],
  ["system-temp",       0.500],
  ["deliverables-temp", 0.555],
];

const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.addInitScript(() => { try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(1400);
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (const [name, frac] of STATES) {
  await p.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
  await p.waitForTimeout(700);
  await p.screenshot({ path: join(outDir, name + ".png") });
}
await b.close();
console.log("temp captures ->", outDir);
