/**
 * Positions of camera parts, as fractions (0–1) of the camera photo's width
 * and height, so they hold for any rendered size or asset resolution.
 *
 * Measured on the original 2534×2537 `polaroid-open.png`.
 */
export type Region = {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Corner radius as a fraction of the region's own width/height. */
  radius: { x: number; y: number };
};

const SOURCE = { width: 2534, height: 2537 };

function fromPixels(
  left: number,
  top: number,
  right: number,
  bottom: number,
  radius: number,
): Region {
  const width = right - left;
  const height = bottom - top;
  return {
    left: left / SOURCE.width,
    top: top / SOURCE.height,
    width: width / SOURCE.width,
    height: height / SOURCE.height,
    radius: { x: radius / width, y: radius / height },
  };
}

/** The selfie mirror's glass, left of the lens. */
export const MIRROR = fromPixels(1246, 1550, 1459, 1814, 30);

/** The round shutter button, front left (its outer ring). */
export const SHUTTER = fromPixels(462, 860, 778, 1176, 158);

const pct = (fraction: number) => `${fraction * 100}%`;

/** Absolute-positioning styles placing an element over a region of the photo. */
export function regionStyle(region: Region) {
  return {
    left: pct(region.left),
    top: pct(region.top),
    width: pct(region.width),
    height: pct(region.height),
    borderRadius: `${pct(region.radius.x)} / ${pct(region.radius.y)}`,
  };
}
