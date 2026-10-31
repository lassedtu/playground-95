import type { CSSProperties } from "react";

/**
 * Win95-style desktop patterns: 8×8 black pixel tiles over the desktop colour.
 * Each row is 8 characters, "#" = black pixel.
 */
const PATTERN_BITMAPS = {
  bricks: ["########", "#.......", "#.......", "#.......", "########", "....#...", "....#...", "....#..."],
  weave: ["#...#...", ".#.#.#..", "..#...#.", ".#.#.#..", "#...#...", "...#.#.#", "..#...#.", "...#.#.#"],
  diamonds: ["...#....", "..#.#...", ".#...#..", "#.....#.", ".#...#..", "..#.#...", "...#....", "........"],
  checks: ["####....", "####....", "####....", "####....", "....####", "....####", "....####", "....####"],
  waves: ["........", "##......", "..#.....", "...##...", ".....#..", "......##", "........", "........"],
  dots: ["#.......", "........", "........", "........", "....#...", "........", "........", "........"],
} as const;

export type PatternId = keyof typeof PATTERN_BITMAPS;

export const PATTERNS: { id: PatternId; name: string }[] = [
  { id: "bricks", name: "Bricks" },
  { id: "weave", name: "Weave" },
  { id: "diamonds", name: "Diamonds" },
  { id: "checks", name: "Checks" },
  { id: "waves", name: "Waves" },
  { id: "dots", name: "Dots" },
];

/** A pattern as an SVG data URL (crisp at any zoom). */
function patternUrl(id: PatternId): string {
  const rects = PATTERN_BITMAPS[id]
    .flatMap((row, y) => [...row].map((pixel, x) => (pixel === "#" ? `<rect x="${x}" y="${y}" width="1" height="1"/>` : "")))
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" shape-rendering="crispEdges">${rects}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

export type WallpaperMode = "center" | "tile" | "stretch" | "fill";

export const WALLPAPER_MODES: { id: WallpaperMode; name: string }[] = [
  { id: "fill", name: "Fill" },
  { id: "center", name: "Center" },
  { id: "tile", name: "Tile" },
  { id: "stretch", name: "Stretch" },
];

export type Wallpaper = { kind: "none" } | { kind: "pattern"; id: PatternId } | { kind: "image" };

/** Desktop colours offered as swatches (the first is the Win95 default). */
export const DESKTOP_COLORS = ["#008080", "#000080", "#000000", "#808080", "#008000", "#800080", "#804000", "#3a6ea5"];

/**
 * CSS background for the desktop (or a preview of it). `scale` shrinks
 * patterns and centred images for previews.
 */
export function desktopBackground(
  color: string,
  wallpaper: Wallpaper,
  mode: WallpaperMode,
  image: string | null,
  scale = 1,
): CSSProperties {
  const base: CSSProperties = { backgroundColor: color, backgroundImage: "none" };
  if (wallpaper.kind === "pattern") {
    const size = `${8 * Math.max(1, Math.round(scale * 2) / 2)}px`;
    return { ...base, backgroundImage: patternUrl(wallpaper.id), backgroundSize: `${size} ${size}`, backgroundRepeat: "repeat", imageRendering: "pixelated" };
  }
  if (wallpaper.kind === "image" && image) {
    const sizes: Record<WallpaperMode, string> = {
      fill: "cover",
      stretch: "100% 100%",
      center: scale === 1 ? "auto" : `${scale * 100}% auto`,
      tile: scale === 1 ? "auto" : `${Math.round(scale * 100)}%`,
    };
    return {
      ...base,
      backgroundImage: `url("${image}")`,
      backgroundSize: sizes[mode],
      backgroundRepeat: mode === "tile" ? "repeat" : "no-repeat",
      backgroundPosition: mode === "tile" ? "0 0" : "center",
    };
  }
  return base;
}
