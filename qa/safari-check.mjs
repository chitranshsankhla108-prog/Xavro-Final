// WebKit (≈Safari) vs Chromium comparison capture for XAVRO.
// Serves the static site itself (no external server needed), then screenshots the
// same scroll stops in BOTH engines so the veil can be compared side-by-side.
// Usage: node qa/safari-check.mjs <outDir>
import { webkit, chromium } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { mkdirSync, readFileSync, existsSync } from "fs";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outRoot = join(root, "qa-screenshots", process.argv[2] || "safari-check");
mkdirSync(outRoot, { recursive: true });

const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2",
  ".otf": "font/otf", ".ttf": "font/ttf", ".webm": "video/webm", ".mp4": "video/mp4" };

const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]);
  if (p === "/") p = "/index.html";
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end("404"); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" });
  res.end(readFileSync(file));
});

const STOPS = [
  ["01-hero", 0.0], ["03-diagnosis", 0.13], ["05-pain", 0.26],
  ["07-system", 0.40], ["10-deliv-mid", 0.60], ["12-proof", 0.82], ["13-cta", 0.97],
];

async function capture(engine, name, port) {
  const browser = await engine.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  await page.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
  await page.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1800);
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const dir = join(outRoot, name);
  mkdirSync(dir, { recursive: true });
  for (const [label, frac] of STOPS) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
    await page.waitForTimeout(650);
    await page.screenshot({ path: join(dir, label + ".png") });
  }
  // mobile hero
  const mctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
  const mp = await mctx.newPage();
  await mp.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
  await mp.goto(`http://127.0.0.1:${port}/index.html`, { waitUntil: "networkidle" });
  await mp.waitForTimeout(1400);
  await mp.screenshot({ path: join(dir, "m-hero.png") });
  await browser.close();
  console.log(`[${name}] done. errors: ${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 8).join("\n"));
}

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
await capture(webkit, "webkit", port);
await capture(chromium, "chromium", port);
server.close();
console.log("captured ->", outRoot);
