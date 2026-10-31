import type { Film } from "./films";
import { composeInstaxPrint } from "./print-frame";

export { captureFrame } from "./capture";

/**
 * Develops a captured picture with the film, frames it and encodes a PNG
 * (PNG keeps the card's surroundings transparent).
 *
 * Capturing is separate (`captureFrame`) so the caller controls exactly when
 * the frame is grabbed, e.g. in sync with the flash.
 */
export async function developPrint(picture: HTMLCanvasElement, film: Film): Promise<Blob> {
  const developed = await film.develop(picture);
  const print = await composeInstaxPrint(developed);
  return canvasToBlob(print, "image/png");
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode photo."))),
      type,
    );
  });
}
