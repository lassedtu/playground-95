import dynamic from "next/dynamic";
import { Camera } from "@react95/icons";

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
];

export function getProgram(id: string): ProgramDefinition | undefined {
  return programs.find((program) => program.id === id);
}
