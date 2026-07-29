// Checks every real text/background pairing used in the app against WCAG AA
// (4.5:1 for normal text, 3:1 for large text and icon-only graphics). Run with
// `npx tsx scripts/verify-contrast.ts` after any color/opacity change — this
// is how the round-8 bugs (invisible selected pills, sub-AA muted text) got
// found systematically instead of by re-screenshotting every screen by hand.

type RGB = [number, number, number];

function luminance([r, g, b]: RGB): number {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function ratio(c1: RGB, c2: RGB): number {
  const L1 = luminance(c1), L2 = luminance(c2);
  const [l, d] = L1 > L2 ? [L1, L2] : [L2, L1];
  return (l + 0.05) / (d + 0.05);
}
function blend(fg: RGB, bg: RGB, alpha: number): RGB {
  return [0, 1, 2].map((i) => fg[i] * alpha + bg[i] * (1 - alpha)) as RGB;
}

// Constants — mirrors tailwind.config.ts exactly.
const paper: RGB = [245, 239, 222];
const paperDim: RGB = [234, 225, 200];
const ink: RGB = [27, 42, 58];
const brass: RGB = [201, 162, 39];
const trump = {
  black: [26, 26, 26] as RGB,
  green: [47, 122, 61] as RGB,
  red: [178, 58, 50] as RGB,
  yellow: [227, 178, 60] as RGB,
};

// Theme-reactive — mirrors app/globals.css exactly, one entry per data-mode/data-accent combo.
const THEMES: { name: string; felt: RGB; feltDark: RGB; parchment: RGB }[] = [
  { name: "dark+green", felt: [23, 60, 49], feltDark: [14, 39, 31], parchment: paper },
  { name: "dark+blue", felt: [21, 50, 74], feltDark: [12, 32, 50], parchment: paper },
  { name: "dark+mono", felt: [43, 43, 42], feltDark: [26, 26, 25], parchment: paper },
  { name: "light+green", felt: [191, 224, 199], feltDark: [159, 205, 170], parchment: ink },
  { name: "light+blue", felt: [191, 217, 240], feltDark: [156, 194, 232], parchment: ink },
  { name: "light+mono", felt: [217, 217, 212], feltDark: [196, 196, 190], parchment: ink },
];

let failures = 0;
function check(label: string, fg: RGB, bg: RGB, minRatio: number) {
  const r = ratio(fg, bg);
  const pass = r >= minRatio;
  if (!pass) failures++;
  console.log(`${pass ? "PASS" : "FAIL"}  ${label.padEnd(55)} ratio=${r.toFixed(2)} (need ${minRatio})`);
}

console.log("--- Constant pairings (theme-independent) ---");
check("ink text on paper", ink, paper, 4.5);
check("ink text on paper-dim", ink, paperDim, 4.5);
check("ink text on brass (buttons)", ink, brass, 4.5);
check("white text on trump-black (trump card)", [255, 255, 255], trump.black, 4.5);
check("white text on trump-green (trump card)", [255, 255, 255], trump.green, 4.5);
check("white text on trump-red (trump card)", [255, 255, 255], trump.red, 4.5);
check("ink text on trump-yellow (trump card)", ink, trump.yellow, 4.5);
check("paper text on ink (selected pills)", paper, ink, 4.5);
check("trump-red text on paper (validation messages)", trump.red, paper, 4.5);
check("trump-red text on white (dev-mode warning badges/messages)", trump.red, [255, 255, 255], 4.5);
check(
  "swatch ring (white/70) on selected ink pill — was ring-black/15, invisible",
  blend([255, 255, 255], ink, 0.7),
  ink,
  3.0
);

console.log("\n--- Theme-reactive: parchment text on felt, every mode\u00d7accent combo ---");
for (const t of THEMES) {
  check(`parchment on felt (${t.name})`, t.parchment, t.felt, 4.5);
  check(`parchment on felt-dark (${t.name}, mobile sheet)`, t.parchment, t.feltDark, 4.5);
}

console.log("\n--- Invite banner: brass/20 tint over felt, parchment text ---");
for (const t of THEMES) {
  const bg = blend([201, 162, 39], t.felt, 0.2);
  check(`parchment on brass/20-over-felt (${t.name})`, t.parchment, bg, 4.5);
}

console.log("\n--- Muted text: the 75% opacity floor established in round 8 ---");
for (const t of THEMES) {
  const muted = blend(t.parchment, t.felt, 0.75);
  check(`parchment/75 on felt (${t.name})`, muted, t.felt, 4.5);
}
check("ink/75 on paper (muted labels)", blend(ink, paper, 0.75), paper, 4.5);
check("ink/75 on paper-dim (muted labels)", blend(ink, paperDim, 0.75), paperDim, 4.5);

console.log(`\n${failures === 0 ? "All contrast checks passed." : `${failures} FAILURE(S) — fix before shipping.`}`);

// --- Automated structural scan ---
// The numeric checks above only cover pairings someone remembered to list.
// That's failed twice now (ScorecardModal.tsx and two spots in
// Scoreboard.tsx all shipped with bg-ink + text-parchment — invisible
// navy-on-navy in light mode — despite two prior manual sweeps). This scans
// every actual component file for that literal className co-occurrence
// instead of relying on a maintained list, so it can't be missed a third
// time by forgetting to check a file.
import { readdirSync, readFileSync } from "fs";
import { join } from "path";

console.log("\n--- Automated scan: bg-ink + text-parchment co-occurrence (the recurring bug) ---");
let structuralFailures = 0;
for (const dir of ["components", "app"]) {
  for (const file of readdirSync(dir, { recursive: true }) as string[]) {
    if (!file.endsWith(".tsx")) continue;
    const path = join(dir, file);
    const lines = readFileSync(path, "utf-8").split("\n");
    lines.forEach((line, i) => {
      if (line.includes("bg-ink") && line.includes("text-parchment")) {
        console.log(`FAIL  ${path}:${i + 1} has both bg-ink and text-parchment — will be invisible in light mode`);
        structuralFailures++;
      }
    });
  }
}
if (structuralFailures === 0) console.log("PASS  no bg-ink + text-parchment found in any component");
failures += structuralFailures;

console.log(`\n${failures === 0 ? "All checks passed." : `${failures} total FAILURE(S) — fix before shipping.`}`);
process.exitCode = failures === 0 ? 0 : 1;
