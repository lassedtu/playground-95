#!/usr/bin/env node
/**
 * Paints a 3-4-Go! track's ground texture from its logic layer, in the
 * track's theme (data/ground-style.ts, named in track.json): the road (with
 * kerbs along the edges and a chequered finish line), off-road ground,
 * walls, dirt, water and boost pads. Checkpoints are invisible. Needs
 * ImageMagick.
 *
 *   node scripts/three-four-go/paint-ground.mjs hill-climb
 *
 * Writes ground.webp next to logic.png. It's a starting point: paint over it
 * by hand if you like, as long as it stays lined up with the logic layer.
 */
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const { SURFACE, readLogic } = await import(`${root}src/programs/three-four-go/data/palette.ts`);
const style = await import(`${root}src/programs/three-four-go/data/ground-style.ts`);

const id = process.argv[2];
if (!id) throw new Error("Usage: paint-ground.mjs <track id>");
const dir = `${root}src/programs/three-four-go/data/tracks/${id}/`;
const { theme: themeName } = JSON.parse(readFileSync(`${dir}track.json`, "utf8"));
const theme = style.THEMES[themeName];
if (!theme) throw new Error(`Unknown theme "${themeName}"`);
const logicPath = `${dir}logic.png`;
const [width, height] = execFileSync("magick", ["identify", "-format", "%w %h", logicPath]).toString().split(" ").map(Number);
const raw = execFileSync("magick", [logicPath, "-depth", "8", "rgb:-"], { maxBuffer: width * height * 4 });
const { surfaces, checkpoints } = readLogic(width, height, raw, 3);

const ROADISH = new Set([SURFACE.road, SURFACE.boost]);
const KERB = theme.kerb.width;

// Distance (in pixels, up to the kerb width) from each road pixel to the nearest non-road pixel.
const edge = new Uint8Array(width * height).fill(255);
let frontier = [];
for (let i = 0; i < width * height; i++) {
  if (!ROADISH.has(surfaces[i])) {
    edge[i] = 0;
    frontier.push(i);
  }
}
for (let d = 1; d <= KERB && frontier.length; d++) {
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

const shade = ([r, g, b], amount) => [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c + amount))));
const checker = (x, y, size) => (Math.floor(x / size) + Math.floor(y / size)) % 2;

const pixels = Buffer.alloc(width * height * 3);
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = y * width + x;
    const surface = surfaces[i];
    let rgb;
    if (checkpoints[i] === 0 && ROADISH.has(surface)) {
      rgb = checker(x, y, style.FINISH_SQUARE) ? style.FINISH.dark : style.FINISH.light;
    } else if (ROADISH.has(surface) && edge[i] <= KERB) {
      rgb = checker(x, y, theme.kerb.block) ? theme.kerb.a : theme.kerb.b;
    } else if (surface === SURFACE.road) {
      rgb = style.roadAt(theme, x, y);
    } else if (surface === SURFACE.boost) {
      rgb = Math.floor((x + y) / 6) % 2 ? style.BOOST : style.BOOST_STRIPE;
    } else if (surface === SURFACE.wall) {
      const joint = x % style.WALL_BLOCK === 0 || y % (style.WALL_BLOCK / 2) === 0;
      rgb = joint ? theme.wall.joint : shade(theme.wall.color, style.noise(x, y) * 4);
    } else if (surface === SURFACE.dirt) {
      rgb = shade(style.DIRT, style.noise(x, y) * 10);
    } else if (surface === SURFACE.out) {
      // Water, with lighter ripples here and there.
      const ripple = style.noise(x >> 3, y >> 1) > 0.85 ? 26 : 0;
      rgb = shade(theme.water, style.noise(x >> 1, y >> 1) * 8 + ripple);
    } else {
      rgb = style.offRoadAt(theme, x, y);
    }
    pixels.set(rgb, i * 3);
  }
}

const output = `${dir}ground.webp`;
execFileSync("magick", ["-size", `${width}x${height}`, "-depth", "8", "rgb:-", "-strip", "-quality", "90", output], {
  input: pixels,
});
console.log(`Painted ${output} (${themeName})`);
