import dynamic from "next/dynamic";
import { Calculator } from "@react95/icons/Calculator";
import { Camera } from "@react95/icons/Camera";
import { Globe } from "@react95/icons/Globe";
import { KeyboardMouse } from "@react95/icons/KeyboardMouse";
import { Mspaint } from "@react95/icons/Mspaint";
import { Notepad } from "@react95/icons/Notepad";
import { Settings as SettingsIcon } from "@react95/icons/Settings";
import { Timedate } from "@react95/icons/Timedate";
import { Wordpad } from "@react95/icons/Wordpad";
import { Sol1 } from "@react95/icons/Sol1";
import { Winmine1 } from "@react95/icons/Winmine1";

import { HangmanIcon } from "./hangman/components/gallows";
import { BingoIcon } from "./lecture-bingo/components/bingo-icon";
import { EightBallIcon } from "./magic-8-ball/components/eight-ball-icon";
import { TrafficJamIcon } from "./traffic-jam/components/traffic-jam-icon";
import type { ProgramDefinition } from "./types";

/**
 * All programs available in the playground. To add one:
 * 1. Create `src/programs/<id>/<id>.tsx` exporting a component.
 * 2. Add an entry below.
 */
export const programs: ProgramDefinition[] = [
  {
    id: "polaroid-camera",
    category: "programs",
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
    // Must match MEMORY_PROGRAM_ID in memory.tsx (used by Game -> Exit).
    id: "memory",
    category: "games",
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
    category: "games",
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
  {
    // Must match PROGRAM_ID in minesweeper.tsx (used by Game -> Exit).
    id: "minesweeper",
    category: "games",
    title: "Minesweeper",
    icon: {
      large: <Winmine1 variant="32x32_4" />,
      small: <Winmine1 variant="16x16_4" />,
    },
    // Fits Expert (30×16) at 16 px cells; smaller levels get bigger cells.
    window: { width: 510, height: 370 },
    component: dynamic(() => import("./minesweeper/minesweeper").then((m) => m.Minesweeper)),
  },
  {
    // Must match PROGRAM_ID in typing-test.tsx (used by Test -> Exit).
    id: "typing-test",
    category: "games",
    title: "Typing Test",
    icon: {
      large: <KeyboardMouse variant="32x32_4" />,
      // No 16 px version exists; an exact half-size scale stays clean.
      small: <KeyboardMouse variant="32x32_4" width={16} height={16} />,
    },
    window: { width: 520, height: 300 },
    component: dynamic(() => import("./typing-test/typing-test").then((m) => m.TypingTest)),
  },
  {
    // Must match PROGRAM_ID in paint.tsx (used by File -> Exit).
    id: "paint",
    category: "programs",
    title: "Paint",
    icon: {
      large: <Mspaint variant="32x32_4" />,
      small: <Mspaint variant="16x16_4" />,
    },
    window: { width: 620, height: 440 },
    component: dynamic(() => import("./paint/paint").then((m) => m.Paint)),
  },
  {
    // Must match PROGRAM_ID in word-guess.tsx (used by Game -> Exit).
    id: "word-guess",
    category: "games",
    title: "Word Guess",
    icon: {
      large: <Wordpad variant="32x32_4" />,
      small: <Wordpad variant="16x16_4" />,
    },
    window: { width: 400, height: 520 },
    component: dynamic(() => import("./word-guess/word-guess").then((m) => m.WordGuess)),
  },
  {
    // Must match PROGRAM_ID in game-2048.tsx (used by Game -> Exit).
    id: "game-2048",
    category: "games",
    title: "2048",
    icon: {
      large: <Calculator variant="32x32_4" />,
      small: <Calculator variant="16x16_4" />,
    },
    window: { width: 380, height: 440 },
    component: dynamic(() => import("./game-2048/game-2048").then((m) => m.Game2048)),
  },
  {
    // Must match PROGRAM_ID in reaction-test.tsx (used by Test → Exit).
    id: "reaction-test",
    category: "games",
    title: "Reaction Test",
    icon: {
      large: <Timedate variant="32x32_4" />,
      small: <Timedate variant="16x16_4" />,
    },
    window: { width: 420, height: 340 },
    component: dynamic(() => import("./reaction-test/reaction-test").then((m) => m.ReactionTest)),
  },
  {
    // Must match PROGRAM_ID in lecture-bingo.tsx (used by Game → Exit).
    id: "lecture-bingo",
    category: "games",
    title: "Lecture Bingo",
    icon: {
      large: <BingoIcon size={32} />,
      small: <BingoIcon size={16} />,
    },
    window: { width: 520, height: 500 },
    component: dynamic(() => import("./lecture-bingo/lecture-bingo").then((m) => m.LectureBingo)),
  },
  {
    // Must match PROGRAM_ID in hangman.tsx (used by Game → Exit).
    id: "hangman",
    category: "games",
    title: "Hangman",
    icon: {
      large: <HangmanIcon size={32} />,
      small: <HangmanIcon size={16} />,
    },
    window: { width: 460, height: 480 },
    component: dynamic(() => import("./hangman/hangman").then((m) => m.Hangman)),
  },
  {
    // Must match PROGRAM_ID in flag-quiz.tsx (used by Game → Exit).
    id: "flag-quiz",
    category: "games",
    title: "Flag Quiz",
    icon: {
      large: <Globe variant="32x32_4" />,
      small: <Globe variant="16x16_4" />,
    },
    window: { width: 480, height: 500 },
    component: dynamic(() => import("./flag-quiz/flag-quiz").then((m) => m.FlagQuiz)),
  },
  {
    // Must match PROGRAM_ID in traffic-jam.tsx (used by Game → Exit).
    id: "traffic-jam",
    category: "games",
    title: "Traffic Jam",
    icon: {
      large: <TrafficJamIcon size={32} />,
      small: <TrafficJamIcon size={16} />,
    },
    window: { width: 400, height: 430 },
    component: dynamic(() => import("./traffic-jam/traffic-jam").then((m) => m.TrafficJam)),
  },
  {
    // Must match PROGRAM_ID in notes.tsx (used by File → Exit).
    id: "notes",
    category: "programs",
    title: "Notes",
    icon: {
      large: <Notepad variant="32x32_4" />,
      small: <Notepad variant="16x16_4" />,
    },
    window: { width: 560, height: 400 },
    component: dynamic(() => import("./notes/notes").then((m) => m.Notes)),
  },
  {
    // Must match PROGRAM_ID in settings.tsx (used by OK / Cancel).
    id: "settings",
    category: "settings",
    title: "Settings",
    icon: {
      large: <SettingsIcon variant="32x32_4" />,
      small: <SettingsIcon variant="16x16_4" />,
    },
    window: { width: 380, height: 440 },
    component: dynamic(() => import("./settings/settings").then((m) => m.Settings)),
  },
];

export function getProgram(id: string): ProgramDefinition | undefined {
  return programs.find((program) => program.id === id);
}
