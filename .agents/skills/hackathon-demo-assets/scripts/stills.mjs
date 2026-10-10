// Stills of judge-facing pages at desktop and phone size, from the real deployed UI.
// Scrolls each page so scroll-triggered sections render, saves viewport shots down the page plus a
// full-page shot, and reports horizontal overflow and console errors per page.
//
//   node stills.mjs <baseUrl> <outDir> [path ...]      (run from the project root)
//   node stills.mjs https://myapp.tech docs/stills/raw / /judge /shop
//
// Needs @playwright/test (or playwright) installed in the project, plus `npx playwright install chromium`.
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

// resolve Playwright from the project (cwd), not from this skill's folder
const projectRequire = createRequire(path.join(process.cwd(), "package.json"));
let chromium;
for (const name of ["@playwright/test", "playwright"]) {
  try {
    const mod = await import(pathToFileURL(projectRequire.resolve(name)).href);
    chromium = mod.chromium ?? mod.default?.chromium;
    if (chromium) break;
  } catch {
    // try the next package name
  }
}
if (!chromium) {
  console.error("Playwright not found in this project. Run: npm i -D @playwright/test && npx playwright install chromium");
  process.exit(2);
}

const [base = "http://127.0.0.1:3000", out = "docs/stills/raw", ...paths] = process.argv.slice(2);
const pages = paths.length ? paths : ["/"];
fs.mkdirSync(out, { recursive: true });

const sizes = [
  { name: "desk", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, isMobile: false },
  { name: "phone", viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true },
];

let count = 0;
let problems = 0;
const browser = await chromium.launch();
for (const s of sizes) {
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.deviceScaleFactor, isMobile: s.isMobile, hasTouch: s.isMobile });
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  page.on("pageerror", (e) => errors.push(String(e)));
  for (const p of pages) {
    const slug = p.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "home";
    await page.goto(base.replace(/\/$/, "") + p, { waitUntil: "load" });
    await page.waitForTimeout(2500);
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    let i = 0;
    for (let y = 0; y < height; y += Math.round(s.viewport.height * 0.8)) {
      await page.evaluate((yy) => window.scrollTo(0, yy), y);
      await page.waitForTimeout(800);
      await page.screenshot({ path: path.join(out, `${s.name}-${slug}-${String(i++).padStart(2, "0")}.png`) });
      count++;
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(out, `${s.name}-${slug}-full.png`), fullPage: true });
    count++;
    // compare against the device width: mobile emulation zooms out, so innerWidth grows with wide content
    const overflow = await page.evaluate(
      (w) => Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) - w,
      s.viewport.width,
    );
    if (overflow > 0 || errors.length) problems++;
    console.log(`${s.name} ${p}: ${i} shots, horizontal overflow ${overflow}px, console errors ${errors.length}`);
    for (const e of errors) console.log("   ERROR", e.slice(0, 200));
    errors.length = 0;
  }
  await ctx.close();
}
await browser.close();
if (!count) {
  console.error("no stills written");
  process.exit(1);
}
console.log(`${count} stills in ${out}; ${problems} page/size combination(s) with overflow or console errors`);
