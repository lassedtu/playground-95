"use client";

import { type ChangeEvent, useRef, useState } from "react";
import { Button, Dropdown, Frame, Tab, Tabs } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import {
  type DisplaySettings,
  importWallpaper,
  setDisplaySettings,
  useDisplaySettings,
} from "@/lib/display/display-settings";
import { THEME_IDS, themeLabel, type ThemeId } from "@/lib/display/themes";
import { DESKTOP_COLORS, PATTERNS, type Wallpaper, WALLPAPER_MODES, type WallpaperMode } from "@/lib/display/wallpapers";

import { PreviewMonitor } from "./components/preview-monitor";

/** Must match the id in programs/registry.tsx. */
const PROGRAM_ID = "settings";

const sameWallpaper = (a: Wallpaper, b: Wallpaper) =>
  a.kind === b.kind && (a.kind !== "pattern" || (b.kind === "pattern" && a.id === b.id));

/** Display Properties, like Win95's: Background and Appearance tabs, OK / Cancel / Apply. */
export function Settings() {
  const { closeWindow } = useDesktop();
  const saved = useDisplaySettings();
  const [pending, setPending] = useState<DisplaySettings>(saved);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const changed = JSON.stringify(pending) !== JSON.stringify(saved);
  const update = (patch: Partial<DisplaySettings>) => setPending((p) => ({ ...p, ...patch }));

  function apply() {
    const stored = setDisplaySettings(pending);
    setNotice(stored ? null : "Your picture is too big to keep after reloading the page, but it's used for now.");
    return stored;
  }

  async function browse(file: File) {
    try {
      const image = await importWallpaper(file);
      update({ image, wallpaper: { kind: "image" } });
      setNotice(null);
    } catch (error) {
      console.error("Couldn't import wallpaper:", error);
      setNotice("That file couldn't be opened as a picture.");
    }
  }

  const wallpapers: { label: string; wallpaper: Wallpaper }[] = [
    { label: "(None)", wallpaper: { kind: "none" } },
    ...(pending.image ? [{ label: "(Your picture)", wallpaper: { kind: "image" } as const }] : []),
    ...PATTERNS.map((p) => ({ label: p.name, wallpaper: { kind: "pattern", id: p.id } as const })),
  ];

  const modeName = WALLPAPER_MODES.find((m) => m.id === pending.mode)!.name;

  return (
    <div className="flex size-full flex-col gap-2">
      {/* Tabs renders the tab strip and the panel as siblings (and puts any
          className on the strip), so size them from here: the panel fills. */}
      <div className="flex min-h-0 flex-1 flex-col [&>:last-child]:min-h-0 [&>:last-child]:flex-1">
        <Tabs>
          <Tab title="Background">
            <div className="flex flex-col gap-3">
              <PreviewMonitor settings={pending} />
              <div className="flex gap-3">
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span id="wallpaper-label">Wallpaper:</span>
                  <Frame
                    role="group"
                    aria-labelledby="wallpaper-label"
                    boxShadow="$in"
                    bgColor="$inputBackground"
                    className="h-24 overflow-y-auto p-0.5"
                  >
                    {wallpapers.map(({ label, wallpaper }) => {
                      const selected = sameWallpaper(wallpaper, pending.wallpaper);
                      return (
                        <button
                          key={label}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => update({ wallpaper })}
                          className={`relative block w-full border-0 bg-transparent py-px pr-1 pl-4 text-left outline-none focus-visible:outline-1 focus-visible:outline-dotted focus-visible:outline-current ${
                            selected ? "font-bold" : ""
                          }`}
                        >
                          {selected && (
                            <span aria-hidden className="absolute left-1">
                              ✓
                            </span>
                          )}
                          {label}
                        </button>
                      );
                    })}
                  </Frame>
                </div>
                <div className="flex w-28 shrink-0 flex-col gap-1">
                  <Button onClick={() => fileRef.current?.click()}>Browse…</Button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void browse(file);
                      event.target.value = "";
                    }}
                  />
                  <label htmlFor="wallpaper-mode" className={pending.wallpaper.kind === "image" ? "" : "opacity-50"}>
                    Display:
                  </label>
                  <Dropdown
                    id="wallpaper-mode"
                    // React95 gives dropdowns a fixed 200px; fit the column instead.
                    className="w-full"
                    options={WALLPAPER_MODES.map((m) => m.name)}
                    value={modeName}
                    disabled={pending.wallpaper.kind !== "image"}
                    onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                      update({ mode: WALLPAPER_MODES.find((m) => m.name === event.target.value)!.id as WallpaperMode })
                    }
                  />
                </div>
              </div>
              <fieldset className="m-0 flex flex-wrap items-center gap-1 border-0 p-0">
                <legend className="mb-1 p-0">Desktop colour:</legend>
                {DESKTOP_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    aria-label={color}
                    aria-pressed={pending.desktopColor === color}
                    onClick={() => update({ desktopColor: color })}
                    className="size-5 border border-t-[#808080] border-r-white border-b-white border-l-[#808080] p-0 outline-offset-1 aria-pressed:outline-2 aria-pressed:outline-black aria-pressed:outline-dotted"
                    style={{ background: color }}
                  />
                ))}
                <label className="ml-1 flex items-center gap-1">
                  Other…
                  <input
                    type="color"
                    value={pending.desktopColor}
                    onChange={(event) => update({ desktopColor: event.target.value })}
                    className="h-5 w-8 cursor-pointer border-0 bg-transparent p-0"
                  />
                </label>
              </fieldset>
            </div>
          </Tab>

          <Tab title="Appearance">
            <div className="flex flex-col gap-3">
              <PreviewMonitor settings={pending} />
              <div className="flex flex-col gap-1">
                <label htmlFor="scheme">Scheme:</label>
                <Dropdown
                  id="scheme"
                  options={THEME_IDS.map(themeLabel)}
                  value={themeLabel(pending.theme)}
                  onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                    update({ theme: THEME_IDS.find((id) => themeLabel(id) === event.target.value) as ThemeId })
                  }
                />
              </div>
            </div>
          </Tab>
        </Tabs>
      </div>

      {notice && (
        <p role="status" className="text-[#800000]">
          {notice}
        </p>
      )}

      <div className="flex shrink-0 justify-end gap-2">
        <Button
          onClick={() => {
            if (!changed || apply()) closeWindow(PROGRAM_ID);
          }}
        >
          OK
        </Button>
        <Button onClick={() => closeWindow(PROGRAM_ID)}>Cancel</Button>
        <Button disabled={!changed} onClick={apply}>
          Apply
        </Button>
      </div>
    </div>
  );
}
