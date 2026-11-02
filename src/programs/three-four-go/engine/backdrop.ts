import { type GroundTheme, noise, offRoadAt } from "../data/ground-style";
import type { Sky } from "../data/skies";
import type { SkyLayer } from "./mode7";
import { loadImageData, rgb, type Texture, textureFromImageData } from "./texture";

const TILE = 64;

/**
 * What the game shows beyond the map's edge, tiled: the theme's off-road
 * ground (lined up with the painted ground, its chequer is 32 px), or sea.
 */
export function makeOutsideTile(theme: GroundTheme): Texture {
  const pixels = new Uint32Array(TILE * TILE);
  const [wr, wg, wb] = theme.water;
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      if (theme.beyond === "water") {
        const n = noise(x >> 1, y >> 1) * 8 + (noise(x >> 3, y >> 1) > 0.85 ? 26 : 0);
        const c = (v: number) => Math.max(0, Math.min(255, Math.round(v + n)));
        pixels[y * TILE + x] = rgb(c(wr), c(wg), c(wb));
      } else {
        pixels[y * TILE + x] = rgb(...offRoadAt(theme, x, y));
      }
    }
  }
  return { width: TILE, height: TILE, pixels };
}

/** A track's sky: its parallax layers decoded, and the fog colour. */
export type LoadedSky = { layers: SkyLayer[]; fog: number };

export async function loadSky(sky: Sky): Promise<LoadedSky> {
  const layers = await Promise.all(
    sky.layers.map(async (layer) => ({
      ...textureFromImageData(await loadImageData(layer.image.src)),
      sink: layer.sink,
      loops: layer.loops,
    })),
  );
  return { layers, fog: rgb(...sky.fog) };
}
