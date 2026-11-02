/**
 * An image as raw pixels, ready for per-pixel sampling. One 32-bit value per
 * pixel in the same byte order as `ImageData` (RGBA in memory), so pixels can
 * be copied straight into the frame buffer.
 */
export type Texture = { width: number; height: number; pixels: Uint32Array };

export function textureFromCanvas(canvas: HTMLCanvasElement): Texture {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D isn't available");
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return { width: canvas.width, height: canvas.height, pixels: new Uint32Array(data.buffer) };
}

/** Packs a colour into the frame buffer's pixel format (little-endian RGBA). */
export const rgb = (r: number, g: number, b: number) => ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;

/** Downloads and decodes an image into raw RGBA pixels. */
export async function loadImageData(url: string): Promise<ImageData> {
  const image = new Image();
  image.src = url;
  await image.decode();
  const { ctx } = makeCanvas(image.naturalWidth, image.naturalHeight);
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.naturalWidth, image.naturalHeight);
}

export const textureFromImageData = ({ width, height, data }: ImageData): Texture => ({
  width,
  height,
  pixels: new Uint32Array(data.buffer.slice(0)),
});

/** A canvas to draw a texture on, with its 2D context. */
export function makeCanvas(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D isn't available");
  return { canvas, ctx };
}
