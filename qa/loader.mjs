import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", "loader");
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.addInitScript(() => { try { sessionStorage.clear(); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "domcontentloaded" });
for (const ms of [300, 700, 1100, 1500, 1900, 2300, 2700]) {
  await p.waitForTimeout(ms - (p._last||0)); p._last = ms;
  await p.screenshot({ path: join(outDir, "t"+ms+".png") });
}
await b.close();
console.log("loader frames captured");
