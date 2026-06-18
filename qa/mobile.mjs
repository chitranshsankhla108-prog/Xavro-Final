import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", "mobile-prod");
mkdirSync(outDir, { recursive: true });
const URL = "http://127.0.0.1:8123/index.html";
const devices = [
  { name: "390", w: 390, h: 844 },
  { name: "430", w: 430, h: 932 },
  { name: "768", w: 768, h: 1024 },
];
const STOPS = [["hero",0.0],["diagnosis",0.13],["pain",0.27],["system",0.40],["deliv",0.60],["proof",0.84],["cta",0.98]];
const b = await chromium.launch();
let overflowReport = [];
for (const d of devices) {
  const ctx = await b.newContext({ viewport: { width: d.w, height: d.h }, deviceScaleFactor: 2 });
  const p = await ctx.newPage();
  await p.addInitScript(() => { window.__XAVRO_INSTANT = true; });
  await p.goto(URL, { waitUntil: "networkidle" });
  await p.waitForTimeout(1800);
  // horizontal overflow check
  const ho = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: window.innerWidth }));
  overflowReport.push(`${d.name}: scrollWidth=${ho.sw} innerWidth=${ho.iw} overflow=${ho.sw>ho.iw}`);
  const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const [name, frac] of STOPS) {
    await p.evaluate((y)=>window.scrollTo(0,y), Math.round(total*frac));
    await p.waitForTimeout(450);
    await p.screenshot({ path: join(outDir, `${d.name}-${name}.png`) });
  }
  await ctx.close();
}
await b.close();
console.log(overflowReport.join("\n"));
