import { chromium } from "playwright";
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.addInitScript(() => { try { sessionStorage.setItem("xavro_seen","1"); } catch(e){} });
await p.goto("http://127.0.0.1:8123/index.html", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
const info = await p.evaluate(() => {
  const card = document.querySelector('#cards .card[data-i="1"]');
  const spine = card.querySelector('.card__spine');
  const label = card.querySelector('.card__sp-label');
  const cs = getComputedStyle(spine);
  const cl = getComputedStyle(label);
  const cardRect = card.getBoundingClientRect();
  const spineRect = spine.getBoundingClientRect();
  return {
    cardOpacity: card.style.opacity,
    cardCdetail: card.style.getPropertyValue('--cdetail'),
    cardTransform: card.style.transform.slice(0,60),
    cardRect: {x: Math.round(cardRect.x), y: Math.round(cardRect.y), w: Math.round(cardRect.width), h: Math.round(cardRect.height)},
    spineOpacity: cs.opacity,
    spineTransform: cs.transform,
    spineRect: {x: Math.round(spineRect.x), y: Math.round(spineRect.y), w: Math.round(spineRect.width), h: Math.round(spineRect.height)},
    labelColor: cl.color,
    labelFontSize: cl.fontSize,
    labelText: label.textContent,
    labelFontFamily: cl.fontFamily
  };
});
console.log(JSON.stringify(info, null, 2));
await b.close();
