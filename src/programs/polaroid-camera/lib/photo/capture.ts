import { PICTURE_ASPECT, PICTURE_SIZE } from "./instax-mini";

export type Crop = { sx: number; sy: number; sw: number; sh: number };

/** Largest centered crop of a `width`×`height` source with the given aspect (w/h). */
export function coverCrop(width: number, height: number, aspect: number): Crop {
  let sw = width;
  let sh = height;
  if (width / height > aspect) sw = height * aspect;
  else sh = width / aspect;
  return { sx: (width - sw) / 2, sy: (height - sh) / 2, sw, sh };
}

export function hasFrame(video: HTMLVideoElement): boolean {
  return (
    video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
    video.videoWidth > 0 &&
    video.videoHeight > 0
  );
}

/**
 * Grabs the current video frame, center-cropped to the Instax picture aspect
 * and scaled to the picture's export size (including the bleed under the frame).
 *
 * Not mirrored: like a real camera, the photo shows the scene as others see
 * it, while the selfie mirror shows it flipped.
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  if (!hasFrame(video)) throw new Error("Camera has no frame to capture yet.");
  const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, PICTURE_ASPECT);

  const { width, height } = PICTURE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = get2d(canvas, { willReadFrequently: true });
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
  return canvas;
}

export function get2d(
  canvas: HTMLCanvasElement,
  options?: CanvasRenderingContext2DSettings,
): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d", options);
  if (!ctx) throw new Error("Canvas 2D is not available.");
  return ctx;
}
