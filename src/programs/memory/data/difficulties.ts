export type Difficulty = {
  id: "beginner" | "intermediate" | "expert";
  name: string;
  columns: number;
  rows: number;
};

/** Named like Minesweeper's. columns x rows must be even and <= 2 * the icon count. */
export const DIFFICULTIES: readonly Difficulty[] = [
  { id: "beginner", name: "Beginner", columns: 4, rows: 3 },
  { id: "intermediate", name: "Intermediate", columns: 6, rows: 4 },
  { id: "expert", name: "Expert", columns: 8, rows: 6 },
];

export const DEFAULT_DIFFICULTY = DIFFICULTIES[0];

export function pairCount(difficulty: Difficulty): number {
  return (difficulty.columns * difficulty.rows) / 2;
}
