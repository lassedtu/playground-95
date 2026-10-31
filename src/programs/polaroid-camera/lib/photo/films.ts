import type { StaticImageData } from "next/image";

import pack1 from "../../assets/films/pack-1.webp";
import pack2 from "../../assets/films/pack-2.webp";
import pack3 from "../../assets/films/pack-3.webp";
import pack4 from "../../assets/films/pack-4.webp";

import type { FilmLook } from "./film-look";

/** A film stock: its pack photo (shown in the film menu) and its look. */
export type Film = {
  id: string;
  name: string;
  pack: StaticImageData;
  look: FilmLook;
};

const NO_TONE = [1, 1, 1] as const;

/** Default: instant-film colour — slightly warm highlights, cool lifted shadows, soft vignette. */
export const CLASSIC_FILM: Film = {
  id: "classic",
  name: "Classic",
  pack: pack1,
  look: {
    exposure: 1.04,
    contrast: 1.08,
    saturation: 1.1,
    tone: NO_TONE,
    blacks: 0.05,
    whites: 0.96,
    shadowTint: [-0.015, 0.005, 0.04],
    highlightTint: [0.04, 0.02, -0.025],
    vignette: 0.25,
    grain: 0.25,
  },
};

export const FILMS: readonly Film[] = [
  CLASSIC_FILM,
  {
    id: "warm",
    name: "Warm",
    pack: pack2,
    look: {
      exposure: 1.05,
      contrast: 1.06,
      saturation: 1.08,
      tone: [1.07, 1.0, 0.85],
      blacks: 0.05,
      whites: 0.96,
      shadowTint: [0.03, 0.01, -0.025],
      highlightTint: [0.05, 0.025, -0.04],
      vignette: 0.28,
      grain: 0.25,
    },
  },
  {
    id: "cold",
    name: "Cold",
    pack: pack3,
    look: {
      exposure: 1.02,
      contrast: 1.1,
      saturation: 0.9,
      tone: [0.9, 0.99, 1.09],
      blacks: 0.05,
      whites: 0.95,
      shadowTint: [-0.025, 0.01, 0.05],
      highlightTint: [-0.01, 0.01, 0.03],
      vignette: 0.28,
      grain: 0.25,
    },
  },
  {
    id: "faded",
    name: "Faded",
    pack: pack4,
    look: {
      exposure: 1.06,
      contrast: 0.84,
      saturation: 0.72,
      tone: NO_TONE,
      blacks: 0.15,
      whites: 0.93,
      shadowTint: [-0.03, 0.025, 0.06],
      highlightTint: [0.05, 0.03, -0.02],
      vignette: 0.2,
      grain: 0.3,
    },
  },
];
