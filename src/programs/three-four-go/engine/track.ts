import { readLogic, SURFACE, type SurfaceCode } from "../data/palette";
import type { TrackDefinition, TrackInfo } from "../data/tracks";
import { loadImageData, type Texture, textureFromImageData } from "./texture";

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
};

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
  };
}

/** Surface under a point; beyond the map's edge it's grass. */
export function surfaceAt(track: Track, x: number, y: number): SurfaceCode {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (tx < 0 || ty < 0 || tx >= track.width || ty >= track.height) return SURFACE.grass;
  return track.surfaces[ty * track.width + tx] as SurfaceCode;
}
