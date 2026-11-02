"use client";

import { useCallback, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { type RaceControls, RaceView, type ViewOptions, type ViewStats } from "./components/race-view";
import { formatTime } from "./engine/race";

/** Must match the id in programs/registry.tsx (used by Race -> Exit). */
const PROGRAM_ID = "three-four-go";

type Panel = "none" | "about";

export function ThreeFourGo() {
  const { closeWindow } = useDesktop();
  const [panel, setPanel] = useState<Panel>("none");
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [options, setOptions] = useState<ViewOptions>({ hitboxes: false, logic: false });
  const controls = useRef<RaceControls | null>(null);
  const onStats = useCallback((next: ViewStats) => setStats(next), []);
  const toggle = (key: keyof ViewOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const menus: Menu[] = [
    {
      label: "Race",
      entries: [
        { label: "Restart", shortcut: "F2", onSelect: () => controls.current?.restart() },
        { label: "Pause", shortcut: "P", checked: stats?.paused ?? false, onSelect: () => controls.current?.togglePause() },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    {
      label: "Options",
      entries: [
        { label: "Show Hitboxes", checked: options.hitboxes, onSelect: () => toggle("hitboxes") },
        { label: "Show Logic Layer", checked: options.logic, onSelect: () => toggle("logic") },
      ],
    },
    { label: "Help", entries: [{ label: "About 3-4-Go!…", onSelect: () => setPanel("about") }] },
  ];

  const message = !stats
    ? "Loading…"
    : stats.finished
      ? `${stats.track}: finished! Press F2 to race again.`
      : stats.paused
        ? "Paused. Press P to carry on."
        : `${stats.track}: ↑ gas, ↓ brake, ←→ steer, Shift/Space to drift.`;

  return (
    <div
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest("[role=menubar]")) return;
        if (event.key === "F2") {
          event.preventDefault();
          controls.current?.restart();
        } else if (event.code === "KeyP" && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
          controls.current?.togglePause();
        }
      }}
    >
      <MenuBar menus={menus} />

      <div className="relative mt-0.5 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-black">
          <RaceView options={options} onStats={onStats} controls={controls} />
        </div>

        {panel === "about" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 p-3">
            <Frame
              role="dialog"
              aria-label="About 3-4-Go!"
              boxShadow="$out"
              bgColor="$material"
              className="flex max-h-full w-72 flex-col gap-3 overflow-auto p-3"
            >
              <p className="m-0 font-bold">3-4-Go!</p>
              <p className="m-0">A kart racer for Windows 95, drawn the old-fashioned way: a flat map tilted into 3D.</p>
              <p className="m-0">Under construction: for now it&apos;s a race against 7 CPU drivers on Desktop Circuit.</p>
              <p className="m-0">
                Cars rendered from &quot;Low Poly Cars&quot; by{" "}
                <a href="https://cosmo-art.itch.io" target="_blank" rel="noreferrer" className="text-[#0000ff] underline">
                  Cosmo
                </a>{" "}
                (CC0).
              </p>
              <div className="flex justify-center">
                <Button onClick={() => setPanel("none")}>OK</Button>
              </div>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow>{message}</StatusBarField>
        <StatusBarField width={64}>
          <span aria-hidden>{stats ? `Lap ${stats.lap}/${stats.laps}` : ""}</span>
        </StatusBarField>
        <StatusBarField width={56}>
          <span aria-hidden>{stats ? formatTime(stats.time) : ""}</span>
        </StatusBarField>
        <StatusBarField width={110}>
          <span aria-hidden>{stats ? `Best lap ${stats.bestLap === null ? "–" : formatTime(stats.bestLap)}` : ""}</span>
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
