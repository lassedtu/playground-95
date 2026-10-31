/**
 * Film looks as plain numbers, applied per pixel on the CPU.
 *
 * One function serves both the live mirror preview (tiny canvas, every
 * frame) and the final photo (once, ~1M pixels in a few tens of ms), so the
 * mirror shows exactly what the print will look like. Canvas `ctx.filter`
 * isn't used because Safari doesn't support it reliably.
 */
export type RGB = readonly [r: number, g: number, b: number];

export type FilmLook = {
  /** Brightness multiplier. 1 = unchanged. */
  exposure: number;
  /** Contrast around mid-grey. 1 = unchanged. */
  contrast: number;
  /** 0 = black & white, 1 = unchanged, >1 = more vivid. */
  saturation: number;
  /** Colour multiplier after saturation, e.g. a warm or cold cast. [1, 1, 1] = none. */
  tone: RGB;
  /** Darkest output level (0–1). Raising it gives faded, lifted blacks. */
  blacks: number;
  /** Brightest output level (0–1). Lowering it softens highlights. */
  whites: number;
  /** Colour pushed into the shadows / highlights (−1…1 per channel). */
  shadowTint: RGB;
  highlightTint: RGB;
  /** Corner darkening, 0–1. */
  vignette: number;
  /** Film grain strength, 0–1. */
  grain: number;
};

const LUT_SIZE = 1024;
const lutCache = new WeakMap<FilmLook, Float32Array>();

/** Exposure -> contrast -> black/white levels, precomputed as a lookup table. */
function toneCurve(look: FilmLook): Float32Array {
  let lut = lutCache.get(look);
  if (lut) return lut;
  lut = new Float32Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    let v = (i / (LUT_SIZE - 1)) * look.exposure;
    v = (v - 0.5) * look.contrast + 0.5;
    v = Math.min(1, Math.max(0, v));
    lut[i] = look.blacks + v * (look.whites - look.blacks);
  }
  lutCache.set(look, lut);
  return lut;
}

/** Applies a film look to image data in place. */
export function applyFilmLook(image: ImageData, look: FilmLook): void {
  const { data, width, height } = image;
  const lut = toneCurve(look);
  const lutMax = LUT_SIZE - 1;
  const [toneR, toneG, toneB] = look.tone;
  const [shR, shG, shB] = look.shadowTint;
  const [hiR, hiG, hiB] = look.highlightTint;
  const sat = look.saturation;
  const grain = look.grain * 0.18;
  const vignette = look.vignette;
  const cx = (width - 1) / 2;
  const cy = (height - 1) / 2;

  // xorshift32: fast, good enough for grain.
  let seed = (Math.random() * 0xffffffff) | 1;

  for (let y = 0; y < height; y++) {
    const ny = cy ? (y - cy) / cy : 0;
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      let r = data[i] / 255;
      let g = data[i + 1] / 255;
      let b = data[i + 2] / 255;

      // Saturation, then tone (colour cast), around Rec. 601 luma.
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      r = (luma + (r - luma) * sat) * toneR;
      g = (luma + (g - luma) * sat) * toneG;
      b = (luma + (b - luma) * sat) * toneB;

      // Tone curve.
      r = lut[Math.round(Math.min(1, Math.max(0, r)) * lutMax)];
      g = lut[Math.round(Math.min(1, Math.max(0, g)) * lutMax)];
      b = lut[Math.round(Math.min(1, Math.max(0, b)) * lutMax)];

      // Split toning: weights fall off towards mid-grey.
      const l = 0.299 * r + 0.587 * g + 0.114 * b;
      const ws = (1 - l) * (1 - l);
      const wh = l * l;
      r += shR * ws + hiR * wh;
      g += shG * ws + hiG * wh;
      b += shB * ws + hiB * wh;

      // Vignette: smooth falloff from ~40% of the way to the corners.
      if (vignette > 0) {
        const nx = cx ? (x - cx) / cx : 0;
        const d = Math.sqrt((nx * nx + ny * ny) / 2);
        const t = Math.min(1, Math.max(0, (d - 0.4) / 0.6));
        const k = 1 - vignette * t * t * (3 - 2 * t);
        r *= k;
        g *= k;
        b *= k;
      }

      // Monochromatic grain, strongest in the midtones like real film.
      if (grain > 0) {
        seed ^= seed << 13;
        seed ^= seed >>> 17;
        seed ^= seed << 5;
        const noise = ((seed >>> 0) / 0xffffffff - 0.5) * grain * (0.4 + 2.4 * l * (1 - l));
        r += noise;
        g += noise;
        b += noise;
      }

      data[i] = r * 255; // Uint8ClampedArray clamps and rounds.
      data[i + 1] = g * 255;
      data[i + 2] = b * 255;
    }
  }
}

/** Applies a look to a canvas's pixels in place and returns the canvas. */
export function developCanvas(canvas: HTMLCanvasElement, look: FilmLook): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D is not available.");
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  applyFilmLook(image, look);
  ctx.putImageData(image, 0, 0);
  return canvas;
}
