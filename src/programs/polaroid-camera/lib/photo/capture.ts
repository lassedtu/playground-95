import { PICTURE_ASPECT, PICTURE_SIZE } from "./instax-mini";

/**
 * Grabs the current video frame, center-cropped to the Instax picture aspect
 * and scaled to the picture's export size (including the bleed under the frame).
 *
 * Not mirrored: like a real camera, the photo shows the scene as others see
 * it, while the selfie mirror shows it flipped.
 */
export function captureFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const { videoWidth: vw, videoHeight: vh } = video;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !vw || !vh) {
    throw new Error("Camera has no frame to capture yet.");
  }

  // Largest centered crop with the picture's aspect ratio.
  let sw = vw;
  let sh = vh;
  if (vw / vh > PICTURE_ASPECT) sw = vh * PICTURE_ASPECT;
  else sh = vw / PICTURE_ASPECT;
  const sx = (vw - sw) / 2;
  const sy = (vh - sh) / 2;

  const { width, height } = PICTURE_SIZE;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = get2d(canvas);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
  return canvas;
}

export function get2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D is not available.");
  return ctx;
}
