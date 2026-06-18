import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", "boundaries");
mkdirSync(outDir, { recursive: true });
const URL = "http://127.0.0.1:8123/index.html";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.addInitScript(() => { window.__XAVRO_INSTANT = true; });
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(3000);
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
// transition fractions between sections
const stops = [0.09,0.115,0.21,0.235,0.345,0.37,0.475,0.50,0.77,0.80,0.90,0.93];
for (const f of stops) {
  await p.evaluate((y)=>window.scrollTo(0,y), Math.round(total*f));
  await p.waitForTimeout(550);
  await p.screenshot({ path: join(outDir, "b-"+String(Math.round(f*1000)).padStart(4,"0")+".png") });
}
await b.close();
console.log("boundaries captured");
