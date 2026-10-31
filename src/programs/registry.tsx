import dynamic from "next/dynamic";
import { Camera } from "@react95/icons/Camera";
import { Sol1 } from "@react95/icons/Sol1";

import { EightBallIcon } from "./magic-8-ball/components/eight-ball-icon";
import type { ProgramDefinition } from "./types";

/**
 * All programs available in the playground. To add one:
 * 1. Create `src/programs/<id>/<id>.tsx` exporting a component.
 * 2. Add an entry below.
 */
export const programs: ProgramDefinition[] = [
  {
    id: "polaroid-camera",
    title: "Polaroid Camera",
    icon: {
      large: <Camera variant="32x32_4" />,
      small: <Camera variant="16x16_4" />,
    },
    window: { width: 500, height: 540 },
    component: dynamic(() =>
      import("./polaroid-camera/polaroid-camera").then((m) => m.PolaroidCamera),
    ),
  },
  {
    // Must match MEMORY_PROGRAM_ID in memory.tsx (used by Game → Exit).
    id: "memory",
    title: "Memory",
    icon: {
      large: <Sol1 variant="32x32_4" />,
      small: <Sol1 variant="16x16_4" />,
    },
    window: { width: 500, height: 440 },
    component: dynamic(() => import("./memory/memory").then((m) => m.Memory)),
  },
  {
    id: "magic-8-ball",
    title: "Magic 8-Ball",
    icon: {
      large: <EightBallIcon size={32} />,
      small: <EightBallIcon size={16} />,
    },
    window: { width: 320, height: 380 },
    component: dynamic(() =>
      import("./magic-8-ball/magic-8-ball").then((m) => m.MagicEightBall),
    ),
  },
];

export function getProgram(id: string): ProgramDefinition | undefined {
  return programs.find((program) => program.id === id);
}
