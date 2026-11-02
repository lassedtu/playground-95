#!/usr/bin/env node
/**
 * Paints a 3-4-Go! track's ground texture from its logic layer: noisy
 * asphalt with red/white kerbs along the edges, chequered grass, a chequered
 * finish line, concrete walls, dirt, water and boost pads. Checkpoints are
 * invisible. Needs ImageMagick.
 *
 *   node scripts/three-four-go/paint-ground.mjs desktop-circuit
 *
 * Writes ground.webp next to logic.png. It's a starting point: paint over it
 * by hand if you like, as long as it stays lined up with the logic layer.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { SURFACE, readLogic } = await import(`${root}src/programs/three-four-go/data/palette.ts`);
const style = await import(`${root}src/programs/three-four-go/data/ground-style.ts`);

const id = process.argv[2];
if (!id) throw new Error("Usage: paint-ground.mjs <track id>");
const dir = `${root}src/programs/three-four-go/data/tracks/${id}/`;
const logicPath = `${dir}logic.png`;
const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", logicPath]).toString().split(" ").map(Number);
const raw = execFileSync("magick", [logicPath, "-depth", "8", "rgb:-"], { maxBuffer: width * height * 4 });
const { surfaces, checkpoints } = readLogic(width, height, raw, 3);

const ROADISH = new Set([SURFACE.road, SURFACE.boost]);

// Distance (in pixels, up to KERB_WIDTH) from each road pixel to the nearest non-road pixel.
const edge = new Uint8Array(width * height).fill(255);
let frontier = [];
for (let i = 0; i < width * height; i++) {
  if (!ROADISH.has(surfaces[i])) {
    edge[i] = 0;
    frontier.push(i);
  }
}
for (let d = 1; d <= style.KERB_WIDTH && frontier.length; d++) {
  const next = [];
  for (const i of frontier) {
    const x = i % width;
    const y = (i - x) / width;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
        const j = ny * width + nx;
        if (edge[j] > d) {
          edge[j] = d;
          next.push(j);
        }
      }
    }
  }
  frontier = next;
}

/** Small fixed per-pixel noise, −1 to 1. */
const noise = (x, y) => {
  let h = Math.imul(x, 374761393) ^ Math.imul(y, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return (((h ^ (h >>> 16)) >>> 0) / 4294967295) * 2 - 1;
};
const shade = ([r, g, b], amount) => [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c + amount))));
const checker = (x, y, size) => (Math.floor(x / size) + Math.floor(y / size)) % 2;

const pixels = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const surface = surfaces[i];
    let rgb;
    if (checkpoints[i] === 0 && ROADISH.has(surface)) {
      rgb = checker(x, y, style.FINISH_SQUARE) ? style.FINISH_DARK : style.FINISH_LIGHT;
    } else if (ROADISH.has(surface) && edge[i] <= style.KERB_WIDTH) {
      rgb = checker(x, y, style.KERB_BLOCK) ? style.KERB_RED : style.KERB_WHITE;
    } else if (surface === SURFACE.road) {
      rgb = shade(style.ASPHALT, noise(x, y) * style.ASPHALT_NOISE);
    } else if (surface === SURFACE.boost) {
      rgb = Math.floor((x + y) / 6) % 2 ? style.BOOST : style.BOOST_STRIPE;
    } else if (surface === SURFACE.wall) {
      const joint = x % style.WALL_BLOCK === 0 || y % (style.WALL_BLOCK / 2) === 0;
      rgb = joint ? style.WALL_JOINT : shade(style.WALL, noise(x, y) * 4);
    } else if (surface === SURFACE.dirt) {
      rgb = shade(style.DIRT, noise(x, y) * 10);
    } else if (surface === SURFACE.out) {
      rgb = shade(style.WATER, noise(x >> 1, y >> 1) * 8);
    } else {
      rgb = style.grassAt(x, y);
    }
    pixels.set(rgb, i * 3);
  }
}

const output = `${dir}ground.webp`;
execFileSync("magick", ["-size", `${width}x${height}`, "-depth", "8", "rgb:-", "-strip", "-quality", "90", output], {
  input: pixels,
});
console.log(`Painted ${output}`);
