// Verify the LITE compositor-only card pipeline in WebKit (Safari engine):
//  - iPad touch: veil display:none, text static (--rv=1), card content vars static (--cmode/--cdim
//    unchanged across scroll), cards ANIMATE (transform changes per stop), no errors.
//  - desktop: veil still visible / full render (unchanged).
import { webkit } from "playwright";
import { fileURLToPath } from "url";
import { dirname, join, extname } from "path";
import { mkdirSync, readFileSync, existsSync } from "fs";
import http from "http";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "qa-screenshots", "compositor");
mkdirSync(outDir, { recursive: true });
const MIME = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".png": "image/png", ".otf": "font/otf" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(req.url.split("?")[0]); if (p === "/") p = "/index.html";
  const file = join(root, p);
  if (!file.startsWith(root) || !existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "content-type": MIME[extname(file)] || "application/octet-stream" }); res.end(readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const URL = `http://127.0.0.1:${port}/index.html`;
const browser = await webkit.launch();

function snap() {
  const card0 = document.querySelector('#cards .card[data-i="0"]');
  const heroInner = document.querySelector("#hero .section__inner");
  const veil = document.getElementById("veil");
  return {
    lite: window.__XAVRO_LITE,
    veilDisplay: getComputedStyle(veil).display,
    heroRv: heroInner.style.getPropertyValue("--rv").trim(),
    card0mode: card0.style.getPropertyValue("--cmode").trim(),
    card0dim: card0.style.getPropertyValue("--cdim").trim(),
    card0transform: card0.style.transform,
    card0opacity: card0.style.opacity,
  };
}

async function run(label, ctxOpts, doScroll) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => { if (m.type() === "error") errors.push("console:" + m.text()); });
  await page.addInitScript(() => { window.__XAVRO_INSTANT = true; try { sessionStorage.setItem("xavro_seen", "1"); } catch (e) {} });
  await page.goto(URL, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  const total = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight);
  const stops = [["hero", 0.0], ["diagnosis", 0.13], ["system", 0.40], ["deliv", 0.60], ["cta", 0.97]];
  const rows = [];
  for (const [name, frac] of stops) {
    await page.evaluate((y) => window.scrollTo(0, y), Math.round(total * frac));
    await page.waitForTimeout(450);
    const f = await page.evaluate(snap);
    rows.push([name, f]);
    if (doScroll && (name === "hero" || name === "deliv")) await page.screenshot({ path: join(outDir, label + "-" + name + ".png") });
  }
  console.log(`\n=== ${label} === errors:${errors.length}`);
  if (errors.length) console.log(errors.slice(0, 5).join("\n"));
  const transforms = new Set(rows.map((r) => r[1].card0transform));
  console.log("LITE:", rows[0][1].lite, "| veilDisplay:", rows[0][1].veilDisplay,
    "| heroRv:", rows[0][1].heroRv, "| card0 --cmode:", rows[0][1].card0mode, "--cdim:", rows[0][1].card0dim);
  console.log("card0 transform distinct values across", rows.length, "stops:", transforms.size, "(animation works if >1 on touch)");
  for (const [n, f] of rows) console.log(`  ${n.padEnd(10)} op=${f.card0opacity || "-"}  tf=${(f.card0transform || "(none)").slice(0, 60)}`);
  await ctx.close();
}

await run("desktop", { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }, false);
await run("ipad", { viewport: { width: 1194, height: 834 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true }, true);
await browser.close(); server.close();
console.log("\nshots ->", outDir);
