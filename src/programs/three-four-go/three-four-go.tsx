"use client";

import { useCallback, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { RaceView, type ViewStats } from "./components/race-view";

/** Must match the id in programs/registry.tsx (used by Race -> Exit). */
const PROGRAM_ID = "three-four-go";

type Panel = "none" | "about";

export function ThreeFourGo() {
  const { closeWindow } = useDesktop();
  const [panel, setPanel] = useState<Panel>("none");
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [debug, setDebug] = useState(false);
  const onStats = useCallback((next: ViewStats) => setStats(next), []);

  const menus: Menu[] = [
    { label: "Race", entries: [{ label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) }] },
    { label: "Options", entries: [{ label: "Show Hitboxes", checked: debug, onSelect: () => setDebug((d) => !d) }] },
    { label: "Help", entries: [{ label: "About 3-4-Go!…", onSelect: () => setPanel("about") }] },
  ];

  return (
    <div className="flex size-full flex-col">
      <MenuBar menus={menus} />

      <div className="relative mt-0.5 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-black">
          <RaceView debug={debug} onStats={onStats} />
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
              <p className="m-0">Under construction: for now you can drive (and drift) around a test track.</p>
              <div className="flex justify-center">
                <Button onClick={() => setPanel("none")}>OK</Button>
              </div>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow>↑ gas, ↓ brake, ←→ steer, hold Shift or Space to drift.</StatusBarField>
        <StatusBarField width={90}>
          <span aria-hidden>{stats ? `${Math.round(stats.speed)} u/s` : ""}</span>
        </StatusBarField>
        <StatusBarField width={64}>
          <span aria-hidden>{stats?.drift ? `Drift ${stats.drift < 0 ? "◄" : "►"}` : ""}</span>
        </StatusBarField>
        <StatusBarField width={56}>
          <span aria-hidden>{stats ? `${Math.round(stats.fps)} fps` : ""}</span>
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
