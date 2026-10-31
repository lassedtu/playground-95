/**
 * Shutter flash timeline, in ms from the moment the flash appears:
 *
 *   0 ──── HOLD ────┬──── FADE ────┐
 *   bright white    │ fades out    │ done -> photo appears
 *
 * The photo is captured *before* the flash starts: the screen's light would
 * otherwise reach the webcam and wash out the picture.
 */
export const FLASH_TIMING = {
  holdMs: 120,
  fadeMs: 380,
  /** Not fully white: bright enough to read as a flash, without glaring. */
  peakOpacity: 0.7,
  /** Peak with prefers-reduced-motion. */
  reducedPeakOpacity: 0.3,
} as const;

/** Above everything, including windows and the taskbar. */
const Z_INDEX = "10000";

export type ScreenFlash = {
  /** Resolves when the flash has faded out and been removed. */
  done: Promise<void>;
};

/** Flashes the whole screen white once. */
export function flashScreen(): ScreenFlash {
  const { holdMs, fadeMs, peakOpacity, reducedPeakOpacity } = FLASH_TIMING;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const peak = reduced ? reducedPeakOpacity : peakOpacity;

  const overlay = document.createElement("div");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: Z_INDEX,
    background: "white",
    pointerEvents: "none",
    opacity: String(peak),
  });
  document.body.append(overlay);

  const total = holdMs + fadeMs;
  const animation = overlay.animate(
    [
      { opacity: peak, offset: 0 },
      { opacity: peak, offset: holdMs / total, easing: "ease-out" },
      { opacity: 0, offset: 1 },
    ],
    { duration: total, fill: "forwards" },
  );

  const done = animation.finished
    .catch(() => { })
    .then(() => overlay.remove());

  return { done };
}
