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
await p.addInitScript(() => { window.__XAVRO_INSTANT = true; });
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(4300);
// hero fully revealed
await p.screenshot({ path: join(outDir, "hero-settled.png") });
// scroll to CTA and tab to focus the button
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
await p.evaluate((y)=>window.scrollTo(0,y), total);
await p.waitForTimeout(900);
await p.evaluate(() => { const b=document.getElementById('bookBtn'); b.focus(); });
await p.waitForTimeout(400);
await p.screenshot({ path: join(outDir, "cta-focus.png") });
// report href + a11y
const info = await p.evaluate(() => {
  const b=document.getElementById('bookBtn');
  return { href: b.getAttribute('href'), target: b.getAttribute('target'), focused: document.activeElement===b };
});
console.log(JSON.stringify(info));
await b.close();
