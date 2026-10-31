/**
 * Geometry of `assets/print-frame.webp`: a photographed Instax Mini print,
 * perspective-corrected to face-on, resized to 1000 px wide, with the
 * picture area cut out (transparent). Measured on the asset, in its pixels.
 *
 * The cut-out is 3 px larger than the original picture, so none of the
 * source photo's own picture shows at the edges. If the asset changes,
 * re-measure these.
 */
export const PRINT_FRAME = {
  width: 1000,
  height: 1575,
  /** The transparent cut-out where the photo shows through. */
  picture: { left: 80, top: 148, width: 844, height: 1133 },
} as const;

/** How far the photo extends under the frame on each side, hiding seams. */
export const PICTURE_BLEED = 2;

/** Picture aspect ratio (width / height), portrait, matches Instax Mini's 46:62. */
export const PICTURE_ASPECT = PRINT_FRAME.picture.width / PRINT_FRAME.picture.height;

/** Size the camera frame is cropped and scaled to before developing. */
export const PICTURE_SIZE = {
  width: PRINT_FRAME.picture.width + PICTURE_BLEED * 2,
  height: PRINT_FRAME.picture.height + PICTURE_BLEED * 2,
} as const;
