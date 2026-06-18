import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const errs = [];
p.on("console", m => { if (m.type()==="error") errs.push(m.text()); });
p.on("pageerror", e => errs.push("PAGEERROR: "+e.message));
await p.addInitScript(() => { try { sessionStorage.clear(); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(2800);
// scroll through whole page in steps to exercise the engine
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
for (let f=0; f<=1.0; f+=0.05) { await p.evaluate(y=>window.scrollTo(0,y), Math.round(total*f)); await p.waitForTimeout(60); }
await p.waitForTimeout(200);
console.log("ERRORS:", errs.length ? JSON.stringify(errs,null,2) : "none");
await b.close();
