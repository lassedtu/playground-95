#!/usr/bin/env node
/**
 * Prepares 3-4-Go!'s skies from "Nasha's Parallax Worlds" (free packs):
 * picks the layers each track uses, scales them to half size (box filter),
 * and writes them to assets/skies/<track>/ plus data/skies.ts. Needs
 * ImageMagick. Also writes previews of each sky band to the temp folder.
 *
 *   node scripts/three-four-go/pick-skies.mjs ["path/to/parallax_worlds"]
 *
 * Per layer: `sink` is how many (scaled) pixels of its bottom hide below
 * the horizon (behind the ground), `speed` how fast it turns with the
 * camera relative to the ground (lower = further away).
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../../", import.meta.url));
const pack = process.argv[2] ?? join(root, "ignored-assets", "parallax_worlds");
const program = join(root, "src/programs/three-four-go");
const assets = join(program, "assets/skies");

/** Rows of sky above the horizon at the game's camera tilt (see data/tuning.ts). */
const BAND = 56;
/** One full turn of the camera, in screen pixels at the screen's middle (the ground's rate). */
const TURN = 2 * Math.PI * (160 / Math.tan(Math.PI / 6));
const SCALE = 0.5;

const SKIES = [
  {
    id: "hill-climb",
    world: "castle_town",
    layers: [
      { file: "layer_1_sky", sink: 0, speed: 0.8 },
      { file: "layer_2_mountains", sink: 30, speed: 0.9 },
      { file: "layer_3_hills", sink: 50, speed: 1 },
    ],
  },
  {
    id: "winterland",
    world: "christmas_village",
    layers: [
      { file: "layer_1_sky", sink: 0, speed: 0.8 },
      { file: "layer_2_mountains", sink: 20, speed: 0.9 },
      { file: "layer_3_hills", sink: 24, speed: 1 },
    ],
  },
  {
    id: "beach-day",
    world: "coast",
    layers: [
      { file: "layer_1_sky", sink: 0, speed: 0.8 },
      { file: "layer_2_mountains", sink: 20, speed: 0.8 },
      { file: "layer_3_hills", sink: 18, speed: 0.9 },
      { file: "layer_4_forest", sink: 30, speed: 1 },
    ],
  },
  {
    id: "westico",
    world: "prairie_railroad",
    layers: [
      { file: "layer_1_sky", sink: 0, speed: 0.8 },
      { file: "layer_2_mountains", sink: 22, speed: 0.9 },
      { file: "layer_3_hills", sink: 20, speed: 1 },
    ],
  },
];

function findWorld(world) {
  for (const packDir of readdirSync(pack)) {
    const dir = join(pack, packDir, world, "320x180");
    try {
      readdirSync(dir);
      return dir;
    } catch {
      // not in this pack
    }
  }
  throw new Error(`Can't find ${world} in ${pack}`);
}

const size = (file) => execFileSync("magick", ["identify", "-format", "%w %h", file]).toString().split(" ").map(Number);

rmSync(assets, { recursive: true, force: true });
const previews = join(tmpdir(), "three-four-go-skies");
mkdirSync(previews, { recursive: true });

const imports = [];
const entries = SKIES.map((sky) => {
  const source = findWorld(sky.world);
  const out = join(assets, sky.id);
  mkdirSync(out, { recursive: true });
  const layers = sky.layers.map((layer, i) => {
    const file = `layer-${i + 1}.webp`;
    execFileSync("magick", [
      join(source, `${layer.file}.png`),
      "-filter", "box", "-resize", `${SCALE * 100}%`,
      "-define", "webp:lossless=true",
      join(out, file),
    ]);
    const [width, height] = size(join(out, file));
    // Whole loops per full turn, so the sky joins up seamlessly all the way round.
    const loops = Math.max(1, Math.round((TURN * layer.speed) / width));
    const id = `${sky.id.replace(/-(\w)/g, (_, c) => c.toUpperCase())}${i + 1}`;
    imports.push(`import ${id} from "../assets/skies/${sky.id}/${file}";`);
    return { id, width, height, sink: layer.sink, loops, out: join(out, file) };
  });

  // Preview of what the band shows (one screen width), and the colour at the
  // horizon: the ground's fog fades into it.
  const band = join(previews, `${sky.id}.png`);
  const args = ["-size", `320x${BAND}`, "xc:none"];
  for (const l of layers) args.push("(", l.out, "-write", "mpr:l", "+delete", "mpr:l", "mpr:l", "+append", ")", "-geometry", `+0+${BAND + l.sink - l.height}`, "-composite");
  execFileSync("magick", [...args, band]);
  const fog = execFileSync("magick", [band, "-crop", `320x4+0+${BAND - 4}`, "-resize", "1x1!", "-format", "%[fx:int(r*255)],%[fx:int(g*255)],%[fx:int(b*255)]", "info:"])
    .toString()
    .split(",")
    .map(Number);
  console.log(`${sky.id}: ${layers.map((l) => `${l.width}×${l.height}, ${l.loops} loops`).join(" | ")}; fog rgb(${fog})`);
  return `  "${sky.id}": {
    fog: [${fog.join(", ")}],
    layers: [
${layers.map((l) => `      { image: ${l.id}, sink: ${l.sink}, loops: ${l.loops} },`).join("\n")}
    ],
  },`;
});

execFileSync("magick", [...SKIES.map((s) => join(previews, `${s.id}.png`)), "-background", "#ff00ff", "-append", "-scale", "300%", join(previews, "all.png")]);

writeFileSync(
  join(program, "data/skies.ts"),
  `/**
 * Generated by scripts/three-four-go/pick-skies.mjs, don't edit by hand.
 *
 * Layers from "Nasha's Parallax Worlds" (free packs), used under their
 * license: part of this game only, not to be redistributed as assets.
 * Scaled to half size.
 */
import type { StaticImageData } from "next/image";

${imports.join("\n")}

export type SkyLayer = {
  image: StaticImageData;
  /** Pixels of its bottom hidden below the horizon. */
  sink: number;
  /** How many times it repeats in one full turn (more = closer, moves faster). */
  loops: number;
};

/** Back to front; \`fog\` is the colour at the horizon (distant ground fades into it). */
export type Sky = { fog: readonly [number, number, number]; layers: readonly SkyLayer[] };

export const SKIES: Record<string, Sky> = {
${entries.join("\n")}
};
`,
);
console.log(`Previews: ${join(previews, "all.png")}`);
