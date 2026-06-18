import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", "bounds");
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.addInitScript(() => { try { sessionStorage.setItem("xavro_seen","1"); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
// boundary fractions (approx between sections), to catch any empty moment
const stops = [["hero-diag",0.095],["diag-pain",0.205],["pain-sys",0.37],["sys-deliv",0.49],["deliv-proof",0.785],["proof-cta",0.915]];
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (const [n,f] of stops){ await p.evaluate(y=>window.scrollTo(0,y), Math.round(total*f)); await p.waitForTimeout(500); await p.screenshot({path: join(outDir, n+".png")}); }
await b.close();
console.log("bounds done");
