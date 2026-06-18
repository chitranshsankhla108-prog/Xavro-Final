import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", "probe");
mkdirSync(outDir, { recursive: true });
const URL = "http://127.0.0.1:8123/index.html";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
// First visit: go, wait for loader, scroll to bottom (CTA)
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(2600);
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await p.evaluate((y)=>window.scrollTo(0,y), total);
await p.waitForTimeout(800);
await p.screenshot({ path: join(outDir, "1-at-cta-before-reload.png") });
// Now RELOAD (simulates user refresh while scrolled to CTA)
await p.reload({ waitUntil: "domcontentloaded" });
await p.waitForTimeout(400);
await p.screenshot({ path: join(outDir, "2-just-after-reload.png") });
await p.waitForTimeout(2600);
await p.screenshot({ path: join(outDir, "3-after-loader-on-reload.png") });
const sy = await p.evaluate(() => window.pageYOffset);
console.log("scrollY after reload+loader:", sy);
await b.close();
