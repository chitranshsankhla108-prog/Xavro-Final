// Playwright capture script for XAVRO QA.
// Usage: node qa/shoot.mjs <outDir> [--fresh]
// Captures desktop scroll states across the full story + mobile hero/deliv/cta.
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, "..", "qa-screenshots", process.argv[2] || "current");
const fresh = process.argv.includes("--fresh");
mkdirSync(outDir, { recursive: true });

const URL = "http://127.0.0.1:8123/index.html";

// Named scroll stops as fraction of total scrollable height.
const STOPS = [
  ["01-hero",            0.00],
  ["02-hero-mid",        0.04],
  ["03-diagnosis",       0.13],
  ["04-diagnosis-mid",   0.17],
  ["05-pain",            0.26],
  ["06-pain-mid",        0.31],
  ["07-system",          0.40],
  ["08-system-mid",      0.45],
  ["09-deliv-start",     0.52],
  ["10-deliv-mid",       0.60],
  ["11-deliv-late",      0.70],
  ["12-proof",           0.82],
  ["12b-proof-mid",      0.88],
  ["13-cta",             0.97],
];

async function run() {
  const browser = await chromium.launch();

  // Desktop
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.addInitScript(() => { window.__XAVRO_INSTANT = true; });
  if (fresh) await page.addInitScript(() => { try { sessionStorage.clear(); } catch (e) {} });
  await page.goto(URL, { waitUntil: "networkidle" });
  // let the loader hand off AND the hero reveal transitions (~0.95s) fully settle
  await page.waitForTimeout(fresh ? 4300 : 1600);

  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const [name, frac] of STOPS) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
    await page.waitForTimeout(650);
    await page.screenshot({ path: join(outDir, name + ".png") });
  }
  await ctx.close();

  // Mobile
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await mctx.newPage();
  await mp.addInitScript(() => { window.__XAVRO_INSTANT = true; });
  await mp.goto(URL, { waitUntil: "networkidle" });
  await mp.waitForTimeout(1400);
  const mtotal = await mp.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  for (const [name, frac] of [["m-hero", 0.0], ["m-pain", 0.28], ["m-deliv", 0.60], ["m-cta", 0.97]]) {
    await mp.evaluate((y) => window.scrollTo(0, y), Math.round(mtotal * frac));
    await mp.waitForTimeout(600);
    await mp.screenshot({ path: join(outDir, name + ".png") });
  }
  await mctx.close();

  await browser.close();
  console.log("captured ->", outDir);
}
run();
