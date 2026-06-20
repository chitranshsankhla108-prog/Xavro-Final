// One-off verification: confirm the Proof section is gone and Deliverables -> CTA
// flows with no gap. Captures the lower third of the scroll.
// Usage: node qa/proof-removed-check.mjs
import { chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { mkdirSync } from "fs";
import { createServer } from "http";
import { readFile } from "fs/promises";
import { extname } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "qa-screenshots", "proof-removed");
mkdirSync(outDir, { recursive: true });

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".woff2": "font/woff2" };
const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(req.url.split("?")[0]);
    if (p === "/") p = "/index.html";
    const buf = await readFile(join(root, p));
    res.writeHead(200, { "content-type": MIME[extname(p)] || "application/octet-stream" });
    res.end(buf);
  } catch { res.writeHead(404); res.end("nf"); }
});
await new Promise((r) => server.listen(8123, "127.0.0.1", r));
const URL = "http://127.0.0.1:8123/index.html";

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => { if (m.type() === "error") errors.push(m.text()); });
await page.addInitScript(() => { window.__XAVRO_INSTANT = true; });
await page.goto(URL, { waitUntil: "networkidle" });
await page.waitForTimeout(1800);

const ids = await page.$$eval("[data-section]", (els) => els.map((e) => e.id));
const proofEl = await page.$("#proof, .section--proof");

const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
const STOPS = [["a-deliv-mid", 0.62], ["b-deliv-late", 0.74], ["c-handoff", 0.85], ["d-cta-rise", 0.93], ["e-cta", 0.99]];
for (const [name, frac] of STOPS) {
  await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
  await page.waitForTimeout(700);
  await page.screenshot({ path: join(outDir, name + ".png") });
}

console.log("data-section ids:", JSON.stringify(ids));
console.log("proof element present:", !!proofEl);
console.log("page/console errors:", errors.length ? JSON.stringify(errors, null, 2) : "none");
console.log("captured ->", outDir);

await browser.close();
server.close();
