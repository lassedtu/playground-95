import type { CSSProperties } from "react";

/**
 * Positions of camera parts, as fractions (0–1) of a camera photo's width
 * and height, so they hold for any rendered size or asset resolution.
 *
 * Measured on the original photos in `polaroid-assets/`.
 */
export type Region = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Corner radius as a fraction of the region's own width/height. */
  radius: { x: number; y: number };
};

type Size = { width: number; height: number };

/** Builds regions from pixel coordinates measured on a source photo. */
function measuredOn(source: Size) {
  return (left: number, top: number, right: number, bottom: number, radius = 0): Region => {
    const width = right - left;
    const height = bottom - top;
    return {
      left: left / source.width,
      top: top / source.height,
      width: width / source.width,
      height: height / source.height,
      radius: { x: radius / width, y: radius / height },
    };
  };
}

// --- Front: polaroid-open.png (2534×2537) ---
const front = measuredOn({ width: 2534, height: 2537 });

/** The selfie mirror's glass, left of the lens. */
export const MIRROR = front(1246, 1550, 1459, 1814, 30);

/** The round shutter button, front left (its outer ring). */
export const SHUTTER = front(462, 860, 778, 1176, 158);

/** The camera body, without the strap (left) and the lens bulge (right). */
export const FRONT_BODY = front(347, 9, 2457, 2521);

// --- Back: polaroid-back.png (2181×2576) ---
const back = measuredOn({ width: 2181, height: 2576 });

/** The camera body. Same aspect as FRONT_BODY (0.841 vs 0.840), so they line up. */
export const BACK_BODY = back(36, 9, 2168, 2544);

const pct = (fraction: number) => `${fraction * 100}%`;

/** Absolute-positioning styles placing an element over a region of a photo. */
export function regionStyle(region: Region): CSSProperties {
  return {
    left: pct(region.left),
    top: pct(region.top),
    width: pct(region.width),
    height: pct(region.height),
    borderRadius: `${pct(region.radius.x)} / ${pct(region.radius.y)}`,
  };
}

/**
 * The inverse of `regionStyle`: sizes and positions a whole photo so that
 * `body` exactly fills the parent. Used to align front and back photos on
 * the same body box, so turning the camera around lines up.
 */
export function fillWithRegion(body: Region): CSSProperties {
  return {
    left: pct(-body.left / body.width),
    top: pct(-body.top / body.height),
    width: pct(1 / body.width),
    height: pct(1 / body.height),
  };
}
