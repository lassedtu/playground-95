import { readLogic, SURFACE, type SurfaceCode } from "../data/palette";
import type { TrackDefinition, TrackInfo } from "../data/tracks";
import { loadImageData, type Texture, textureFromImageData } from "./texture";
import type { Vec2 } from "./vector";

/**
 * A checkpoint stripe across the road (index 0 is the finish line): its
 * middle, both ends (where it meets the road's edges), and the direction
 * you drive through it in.
 */
export type Checkpoint = { centre: Vec2; a: Vec2; b: Vec2; forward: Vec2 };

export type Track = TrackInfo & {
  id: string;
  width: number;
  height: number;
  ground: Texture;
  /** The logic layer as an image, for the debug view. */
  logicImage: Texture;
  /** Surface per map pixel (see data/palette.ts). */
  surfaces: Uint8Array;
  /** 0 = finish line, n = checkpoint n, −1 = neither, per map pixel. */
  checkpoints: Int16Array;
  /** Finish line first, then checkpoints in driving order. */
  gates: Checkpoint[];
};

/**
 * Measures each stripe from its pixels on the road: the middle is their
 * average, the stripe runs along their longest spread (principal axis), and
 * forwards points from the stripe towards the next one.
 */
export function measureGates(width: number, surfaces: Uint8Array, checkpoints: Int16Array): Checkpoint[] {
  const sums = new Map<number, { n: number; x: number; y: number; xx: number; yy: number; xy: number; points: Vec2[] }>();
  for (let i = 0; i < checkpoints.length; i++) {
    const id = checkpoints[i];
    if (id < 0 || surfaces[i] !== SURFACE.road) continue;
    const x = (i % width) + 0.5;
    const y = Math.floor(i / width) + 0.5;
    const s = sums.get(id) ?? { n: 0, x: 0, y: 0, xx: 0, yy: 0, xy: 0, points: [] };
    s.n++;
    s.x += x;
    s.y += y;
    s.xx += x * x;
    s.yy += y * y;
    s.xy += x * y;
    s.points.push({ x, y });
    sums.set(id, s);
  }
  const count = Math.max(...sums.keys()) + 1;
  const gates = Array.from({ length: count }, (_, id) => {
    const s = sums.get(id);
    if (!s) throw new Error(`Checkpoint ${id} has no road pixels`);
    const centre = { x: s.x / s.n, y: s.y / s.n };
    const cxx = s.xx / s.n - centre.x ** 2;
    const cyy = s.yy / s.n - centre.y ** 2;
    const cxy = s.xy / s.n - centre.x * centre.y;
    const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
    const axis = { x: Math.cos(angle), y: Math.sin(angle) };
    let lo = Infinity;
    let hi = -Infinity;
    for (const p of s.points) {
      const t = (p.x - centre.x) * axis.x + (p.y - centre.y) * axis.y;
      lo = Math.min(lo, t);
      hi = Math.max(hi, t);
    }
    return {
      centre,
      a: { x: centre.x + axis.x * lo, y: centre.y + axis.y * lo },
      b: { x: centre.x + axis.x * hi, y: centre.y + axis.y * hi },
      forward: { x: -axis.y, y: axis.x },
    };
  });
  // Point each gate's forward towards the next gate.
  gates.forEach((gate, i) => {
    const next = gates[(i + 1) % count].centre;
    if ((next.x - gate.centre.x) * gate.forward.x + (next.y - gate.centre.y) * gate.forward.y < 0) {
      gate.forward = { x: -gate.forward.x, y: -gate.forward.y };
    }
  });
  return gates;
}

/** Downloads a track's two layers and reads the logic layer. */
export async function loadTrack(definition: TrackDefinition): Promise<Track> {
  const [ground, logic] = await Promise.all([loadImageData(definition.ground.src), loadImageData(definition.logic.src)]);
  if (ground.width !== logic.width || ground.height !== logic.height) {
    throw new Error(`${definition.id}: the ground and logic layers aren't the same size`);
  }
  const { surfaces, checkpoints, inexact, examples } = readLogic(logic.width, logic.height, logic.data, 4);
  if (inexact && process.env.NODE_ENV === "development") {
    console.warn(`${definition.id}: ${inexact} logic pixels aren't exact palette colours, e.g.`, examples);
  }
  return {
    id: definition.id,
    name: definition.name,
    laps: definition.laps,
    lapLength: definition.lapLength,
    start: definition.start,
    width: logic.width,
    height: logic.height,
    ground: textureFromImageData(ground),
    logicImage: textureFromImageData(logic),
    surfaces,
    checkpoints,
    gates: measureGates(logic.width, surfaces, checkpoints),
  };
}

/** Finish line (0) or checkpoint number under a point, −1 for neither. */
export function checkpointAt(track: Track, x: number, y: number): number {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= track.width || ty >= track.height) return -1;
  return track.checkpoints[ty * track.width + tx];
}

/** Surface under a point; beyond the map's edge it's grass. */
export function surfaceAt(track: Track, x: number, y: number): SurfaceCode {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= track.width || ty >= track.height) return SURFACE.grass;
  return track.surfaces[ty * track.width + tx] as SurfaceCode;
}
