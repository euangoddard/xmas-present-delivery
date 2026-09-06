/**
 * Regenerates public/og-image.png — the social card.
 *
 * The card is laid out in HTML so it can use the site's own fonts and palette,
 * with the font files inlined as data URIs because Chrome will not fetch a
 * file:// font from a file:// page. Rendered headless at exactly 1200x630.
 *
 *   node scripts/og-image.mjs
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CHROMES = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "/usr/bin/google-chrome",
  "/usr/bin/chromium",
  "/usr/bin/chromium-browser",
];

const b64 = (p) => readFileSync(p).toString("base64");
const face = (family, file, weight) =>
  `@font-face{font-family:"${family}";src:url(data:font/woff2;base64,${b64(file)}) format("woff2");font-weight:${weight};font-style:normal;font-display:block;}`;

const fonts = [
  face(
    "Bricolage Grotesque Variable",
    "node_modules/@fontsource-variable/bricolage-grotesque/files/bricolage-grotesque-latin-standard-normal.woff2",
    "200 800",
  ),
  face(
    "Source Serif 4 Variable",
    "node_modules/@fontsource-variable/source-serif-4/files/source-serif-4-latin-standard-normal.woff2",
    "200 900",
  ),
  face(
    "IBM Plex Mono",
    "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2",
    "500",
  ),
  face(
    "IBM Plex Mono",
    "node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-600-normal.woff2",
    "600",
  ),
].join("\n");

const MONTHS = [
  "Dec",
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const ticks = MONTHS.map((label, i) => {
  const pct = (i / (MONTHS.length - 1)) * 100;
  return `<div class="tick" style="left:${pct}%"><span class="stem"></span><span class="mon${i % 2 ? " dim" : ""}">${label}</span></div>`;
}).join("");

// Three objectives met at plausible points in the year, drawn the way the
// year rail draws its milestones.
const MILESTONES = [
  { pct: 34, colour: "var(--spruce)", label: "Sleigh" },
  { pct: 58, colour: "var(--brass)", label: "Reindeer" },
  { pct: 79, colour: "var(--brick)", label: "Presents" },
];
const milestones = MILESTONES.map(
  (m) =>
    `<div class="ms" style="left:${m.pct}%;--c:${m.colour}"><span class="dot"></span><span class="ms-label">${m.label}</span></div>`,
).join("");

const flakes = Array.from({ length: 46 }, (_, i) => {
  // Deterministic scatter: a fixed pattern beats a different picture per build.
  const x = (i * 97.3) % 100;
  const y = (i * 61.7) % 100;
  const r = 1.5 + ((i * 7) % 5) * 0.9;
  const o = 0.35 + ((i * 3) % 4) * 0.12;
  return `<circle cx="${x.toFixed(2)}%" cy="${y.toFixed(2)}%" r="${r}" fill="#fff" opacity="${o.toFixed(2)}"/>`;
}).join("");

const html = `<!doctype html>
<html><head><meta charset="utf-8"><style>
${fonts}
:root{
  --paper:#edf1f0;--surface:#f8fbfa;--ink:#101e1a;--ink-soft:#46574f;--ink-mute:#5a6862;
  --rule:#c9d7d3;--rule-firm:#a9bdb7;--brick:#b22222;--spruce:#1e4a3e;--brass:#835f12;
}
*{box-sizing:border-box;margin:0;padding:0}
body{width:1200px;height:630px;background:var(--paper);font-family:"Source Serif 4 Variable",Georgia,serif;color:var(--ink);overflow:hidden}
.frame{position:relative;width:1200px;height:630px;padding:40px}
.snow{position:absolute;inset:0}
.card{position:relative;height:100%;background:var(--surface);border:1px solid var(--rule);
  box-shadow:0 1px 2px rgb(16 30 26/.06),0 8px 24px -14px rgb(16 30 26/.28);
  padding:38px 56px 34px;display:flex;flex-direction:column}
.eyebrow{font-family:"IBM Plex Mono",monospace;font-weight:500;font-size:15px;letter-spacing:.16em;
  text-transform:uppercase;color:var(--ink-mute)}
.top{display:flex;align-items:center;justify-content:space-between;gap:24px;
  border-bottom:1px solid var(--rule);padding-bottom:18px}
.brandmark{display:flex;align-items:center;gap:16px}
.brandmark svg{display:block}
h1{font-family:"Bricolage Grotesque Variable","Helvetica Neue",sans-serif;font-weight:800;
  font-size:86px;line-height:.96;letter-spacing:-.028em;margin-top:30px}
.deck{margin-top:22px;max-width:830px;font-size:22px;line-height:1.5;color:var(--ink-soft)}
.deck strong{color:var(--ink);font-weight:600}
.rail{margin-top:auto;padding-top:22px;border-top:1px solid var(--rule)}
.rail-head{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:46px}
.scale{position:relative;height:44px}
.line{position:absolute;left:0;right:0;top:0;height:1px;background:var(--rule-firm)}
.tick{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
.stem{width:1px;height:9px;background:var(--rule-firm)}
.mon{margin-top:8px;font-family:"IBM Plex Mono",monospace;font-weight:500;font-size:13px;
  letter-spacing:.14em;color:var(--ink-mute)}
.mon.dim{opacity:.45}
.ms{position:absolute;top:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center}
.ms .dot{width:11px;height:11px;background:var(--c);margin-top:-5px;transform:rotate(45deg)}
.ms-label{position:absolute;bottom:22px;white-space:nowrap;font-family:"IBM Plex Mono",monospace;
  font-weight:600;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:var(--c)}
.head{position:absolute;top:-14px;bottom:2px;width:2px;background:var(--brick);left:88%}
.head::after{content:"";position:absolute;top:-6px;left:-4px;width:10px;height:10px;background:var(--brick)}
.tnum{font-variant-numeric:tabular-nums}
</style></head><body>
<div class="frame">
  <svg class="snow" width="1200" height="630">${flakes}</svg>
  <div class="card">
    <div class="top">
      <div class="brandmark">
        <svg width="40" height="40" viewBox="0 0 64 64">
          <rect width="64" height="64" fill="#b22222"/>
          <g fill="#eec468">
            <path d="M32 23C23 23 15.5 20 15.5 14.5S24 8.5 32 23Z"/>
            <path d="M32 23c9 0 16.5-3 16.5-8.5S40 8.5 32 23Z"/>
            <rect x="8" y="23" width="48" height="11"/>
            <rect x="28.5" y="36" width="7" height="21"/>
          </g>
          <path d="M8 23h20.5v11H8zM35.5 23H56v11H35.5z" fill="#fff"/>
          <path d="M12 36h16.5v21H12zM35.5 36H52v21H35.5z" fill="#fff"/>
        </svg>
        <span class="eyebrow">Present delivery · Christmas 2026</span>
      </div>
      <span class="eyebrow tnum">12 min 08 sec</span>
    </div>

    <h1>One year to<br/>save Christmas</h1>

    <p class="deck">Father Christmas came home to an empty workshop. You have from Boxing
      Day to Christmas Day — <strong>twelve real minutes</strong> — to put it right.</p>

    <div class="rail">
      <div class="rail-head">
        <span class="eyebrow">Boxing Day 2025 → Christmas Day 2026</span>
        <span class="eyebrow tnum">364 days · no pause</span>
      </div>
      <div class="scale">
        <div class="line"></div>
        ${ticks}
        ${milestones}
        <div class="head"></div>
      </div>
    </div>
  </div>
</div>
</body></html>`;

const chrome = CHROMES.find((path) => existsSync(path));
if (!chrome) {
  console.error(
    "No Chrome or Chromium found. Checked:\n  " + CHROMES.join("\n  "),
  );
  process.exit(1);
}

const scratch = mkdtempSync(join(tmpdir(), "og-"));
const page = join(scratch, "og.html");
const shot = join(scratch, "og.png");
writeFileSync(page, html);

execFileSync(
  chrome,
  [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--force-device-scale-factor=1",
    "--window-size=1200,630",
    `--screenshot=${shot}`,
    `file://${page}`,
  ],
  { stdio: "ignore" },
);

// Flat colour and type quantise to a palette with no visible banding, at
// roughly a third of the truecolour size. sharp only reaches us through
// qwik-city, so fall back to Chrome's own PNG if it ever stops shipping it.
try {
  const { default: sharp } = await import("sharp");
  await sharp(shot)
    .png({ compressionLevel: 9, palette: true })
    .toFile("public/og-image.png");
} catch {
  copyFileSync(shot, "public/og-image.png");
}
console.log("Wrote public/og-image.png");
