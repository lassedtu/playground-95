export type Level = {
  id: "beginner" | "intermediate" | "expert";
  name: string;
  columns: number;
  rows: number;
  mines: number;
};

/** The original Windows 95 sizes. */
export const LEVELS: readonly Level[] = [
  { id: "beginner", name: "Beginner", columns: 9, rows: 9, mines: 10 },
  { id: "intermediate", name: "Intermediate", columns: 16, rows: 16, mines: 40 },
  { id: "expert", name: "Expert", columns: 30, rows: 16, mines: 99 },
];

export const DEFAULT_LEVEL = LEVELS[0];
