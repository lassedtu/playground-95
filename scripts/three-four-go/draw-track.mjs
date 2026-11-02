#!/usr/bin/env node
/**
 * Draws a 3-4-Go! track's logic layer from a design in ./designs/, and writes
 * its track.json (name, laps, start grid). Needs ImageMagick (`magick`).
 *
 *   node scripts/three-four-go/draw-track.mjs desktop-circuit
 *
 * The road is a smooth closed curve (Catmull-Rom through the design's
 * points). Checkpoint stripes go straight across it, evenly spaced along the
 * lap, with the finish line as checkpoint 0. Then run check-track.mjs and
 * paint-ground.mjs for the same track.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { SURFACE, PALETTE, checkpointColor } = await import(`${root}src/programs/three-four-go/data/palette.ts`);

const id = process.argv[2];
if (!id) throw new Error("Usage: draw-track.mjs <track id>");
const design = (await import(`./designs/${id}.mjs`)).default;
const out = `${root}src/programs/three-four-go/data/tracks/${id}/`;
mkdirSync(out, { recursive: true });

const SAMPLES_PER_POINT = 48;
/** Half-thickness of a checkpoint stripe and of the finish line, along the road. */
const CHECKPOINT_HALF = 3;
const FINISH_HALF = 4;
/**
 * Stripes reach this far onto the grass beside the road, so cutting a corner
 * over the grass still crosses them. (They stop by themselves where another
 * part of the road is closer.)
 */
const STRIPE_REACH = 56;
/** Start grid: distance behind the finish line, gap between rows, sideways offset. */
const GRID = { behind: 22, row: 22, stagger: 11, side: 14 };

const { size, roadWidth, border, points } = design;
const half = roadWidth / 2;

// 1. Sample the closed curve.
const curve = [];
for (let i = 0; i < points.length; i++) {
  const [p0, p1, p2, p3] = [-1, 0, 1, 2].map((k) => points[(i + k + points.length) % points.length]);
  for (let s = 0; s < SAMPLES_PER_POINT; s++) {
    const t = s / SAMPLES_PER_POINT;
    const t2 = t * t;
    const t3 = t2 * t;
    const at = (k) =>
      0.5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3);
    curve.push([at(0), at(1)]);
  }
}
const count = curve.length;
const arc = [0];
for (let i = 1; i <= count; i++) {
  const [ax, ay] = curve[i - 1];
  const [bx, by] = curve[i % count];
  arc.push(arc[i - 1] + Math.hypot(bx - ax, by - ay));
}
const lapLength = arc[count];
// Distances along the lap are measured from the finish line.
const finishArc = arc[Math.round(design.finish * SAMPLES_PER_POINT)];
const fromFinish = (s) => (((s - finishArc) % lapLength) + lapLength) % lapLength;
const lapDistance = (a, b) => Math.min(Math.abs(a - b), lapLength - Math.abs(a - b));
const checkpointArcs = Array.from({ length: design.checkpoints }, (_, k) => ((k + 1) * lapLength) / (design.checkpoints + 1));

// 2. The road must not touch itself: far-apart parts of the lap need grass between them.
for (let i = 0; i < count; i += 4) {
  for (let j = i + 4; j < count; j += 4) {
    if (lapDistance(arc[i], arc[j]) < roadWidth * 3) continue;
    const gap = Math.hypot(curve[i][0] - curve[j][0], curve[i][1] - curve[j][1]);
    if (gap < roadWidth + 24) {
      throw new Error(`Road comes too close to itself near (${curve[i].map(Math.round)}) and (${curve[j].map(Math.round)})`);
    }
  }
}
for (const [x, y] of curve) {
  if (x - half < border + 8 || y - half < border + 8 || x + half > size - border - 8 || y + half > size - border - 8) {
    throw new Error(`Road runs into the border wall near (${Math.round(x)}, ${Math.round(y)})`);
  }
}

