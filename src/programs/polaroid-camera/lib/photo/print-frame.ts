import frameAsset from "../../assets/print-frame.webp";

import { get2d } from "./capture";
import { PICTURE_BLEED, PRINT_FRAME } from "./instax-mini";

let framePromise: Promise<HTMLImageElement> | null = null;

/** Loads and decodes the frame image once; safe to call early to preload. */
export function loadPrintFrame(): Promise<HTMLImageElement> {
  framePromise ??= (async () => {
    const image = new Image();
    image.src = frameAsset.src;
    await image.decode();
    return image;
  })().catch((error: unknown) => {
    framePromise = null; // allow a retry
    throw error;
  });
  return framePromise;
}

/**
 * Puts a developed picture into the photographed Instax frame: the picture
 * goes underneath, showing through the frame's cut-out, so the real paper
 * edge, texture and lighting sit on top. Outside the card stays transparent.
 */
export async function composeInstaxPrint(picture: CanvasImageSource): Promise<HTMLCanvasElement> {
  const frame = await loadPrintFrame();
  const { width, height, picture: area } = PRINT_FRAME;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = get2d(canvas);

  ctx.drawImage(
    picture,
    area.left - PICTURE_BLEED,
    area.top - PICTURE_BLEED,
    area.width + PICTURE_BLEED * 2,
    area.height + PICTURE_BLEED * 2,
  );

  // A soft inner shadow, as if the picture sits slightly below the paper.
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.left, area.top, area.width, area.height);
  ctx.clip();
  ctx.shadowColor = "rgb(0 0 0 / 0.3)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.strokeStyle = "black";
  ctx.lineWidth = 6;
  ctx.strokeRect(area.left - 3, area.top - 3, area.width + 6, area.height + 6);
  ctx.restore();

  ctx.drawImage(frame, 0, 0, width, height);
  return canvas;
}
