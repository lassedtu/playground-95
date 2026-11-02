#!/usr/bin/env node
/**
 * Checks a 3-4-Go! track's logic layer, and strips any colour profile from it
 * (browsers may shift colours of images that have one). Needs ImageMagick.
 *
 *   node scripts/three-four-go/check-track.mjs hill-climb
 *
 * Fails when a pixel isn't exactly a palette colour, the finish line or a
 * checkpoint number is missing, or a start position isn't on the road.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { SURFACE, readLogic } = await import(`${root}src/programs/three-four-go/data/palette.ts`);

const id = process.argv[2];
if (!id) throw new Error("Usage: check-track.mjs <track id>");
const dir = `${root}src/programs/three-four-go/data/tracks/${id}/`;
const logicPath = `${dir}logic.png`;

execFileSync("magick", [logicPath, "-strip", `PNG24:${logicPath}`]);
const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", logicPath]).toString().split(" ").map(Number);
const raw = execFileSync("magick", [logicPath, "-depth", "8", "rgb:-"], { maxBuffer: width * height * 4 });
const logic = readLogic(width, height, raw, 3);
const problems = [];

if (logic.inexact) {
  const where = logic.examples.map(({ x, y, rgb }) => `(${x}, ${y}) = #${rgb.map((c) => c.toString(16).padStart(2, "0")).join("")}`);
  problems.push(`${logic.inexact} pixels aren't palette colours, e.g. ${where.join(", ")}`);
}

const found = new Set(logic.checkpoints.filter((c) => c >= 0));
if (!found.has(0)) problems.push("No finish line (#FFFFFF).");
const highest = Math.max(0, ...found);
for (let n = 1; n <= highest; n++) if (!found.has(n)) problems.push(`Checkpoint ${n} is missing (have up to ${highest}).`);

const track = JSON.parse(readFileSync(`${dir}track.json`, "utf8"));
track.start.forEach(({ x, y }, i) => {
  const surface = logic.surfaces[Math.floor(y) * width + Math.floor(x)];
  if (surface !== SURFACE.road) problems.push(`Start position ${i + 1} (${x}, ${y}) isn't on the road.`);
});

if (problems.length) {
  console.error(`${id}: ${problems.length} problem(s)\n- ${problems.join("\n- ")}`);
  process.exit(1);
}
console.log(`${id}: OK (${width}×${height}, finish + ${highest} checkpoints, ${track.start.length} start positions)`);
