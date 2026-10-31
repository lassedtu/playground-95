/**
 * React95's colour schemes. Each one is loaded on demand (a few hundred bytes)
 * and applied by overriding React95's CSS variables, so switching is instant
 * and only the chosen scheme is downloaded.
 */
type TokensModule = Promise<{ tokens: { colors: Record<string, string>; shadows: Record<string, string> } }>;

export const THEMES = {
  win95: () => import("@react95/core/themes/tokens/win95"),
  azureOrange: () => import("@react95/core/themes/tokens/azureOrange"),
  bee: () => import("@react95/core/themes/tokens/bee"),
  blackAndWhite: () => import("@react95/core/themes/tokens/blackAndWhite"),
  brick: () => import("@react95/core/themes/tokens/brick"),
  candy: () => import("@react95/core/themes/tokens/candy"),
  coldGray: () => import("@react95/core/themes/tokens/coldGray"),
  counterStrike: () => import("@react95/core/themes/tokens/counterStrike"),
  eggplant: () => import("@react95/core/themes/tokens/eggplant"),
  highContrast: () => import("@react95/core/themes/tokens/highContrast"),
  lilac: () => import("@react95/core/themes/tokens/lilac"),
  lilacRoseDark: () => import("@react95/core/themes/tokens/lilacRoseDark"),
  maple: () => import("@react95/core/themes/tokens/maple"),
  marine: () => import("@react95/core/themes/tokens/marine"),
  matrix: () => import("@react95/core/themes/tokens/matrix"),
  millenium: () => import("@react95/core/themes/tokens/millenium"),
  modernDark: () => import("@react95/core/themes/tokens/modernDark"),
  molecule: () => import("@react95/core/themes/tokens/molecule"),
  ninjaTurtles: () => import("@react95/core/themes/tokens/ninjaTurtles"),
  olive: () => import("@react95/core/themes/tokens/olive"),
  plum: () => import("@react95/core/themes/tokens/plum"),
  rainyDay: () => import("@react95/core/themes/tokens/rainyDay"),
  rose: () => import("@react95/core/themes/tokens/rose"),
  slate: () => import("@react95/core/themes/tokens/slate"),
  spruce: () => import("@react95/core/themes/tokens/spruce"),
  storm: () => import("@react95/core/themes/tokens/storm"),
  theSixtiesUSA: () => import("@react95/core/themes/tokens/theSixtiesUSA"),
  tokyoDark: () => import("@react95/core/themes/tokens/tokyoDark"),
  travel: () => import("@react95/core/themes/tokens/travel"),
  vaporTeal: () => import("@react95/core/themes/tokens/vaporTeal"),
  vermillion: () => import("@react95/core/themes/tokens/vermillion"),
  violetDark: () => import("@react95/core/themes/tokens/violetDark"),
  water: () => import("@react95/core/themes/tokens/water"),
} satisfies Record<string, () => TokensModule>;

export type ThemeId = keyof typeof THEMES;
export const THEME_IDS = Object.keys(THEMES) as ThemeId[];
export const DEFAULT_THEME: ThemeId = "win95";

export type ThemeColors = Record<string, string>;

/** "rainyDay" -> "Rainy Day"; the default is called what Win95 called it. */
export function themeLabel(id: ThemeId): string {
  if (id === "win95") return "Windows Standard";
  if (id === "theSixtiesUSA") return "The Sixties USA";
  return id.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/^./, (c) => c.toUpperCase());
}

export async function loadTheme(id: ThemeId) {
  const { tokens } = await THEMES[id]();
  return tokens;
}

let applying = 0;

/** Switches the whole site to a scheme by overriding React95's CSS variables. */
export async function applyTheme(id: ThemeId) {
  const request = ++applying;
  const tokens = await loadTheme(id);
  if (request !== applying) return; // a newer choice won
  const style = document.documentElement.style;
  for (const [name, value] of Object.entries(tokens.colors)) style.setProperty(`--r95-color-${name}`, value);
  for (const [name, value] of Object.entries(tokens.shadows)) style.setProperty(`--r95-shadow-${name}`, value);
}
