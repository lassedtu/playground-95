import type { StaticImageData } from "next/image";

import desktopCircuitGround from "./desktop-circuit/ground.webp";
import desktopCircuitLogic from "./desktop-circuit/logic.png";
import desktopCircuitInfo from "./desktop-circuit/track.json";

/** What `track.json` holds (written by scripts/three-four-go/draw-track.mjs). */
export type TrackInfo = {
  name: string;
  laps: number;
  /** Length of one lap along the middle of the road, in map pixels. */
  lapLength: number;
  /** Start grid, pole position first. */
  start: { x: number; y: number; angle: number }[];
};

export type TrackDefinition = TrackInfo & {
  id: string;
  /** What you see. */
  ground: StaticImageData;
  /** Same size as `ground`, in the palette colours (see data/palette.ts). */
  logic: StaticImageData;
};

export const TRACKS: readonly TrackDefinition[] = [
  { id: "desktop-circuit", ...desktopCircuitInfo, ground: desktopCircuitGround, logic: desktopCircuitLogic },
];
