import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "temp-reference-checks");
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5 });
const p = await ctx.newPage();
await p.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen","1"); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
const clip = { x: 820, y: 0, width: 620, height: 900 }; // hero veil region
await p.screenshot({ path: join(outDir, "motion-proof-a.png"), clip });
await p.waitForTimeout(6000); // let breathing advance + glint travel
await p.screenshot({ path: join(outDir, "motion-proof-b.png"), clip });
await b.close();
console.log("motion proof captured");
