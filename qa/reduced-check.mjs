import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "temp-reference-checks");
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
const p = await ctx.newPage();
const errs = [];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("PAGEERROR: "+e.message));
await p.addInitScript(() => { try { sessionStorage.setItem("xavro_seen","1"); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1500);
// two frames 3s apart at scroll 0 — should be IDENTICAL (no breathing) under reduced motion
await p.screenshot({ path: join(outDir, "reduced-a.png") });
await p.waitForTimeout(3000);
await p.screenshot({ path: join(outDir, "reduced-b.png") });
// scroll to deliverables, confirm readable
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await p.evaluate((y)=>window.scrollTo(0,y), Math.round(total*0.6));
await p.waitForTimeout(600);
await p.screenshot({ path: join(outDir, "reduced-deliv.png") });
console.log("REDUCED ERRORS:", errs.length ? JSON.stringify(errs) : "none");
await b.close();