// 3. Bucket curve segments by 64 px cells, so each pixel only checks nearby ones.
const CELL = 64;
const cells = Math.ceil(size / CELL);
const buckets = Array.from({ length: cells * cells }, () => []);
for (let i = 0; i < count; i++) {
  const [ax, ay] = curve[i];
  const [bx, by] = curve[(i + 1) % count];
  const reach = half + STRIPE_REACH;
  const x0 = Math.max(0, Math.floor((Math.min(ax, bx) - reach) / CELL));
  const x1 = Math.min(cells - 1, Math.floor((Math.max(ax, bx) + reach) / CELL));
  const y0 = Math.max(0, Math.floor((Math.min(ay, by) - reach) / CELL));
  const y1 = Math.min(cells - 1, Math.floor((Math.max(ay, by) + reach) / CELL));
  for (let cy = y0; cy <= y1; cy++) for (let cx = x0; cx <= x1; cx++) buckets[cy * cells + cx].push(i);
}

/** Distance from (x, y) to the curve, and how far along the lap the closest point is. */
function nearest(x, y) {
  let best = Infinity;
  let along = 0;
  for (const i of buckets[Math.floor(y / CELL) * cells + Math.floor(x / CELL)] ?? []) {
    const [ax, ay] = curve[i];
    const [bx, by] = curve[(i + 1) % count];
    const dx = bx - ax;
    const dy = by - ay;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)));
    const distance = Math.hypot(x - ax - dx * t, y - ay - dy * t);
    if (distance < best) {
      best = distance;
      along = arc[i] + (arc[i + 1] - arc[i]) * t;
    }
  }
  return { distance: best, along: fromFinish(along) };
}

// 4. Paint the logic layer.
const colorOf = Object.fromEntries(PALETTE.map((entry) => [entry.surface, entry.rgb]));
const pixels = Buffer.alloc(size * size * 3);
for (let y = 0; y < size; y++) {
  for (let x = 0; x < size; x++) {
    let rgb = colorOf[SURFACE.grass];
    if (x < border || y < border || x >= size - border || y >= size - border) {
      rgb = colorOf[SURFACE.wall];
    } else {
      const { distance, along } = nearest(x + 0.5, y + 0.5);
      if (distance <= half) rgb = colorOf[SURFACE.road];
      if (distance <= half + STRIPE_REACH) {
        if (lapDistance(along, 0) <= FINISH_HALF) rgb = colorOf[SURFACE.finish];
        checkpointArcs.forEach((s, k) => {
          if (Math.abs(along - s) <= CHECKPOINT_HALF) rgb = checkpointColor(k + 1);
        });
      }
    }
    pixels.set(rgb, (y * size + x) * 3);
  }
}
execFileSync("magick", ["-size", `${size}x${size}`, "-depth", "8", "rgb:-", "-strip", `PNG24:${out}logic.png`], {
  input: pixels,
});

// 5. Start grid: two staggered columns behind the finish line, facing along the road.
function pointAt(s) {
  const target = (((s + finishArc) % lapLength) + lapLength) % lapLength;
  let i = 0;
  while (arc[i + 1] < target) i++;
  const t = (target - arc[i]) / (arc[i + 1] - arc[i]);
  const [ax, ay] = curve[i];
  const [bx, by] = curve[(i + 1) % count];
  const angle = Math.atan2(by - ay, bx - ax);
  return { x: ax + (bx - ax) * t, y: ay + (by - ay) * t, angle };
}
const start = Array.from({ length: 8 }, (_, i) => {
  const side = i % 2 ? 1 : -1;
  const p = pointAt(-(GRID.behind + Math.floor(i / 2) * GRID.row + (i % 2) * GRID.stagger));
  // Right-hand side of the driving direction (map y points down).
  const x = p.x - Math.sin(p.angle) * GRID.side * side;
  const y = p.y + Math.cos(p.angle) * GRID.side * side;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10, angle: Math.round(p.angle * 1000) / 1000 };
});

writeFileSync(
  `${out}track.json`,
  `${JSON.stringify({ name: design.name, laps: design.laps, lapLength: Math.round(lapLength), start }, null, 2)}\n`,
);
console.log(`Drew ${id}: lap ${Math.round(lapLength)} px, ${design.checkpoints} checkpoints + finish, start grid of ${start.length}.`);
