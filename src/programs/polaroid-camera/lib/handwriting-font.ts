import localFont from "next/font/local";

/**
 * Patrick Hand by Patrick Wagesreiter, under the SIL Open Font License 1.1
 * (free to use, embed and redistribute, including commercially). The license
 * ships next to the font: `assets/fonts/PatrickHand-OFL.txt`.
 */
const handwriting = localFont({
  src: "../assets/fonts/PatrickHand-Regular.woff2",
  display: "swap",
  // Only needed once a photo is open, not on page load.
  preload: false,
  fallback: ["cursive"],
});

/** CSS font-family list, usable in styles and for canvas `ctx.font`. */
export const HANDWRITING_FAMILY = handwriting.style.fontFamily;

/** Resolves once the font is loaded, so canvas text uses it rather than the fallback. */
export function loadHandwriting(): Promise<unknown> {
  return document.fonts.load(`100px ${HANDWRITING_FAMILY}`);
}
