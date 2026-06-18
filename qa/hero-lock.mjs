import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "temp-reference-checks");
mkdirSync(outDir, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
await p.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen","1"); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(3000); // loader + hero reveal transition + margin
await p.screenshot({ path: join(outDir, "hero-reference-lock.png") });
await b.close();
console.log("hero-reference-lock captured");
