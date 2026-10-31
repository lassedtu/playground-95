/**
 * A film stock: how a captured picture is "developed" before it's framed.
 *
 * `develop` receives the cropped picture at export size and returns the
 * developed picture (a new canvas or the same one). Async so it can later be
 * backed by WebGL, LUT images, or other resources that load.
 */
export type Film = {
  id: string;
  name: string;
  develop: (picture: HTMLCanvasElement) => HTMLCanvasElement | Promise<HTMLCanvasElement>;
};

/** No processing: the picture as the camera saw it. */
export const STANDARD_FILM: Film = {
  id: "standard",
  name: "Standard",
  develop: (picture) => picture,
};

export const FILMS: readonly Film[] = [STANDARD_FILM];
