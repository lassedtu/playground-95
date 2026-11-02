"use client";

import { type ReactNode, useCallback, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { NewRaceDialog } from "./components/new-race-dialog";
import { type FinishedRace, type RaceControls, RaceView, type ViewOptions, type ViewStats } from "./components/race-view";
import { type RaceResults, ResultsDialog } from "./components/results-dialog";
import { formatTime, ordinal } from "./engine/race";
import { recordRace } from "./lib/records";
import { loadSettings, type RaceSettings, saveSettings } from "./lib/settings";

/** Must match the id in programs/registry.tsx (used by Race -> Exit). */
const PROGRAM_ID = "three-four-go";
/** Debug views only exist when running locally (`next dev`), not in production. */
const DEV = process.env.NODE_ENV === "development";

type Panel = "none" | "new-race" | "results" | "help" | "about";

export function ThreeFourGo() {
  const { closeWindow } = useDesktop();
  const [panel, setPanel] = useState<Panel>("new-race");
  const [settings, setSettings] = useState<RaceSettings | null>(null);
  const [lastSettings, setLastSettings] = useState<RaceSettings>(loadSettings);
  const [results, setResults] = useState<RaceResults | null>(null);
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [options, setOptions] = useState<ViewOptions>({ hitboxes: false, logic: false });
  const controls = useRef<RaceControls | null>(null);
  const onStats = useCallback((next: ViewStats) => setStats(next), []);
  const toggle = (key: keyof ViewOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  const onFinish = useCallback((race: FinishedRace) => {
    const { newRace, newLap } = recordRace(race.settings.track, race.settings.laps, race.time, race.bestLap);
    setResults({ trackName: race.trackName, laps: race.settings.laps, rows: race.rows, newRace, newLap });
    setPanel("results");
  }, []);

  const start = (next: RaceSettings) => {
    saveSettings(next);
    setLastSettings(next);
    // A new object, so the view starts a fresh race even with the same settings.
    setSettings({ ...next });
    setStats(null);
    setPanel("none");
  };
  const restart = () => {
    controls.current?.restart();
    setPanel("none");
  };

  const menus: Menu[] = [
    {
      label: "Race",
      entries: [
        { label: "New Race…", onSelect: () => setPanel("new-race") },
        { label: "Restart", shortcut: "F2", disabled: !settings, onSelect: restart },
        { label: "Pause", shortcut: "P", disabled: !settings, checked: stats?.paused ?? false, onSelect: () => controls.current?.togglePause() },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    ...(DEV
      ? [
        {
          label: "Debug",
          entries: [
            { label: "Show Hitboxes", checked: options.hitboxes, onSelect: () => toggle("hitboxes") },
            { label: "Show Logic Layer", checked: options.logic, onSelect: () => toggle("logic") },
          ],
        },
      ]
      : []),
    {
      label: "Help",
      entries: [
        { label: "How to Play", onSelect: () => setPanel("help") },
        { label: "About 3-4-Go!…", onSelect: () => setPanel("about") },
      ],
    },
  ];

  const message = !settings
    ? "Pick a track and a car."
    : !stats
      ? "Loading…"
      : stats.finished
        ? `Finished! Press F2 to race again.`
        : stats.paused
          ? "Paused. Press P to carry on."
          : stats.track;

  const dialog: Record<Exclude<Panel, "none">, { title: string; width: string; body: ReactNode }> = {
    "new-race": {
      title: "New Race",
      width: "w-[26rem]",
      body: (
        <NewRaceDialog initial={lastSettings} onStart={start} onCancel={settings ? () => setPanel("none") : null} />
      ),
    },
    results: {
      title: "Results",
      width: "w-[26rem]",
      body: results && (
        <ResultsDialog results={results} onAgain={restart} onNewRace={() => setPanel("new-race")} onClose={() => setPanel("none")} />
      ),
    },
    help: {
      title: "How to Play",
      width: "w-80",
      body: (
        <>
          <p className="m-0 font-bold">Race to the line!</p>
          <p className="m-0">
            Drive through every checkpoint, lap after lap. Miss one and the lap doesn&apos;t count. Grass slows you down,
            and walls bounce you off.
          </p>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            <li>↑ or W: gas. ↓ or S: brake, then reverse.</li>
            <li>← → or A D: steer.</li>
            <li>Hold Shift or Space while steering to drift: you go a little faster.</li>
            <li>P pauses, F2 restarts.</li>
            <li>On a touch screen, use the buttons on the screen.</li>
          </ul>
          <p className="m-0">You start at the back. The CPU drivers each drive their own way: some are fast, some are clumsy.</p>
          <p className="m-0">
            Every car has the same number of stat points, spread differently over speed, acceleration and handling. The
            differences are small: pick the one you like.
          </p>
          <PanelButtons>
            <Button onClick={() => setPanel(settings ? "none" : "new-race")}>OK</Button>
          </PanelButtons>
        </>
      ),
    },
    about: {
      title: "About 3-4-Go!",
      width: "w-72",
      body: (
        <>
          <p className="m-0 font-bold">3-4-Go!</p>
          <p className="m-0">97 year old kart racer for Windows 95 still drawn the old-fashioned way (with mode7 projection).</p>
          <p className="m-0">
            Cars rendered from &quot;Low Poly Cars&quot; by{" "}
            <a href="https://cosmo-art.itch.io" target="_blank" rel="noreferrer" className="text-[#0000ff] underline">
              Cosmo
            </a>{" "}
            (CC0).
          </p>
          <p className="m-0">Skies from Nasha&apos;s Parallax Worlds.</p>
          <PanelButtons>
            <Button onClick={() => setPanel(settings ? "none" : "new-race")}>OK</Button>
          </PanelButtons>
        </>
      ),
    },
  };
  const open = panel === "none" ? null : dialog[panel];

  return (
    <div
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        // Keys typed in our own dialogs aren't game keys. (Not [role=dialog]:
        // the whole program window is one.)
        if ((event.target as HTMLElement).closest("[role=menubar], [data-panel]") || !settings) return;
        if (event.key === "F2") {
          event.preventDefault();
          restart();
        } else if (event.code === "KeyP" && !event.repeat && !event.metaKey && !event.ctrlKey && !event.altKey) {
          controls.current?.togglePause();
        }
      }}
    >
      <MenuBar menus={menus} />

      <div className="relative mt-0.5 flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-black">
          <RaceView
            settings={settings}
            options={DEV ? options : { hitboxes: false, logic: false }}
            hold={panel !== "none" && panel !== "results"}
            onStats={onStats}
            onFinish={onFinish}
            controls={controls}
          />
        </div>

        {open && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 p-3">
            <Frame
              data-panel
              role="dialog"
              aria-label={open.title}
              boxShadow="$out"
              bgColor="$material"
              className={`flex max-h-full max-w-full flex-col overflow-auto p-0.5 ${open.width}`}
              onKeyDown={(event: React.KeyboardEvent) => {
                if (event.key === "Escape" && settings) {
                  // Esc twice is the boss key: let it through, just close the dialog too.
                  setPanel("none");
                }
              }}
            >
              <div className="flex h-[18px] items-center bg-win-navy px-1 text-white">
                <span className="font-bold">{open.title}</span>
              </div>
              <div className="flex flex-col gap-3 p-2">{open.body}</div>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow>{message}</StatusBarField>
        <StatusBarField width={64}>
          <span aria-hidden>{stats ? `Lap ${stats.lap}/${stats.laps}` : ""}</span>
        </StatusBarField>
        <StatusBarField width={64}>
          <span aria-hidden>{stats && stats.racers > 1 ? `${ordinal(stats.place)} / ${stats.racers}` : ""}</span>
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

function PanelButtons({ children }: { children: ReactNode }) {
  return <div className="flex justify-center gap-2">{children}</div>;
}
