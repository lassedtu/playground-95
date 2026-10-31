"use client";

import { useSyncExternalStore } from "react";

import { applyTheme, DEFAULT_THEME, THEMES, type ThemeId } from "./themes";
import { DESKTOP_COLORS, desktopBackground, type Wallpaper, type WallpaperMode } from "./wallpapers";

export type DisplaySettings = {
  theme: ThemeId;
  desktopColor: string;
  wallpaper: Wallpaper;
  mode: WallpaperMode;
  /** The imported picture, as a data URL. */
  image: string | null;
};

export const DEFAULT_DISPLAY: DisplaySettings = {
  theme: DEFAULT_THEME,
  desktopColor: DESKTOP_COLORS[0],
  wallpaper: { kind: "none" },
  mode: "fill",
  image: null,
};

// The image is stored separately: it can be large, and if it doesn't fit in
// storage the rest of the settings should still be remembered.
const SETTINGS_KEY = "playground95.display";
const IMAGE_KEY = "playground95.display.image";

function load(): DisplaySettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<DisplaySettings>;
    const image = localStorage.getItem(IMAGE_KEY);
    const settings = { ...DEFAULT_DISPLAY, ...saved, image };
    if (!(settings.theme in THEMES)) settings.theme = DEFAULT_THEME;
    if (settings.wallpaper.kind === "image" && !image) settings.wallpaper = { kind: "none" };
    return settings;
  } catch {
    return DEFAULT_DISPLAY;
  }
}

/** Saves settings. Returns false if the picture was too big to remember. */
function save(settings: DisplaySettings): boolean {
  const { image, ...rest } = settings;
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(rest));
  } catch {
    return false;
  }
  try {
    if (image) localStorage.setItem(IMAGE_KEY, image);
    else localStorage.removeItem(IMAGE_KEY);
    return true;
  } catch {
    localStorage.removeItem(IMAGE_KEY);
    return false;
  }
}

let current: DisplaySettings = DEFAULT_DISPLAY;
const listeners = new Set<() => void>();

function apply(settings: DisplaySettings) {
  void applyTheme(settings.theme);
  const background = desktopBackground(settings.desktopColor, settings.wallpaper, settings.mode, settings.image);
  // The desktop is the page background.
  Object.assign(document.body.style, {
    backgroundColor: background.backgroundColor,
    backgroundImage: background.backgroundImage ?? "none",
    backgroundSize: background.backgroundSize ?? "",
    backgroundRepeat: background.backgroundRepeat ?? "",
    backgroundPosition: background.backgroundPosition ?? "",
    imageRendering: background.imageRendering ?? "",
  });
}

/** Loads and applies the saved settings. Call once when the desktop starts. */
export function initDisplaySettings() {
  current = load();
  apply(current);
  listeners.forEach((listener) => listener());
}

/** Applies, saves and shares new settings. Returns false if the picture couldn't be saved. */
export function setDisplaySettings(settings: DisplaySettings): boolean {
  current = settings;
  apply(settings);
  listeners.forEach((listener) => listener());
  return save(settings);
}

export function useDisplaySettings(): DisplaySettings {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => current,
    () => DEFAULT_DISPLAY,
  );
}

/** Max size of an imported wallpaper's longest side; keeps it small enough to store. */
const MAX_WALLPAPER = 1920;

/** Turns an image file into a stored-size JPEG data URL. */
export async function importWallpaper(file: Blob): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const scale = Math.min(1, MAX_WALLPAPER / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas 2D is not available.");
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
