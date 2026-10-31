import { get2d } from "./capture";
import { PRINT_FRAME } from "./instax-mini";

/**
 * The handwritten note on a print's wide bottom border. All sizes are in
 * print pixels (PRINT_FRAME, 1000 px wide), so on-screen and saved text
 * line up when scaled.
 */
export const NOTE = {
  /** The bottom border below the picture, inset from the card edges. */
  area: { left: 90, top: 1295, width: 820, height: 255 },
  maxFontSize: 120,
  /** The text stops shrinking here; longer text is squeezed to fit. */
  minFontSize: 36,
  maxLength: 50,
  /** Dark marker ink. */
  color: "#1f2433",
} as const;

let measureCtx: CanvasRenderingContext2D | null = null;

function measure(text: string, fontSize: number, family: string) {
  measureCtx ??= get2d(document.createElement("canvas"));
  measureCtx.font = `${fontSize}px ${family}`;
  return measureCtx.measureText(text);
}

/** Font size (print px) at which the note fills the area's width, within limits. */
export function fitNoteFontSize(text: string, family: string): number {
  const { maxFontSize, minFontSize, area } = NOTE;
  if (!text) return maxFontSize;
  const width = measure(text, maxFontSize, family).width;
  if (width <= area.width) return maxFontSize;
  // Text width scales linearly with font size.
  return Math.max(minFontSize, (maxFontSize * area.width) / width);
}

/** Draws the note onto a print-sized canvas, centred like the on-screen field. */
export function drawNote(ctx: CanvasRenderingContext2D, text: string, family: string) {
  const { area, color } = NOTE;
  const fontSize = fitNoteFontSize(text, family);
  ctx.save();
  ctx.font = `${fontSize}px ${family}`;
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  // Centre the font's line box vertically, the way a text input centres its text.
  const { fontBoundingBoxAscent: ascent, fontBoundingBoxDescent: descent } = ctx.measureText(text);
  const baseline = area.top + area.height / 2 + (ascent - descent) / 2;
  // maxWidth squeezes text that's still too wide at the minimum size.
  ctx.fillText(text, area.left + area.width / 2, baseline, area.width);
  ctx.restore();
}

/** Returns the print with the note written on it, as a PNG. */
export async function writeNoteOnPrint(printUrl: string, text: string, family: string): Promise<Blob> {
  const print = new Image();
  print.src = printUrl;
  await print.decode();

  const canvas = document.createElement("canvas");
  canvas.width = PRINT_FRAME.width;
  canvas.height = PRINT_FRAME.height;
  const ctx = get2d(canvas);
  ctx.drawImage(print, 0, 0, canvas.width, canvas.height);
  drawNote(ctx, text, family);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Couldn't encode photo."))),
      "image/png",
    );
  });
}
