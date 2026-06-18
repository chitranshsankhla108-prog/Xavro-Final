import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", "video");
mkdirSync(outDir, { recursive: true });
const URL = "http://127.0.0.1:8123/index.html";
const b = await chromium.launch();
const ctx = await b.newContext({
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: outDir, size: { width: 1440, height: 900 } },
});
const p = await ctx.newPage();
await p.goto(URL, { waitUntil: "networkidle" });
await p.waitForTimeout(3800); // loader + hero settle
const total = await p.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
// smooth eased scroll through the whole story so the real engine inertia is recorded
const steps = 240;
for (let i = 0; i <= steps; i++) {
  const f = i / steps;
  await p.evaluate((y)=>window.scrollTo(0,y), Math.round(total*f));
  await p.waitForTimeout(45);
}
await p.waitForTimeout(1200); // hold on CTA
await ctx.close(); // finalizes the video file
await b.close();
console.log("video captured ->", outDir);
