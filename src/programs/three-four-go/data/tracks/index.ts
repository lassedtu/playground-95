import type { StaticImageData } from "next/image";

import hillClimbGround from "./hill-climb/ground.webp";
import hillClimbLogic from "./hill-climb/logic.png";
import hillClimbInfo from "./hill-climb/track.json";
import westicoGround from "./westico/ground.webp";
import westicoLogic from "./westico/logic.png";
import westicoInfo from "./westico/track.json";
import beachDayGround from "./beach-day/ground.webp";
import beachDayLogic from "./beach-day/logic.png";
import beachDayInfo from "./beach-day/track.json";
import winterlandGround from "./winterland/ground.webp";
import winterlandLogic from "./winterland/logic.png";
import winterlandInfo from "./winterland/track.json";

/** What `track.json` holds (written by scripts/three-four-go/draw-track.mjs). */
export type TrackInfo = {
  name: string;
  /** Ground theme, see data/ground-style.ts. */
  theme: string;
  laps: number;
  /** Length of one lap along the middle of the road, in map pixels. */
  lapLength: number;
  /** Start grid, pole position first. */
  start: { x: number; y: number; angle: number }[];
};

export type TrackDefinition = TrackInfo & {
  /** Also picks the sky (data/skies.ts). */
  id: string;
  /** What you see. */
  ground: StaticImageData;
  /** Same size as `ground`, in the palette colours (see data/palette.ts). */
  logic: StaticImageData;
};

export const TRACKS: readonly TrackDefinition[] = [
  { id: "hill-climb", ...hillClimbInfo, ground: hillClimbGround, logic: hillClimbLogic },
  { id: "winterland", ...winterlandInfo, ground: winterlandGround, logic: winterlandLogic },
  { id: "beach-day", ...beachDayInfo, ground: beachDayGround, logic: beachDayLogic },
  { id: "westico", ...westicoInfo, ground: westicoGround, logic: westicoLogic },
];
