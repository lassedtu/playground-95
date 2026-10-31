import countriesData from "../data/countries.json";

/** From lassedtu/flag-quiz: 195 independent countries (REST Countries API). */
export type Country = { code: string; name: string; region: string; capital?: string };
export const COUNTRIES: readonly Country[] = countriesData;

export type Difficulty = "easy" | "medium" | "hard";
export const DIFFICULTIES: { id: Difficulty; name: string; hint: string }[] = [
  { id: "easy", name: "Easy", hint: "4 choices" },
  { id: "medium", name: "Medium", hint: "6 choices" },
  { id: "hard", name: "Hard", hint: "type the name" },
];
const OPTION_COUNT: Record<Difficulty, number> = { easy: 4, medium: 6, hard: 0 };

export const REGIONS = ["all", ...new Set(COUNTRIES.map((c) => c.region))] as const;
export const regionLabel = (region: string) => (region === "all" ? "Whole world" : region);
export const countriesIn = (region: string) =>
  region === "all" ? COUNTRIES : COUNTRIES.filter((c) => c.region === region);

export type Question = { answer: Country; options: Country[] };
export type Config = { region: string; difficulty: Difficulty; count: number };

function shuffle<T>(items: readonly T[], random = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** A round of flags (no repeats), each with shuffled answer options. */
export function makeQuiz({ region, difficulty, count }: Config, random = Math.random): Question[] {
  const pool = countriesIn(region);
  return shuffle(pool, random)
    .slice(0, count)
    .map((answer) => {
      const wrong = shuffle(pool.filter((c) => c.code !== answer.code), random).slice(0, OPTION_COUNT[difficulty] - 1);
      return { answer, options: difficulty === "hard" ? [] : shuffle([answer, ...wrong], random) };
    });
}

/** For typed answers: case, accents, punctuation and a leading "the" don't matter. */
function normalize(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/^the /, "")
    .replace(/\s+/g, " ")
    .trim();
}

export const isCorrectName = (typed: string, country: Country) => normalize(typed) === normalize(country.name);

/** Results messages, as in the original. */
export function verdict(percent: number): string {
  if (percent === 100) return "Perfect Score!";
  if (percent >= 80) return "Excellent!";
  if (percent >= 60) return "Good Job!";
  return "Keep Practicing!";
}

/** Flag images from flagcdn.com (public-domain flags), as in the original. */
export const flagUrl = (code: string) => `https://flagcdn.com/${code}.svg`;
