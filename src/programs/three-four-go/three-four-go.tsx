"use client";

import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { NameDialog } from "./components/name-dialog";
import { NewRaceDialog } from "./components/new-race-dialog";
import { RecordsDialog } from "./components/records-dialog";
import { LobbyDialog } from "./components/online/lobby-dialog";
import { LobbySettingsDialog } from "./components/online/lobby-settings-dialog";
import { MessageBox } from "./components/online/message-box";
import { PasswordDialog } from "./components/online/password-dialog";
import { PlayOnlineDialog } from "./components/online/play-online-dialog";
import { problemText } from "./components/online/problems";
import { type FinishedRace, type RaceControls, RaceView, type ViewOptions, type ViewStats } from "./components/race-view";
import { type GlobalPlaces, type RaceResults, ResultsDialog } from "./components/results-dialog";
import { formatTime, ordinal } from "./engine/race";
import { loadProfile, saveProfile } from "./lib/profile";
import { forgetBoards } from "./lib/global-records";
import { recordRace } from "./lib/records";
import { loadSettings, type RaceSettings, saveSettings } from "./lib/settings";
import { type OnlineRace, onlineResultRows } from "./lib/online-race";
import { type OnlineProblem, useOnline } from "./lib/use-online";
import { onlineAvailable, submitRecord } from "./net/client";
import { MAX_CARS, MAX_CPUS, type ResultEntry } from "./net/protocol";
import { trackName } from "./components/race-pickers";

/** Must match the id in programs/registry.tsx (used by Race -> Exit). */
const PROGRAM_ID = "three-four-go";
/** Debug views only exist when running locally (`next dev`), not in production. */
const DEV = process.env.NODE_ENV === "development";

type Panel =
  | "none"
  | "new-race"
  | "name"
  | "results"
  | "help"
  | "about"
  | "online"
  | "create-lobby"
  | "lobby"
  | "lobby-settings"
  | "password"
  | "message"
  | "records";

/** Panels opened over another one, which go back to it when closed. */
const OVERLAYS: readonly Panel[] = ["name", "help", "about", "lobby-settings", "password", "message", "records"];

export function ThreeFourGo() {
  const { closeWindow } = useDesktop();
  const [panel, setPanel] = useState<Panel>("new-race");
  /** Where a panel opened over another one (Your Name, Help, a message…) goes back to. */
  const [returnTo, setReturnTo] = useState<Panel | null>(null);
  const [message, setMessage] = useState("");
  const [passwordFor, setPasswordFor] = useState<{ code: string; wrong: boolean } | null>(null);
  const [settings, setSettings] = useState<RaceSettings | null>(null);
  /** The online race being driven (with `settings` for its track and laps), or null. */
  const [onlineRace, setOnlineRace] = useState<OnlineRace | null>(null);
  const [lastSettings, setLastSettings] = useState<RaceSettings>(loadSettings);
  const [profile, setProfile] = useState(loadProfile);
  const [results, setResults] = useState<RaceResults | null>(null);
  const [stats, setStats] = useState<ViewStats | null>(null);
  const [options, setOptions] = useState<ViewOptions>({ hitboxes: false, logic: false });
  const controls = useRef<RaceControls | null>(null);
  const onStats = useCallback((next: ViewStats) => setStats(next), []);
  const toggle = (key: keyof ViewOptions) => setOptions((o) => ({ ...o, [key]: !o[key] }));

  // What the online callbacks need to know about the window right now.
  const panelRef = useRef(panel);
  useEffect(() => {
    panelRef.current = panel;
  }, [panel]);
  /** Records you set in the current online race (saved when you cross the line, shown with the results). */
  const onlineRecords = useRef({ newRace: false, newLap: false, id: 0 });
  /** Counts finished races, to match the global records' answer to the right results. */
  const finishes = useRef(0);
  const [global, setGlobal] = useState<{ id: number; places: GlobalPlaces } | null>(null);

  const onlineRaceRef = useRef(onlineRace);
  useEffect(() => {
    onlineRaceRef.current = onlineRace;
  }, [onlineRace]);
  /** Ends the online race on this screen (if there is one); a single-player race carries on. */
  const stopOnlineRace = useCallback(() => {
    if (!onlineRaceRef.current) return;
    onlineRaceRef.current = null;
    setOnlineRace(null);
    setSettings(null);
    setStats(null);
  }, []);

  const onJoined = useCallback(() => {
    // Into the lobby: any single-player race stops.
    setSettings(null);
    setStats(null);
    setReturnTo(null);
    setPanel("lobby");
  }, []);
  const onProblem = useCallback((problem: OnlineProblem) => {
    stopOnlineRace();
    if (problem.kind === "refused" && problem.reason === "password") {
      setPasswordFor({ code: problem.code, wrong: problem.triedPassword });
      setReturnTo("online");
      setPanel("password");
      return;
    }
    setMessage(problemText(problem));
    setReturnTo(panelRef.current === "create-lobby" ? "create-lobby" : "online");
    setPanel("message");
  }, [stopOnlineRace]);
  const onStart = useCallback((race: OnlineRace) => {
    onlineRecords.current = { newRace: false, newLap: false, id: -1 };
    setOnlineRace(race);
    // A new object, so the view starts the race even with the same track and laps.
    setSettings({ track: race.track, laps: race.laps, car: race.entries[race.yourSlot].vehicle.name, cpus: 0 });
    setStats(null);
    setResults(null);
    setReturnTo(null);
    setPanel("none");
  }, []);
  const onResults = useCallback((rows: ResultEntry[], race: OnlineRace) => {
    setResults({
      trackName: trackName(race.track),
      laps: race.laps,
      rows: onlineResultRows(race, rows),
      ...onlineRecords.current,
    });
    setReturnTo(null);
    setPanel("results");
  }, []);
  const { online, join, create, leave, changeSettings, startRace } = useOnline({
    name: profile.name,
    car: lastSettings.car,
    onJoined,
    onProblem,
    onStart,
    onResults,
  });
  const lobby = online.kind === "lobby" ? online.lobby : null;
  const joining = online.kind === "joining";

  /** The panel to fall back to: the lobby while in one, else the race (or New Race if there isn't one). */
  const home: Panel = lobby ? "lobby" : joining ? "online" : settings ? "none" : "new-race";
  /** Opens a panel over the current one (an overlay over an overlay goes back to the first one's place). */
  const openOver = (next: Panel) => {
    if (!OVERLAYS.includes(panel)) setReturnTo(panel === "none" || panel === "results" ? null : panel);
    setPanel(next);
  };
  /** Switches to a main panel. */
  const show = (next: Panel) => {
    setReturnTo(null);
    setPanel(next);
  };
  const back = () => {
    setPanel(returnTo ?? home);
    setReturnTo(null);
  };
  const leaveLobby = () => {
    leave();
    stopOnlineRace();
    setReturnTo(null);
    setPanel("online");
  };
  const backToLobby = () => {
    stopOnlineRace();
    show("lobby");
  };
  const chooseCar = (car: string) => {
    const next = { ...lastSettings, car };
    saveSettings(next);
    setLastSettings(next);
  };
  const joinListed = (code: string, locked: boolean) => {
    if (locked) {
      setPasswordFor({ code, wrong: false });
      openOver("password");
    } else {
      join(code, "");
    }
  };

  const onFinish = useCallback((race: FinishedRace) => {
    const { newRace, newLap } = recordRace(race.settings.track, race.settings.laps, race.time, race.bestLap);
    const id = ++finishes.current;
    const name = race.rows.find((row) => row.you)?.name;
    if (onlineAvailable && name && race.lapTimes.length === race.settings.laps) {
      setGlobal({ id, places: "pending" });
      const answer = (places: GlobalPlaces) => setGlobal((g) => (g?.id === id ? { id, places } : g));
      submitRecord({ track: race.settings.track, laps: race.settings.laps, lapTimes: race.lapTimes, name, car: race.car }).then(
        (places) => {
          forgetBoards(race.settings.track);
          answer(places);
        },
        () => answer("failed"),
      );
    }
    if (race.online) {
      // The results come from the server once everyone's in.
      onlineRecords.current = { newRace, newLap, id };
      return;
    }
    setResults({ trackName: race.trackName, laps: race.settings.laps, rows: race.rows, newRace, newLap, id });
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
        { label: "New Race…", disabled: !!lobby || joining, onSelect: () => show("new-race") },
        {
          label: "Play Online…",
          disabled: !onlineAvailable || !!onlineRace,
          onSelect: () => show(lobby ? "lobby" : joining ? panel : "online"),
        },
        { label: "Your Name…", onSelect: () => openOver("name") },
        { label: "Records…", onSelect: () => openOver("records") },
        "divider",
        { label: "Restart", shortcut: "F2", disabled: !settings || !!onlineRace, onSelect: restart },
        { label: "Pause", shortcut: "P", disabled: !settings || !!onlineRace, checked: stats?.paused ?? false, onSelect: () => controls.current?.togglePause() },
        "divider",
        ...(lobby ? [{ label: "Leave Lobby", onSelect: leaveLobby }] : []),
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
        { label: "How to Play", onSelect: () => openOver("help") },
        { label: "About 3-4-Go!…", onSelect: () => openOver("about") },
      ],
    },
  ];

  const status = lobby && !onlineRace
    ? `Lobby ${lobby.code}: ${lobby.players.length}/${lobby.settings.maxPlayers} players`
    : joining
      ? "Joining…"
      : !settings
        ? onlineAvailable
          ? "Pick a track and a car, or play online with friends."
          : "Pick a track and a car."
        : !stats
          ? "Loading…"
          : stats.finished
            ? onlineRace
              ? "Finished! Waiting for the others…"
              : "Finished! Press F2 to race again."
            : stats.paused
              ? "Paused. Press P to carry on."
              : stats.track;

  const dialog: Record<Exclude<Panel, "none">, { title: string; width: string; body: ReactNode; escape?: () => void }> = {
    "new-race": {
      title: "New Race",
      width: "w-[26rem]",
      escape: settings ? () => setPanel("none") : undefined,
      body: (
        <NewRaceDialog
          initial={lastSettings}
          onStart={start}
          onCancel={settings ? () => setPanel("none") : null}
          onPlayOnline={onlineAvailable ? () => show("online") : null}
        />
      ),
    },
    name: {
      title: "Your Name",
      width: "w-64",
      escape: back,
      body: (
        <NameDialog
          initial={profile.name}
          onSave={(name) => {
            const next = { ...profile, name };
            saveProfile(next);
            setProfile(next);
            back();
          }}
          onCancel={back}
        />
      ),
    },
    online: {
      title: "Play Online",
      width: "w-[30rem]",
      escape: () => {
        if (joining) leave();
        setPanel(settings ? "none" : "new-race");
      },
      body: (
        <PlayOnlineDialog
          playerName={profile.name}
          onChangeName={() => openOver("name")}
          onJoin={joinListed}
          onCreate={() => setPanel("create-lobby")}
          onCancel={() => {
            if (joining) leave();
            setPanel(settings ? "none" : "new-race");
          }}
          busy={joining}
        />
      ),
    },
    "create-lobby": {
      title: "Create Lobby",
      width: "w-[30rem]",
      escape: () => {
        if (joining) leave();
        setPanel("online");
      },
      body: (
        <LobbySettingsDialog
          mode="create"
          initial={{
            name: `${profile.name}'s lobby`,
            password: "",
            track: lastSettings.track,
            laps: lastSettings.laps,
            maxPlayers: MAX_CARS,
            cpus: Math.min(lastSettings.cpus, MAX_CPUS),
          }}
          onSave={(next) => void create(next)}
          onCancel={() => {
            if (joining) leave();
            setPanel("online");
          }}
          busy={joining}
        />
      ),
    },
    lobby: {
      title: "Lobby",
      width: "w-[38rem]",
      body: online.kind === "lobby" && (
        <LobbyDialog
          lobby={online.lobby}
          you={online.you}
          car={lastSettings.car}
          onCar={chooseCar}
          onChangeName={() => openOver("name")}
          onSettings={() => openOver("lobby-settings")}
          onStart={startRace}
          onLeave={leaveLobby}
        />
      ),
    },
    "lobby-settings": {
      title: "Lobby Settings",
      width: "w-[30rem]",
      escape: back,
      body: lobby && (
        <LobbySettingsDialog
          mode="edit"
          initial={lobby.settings}
          players={lobby.players.length}
          onSave={(next) => {
            changeSettings(next);
            back();
          }}
          onCancel={back}
        />
      ),
    },
    password: {
      title: "Password",
      width: "w-80",
      escape: back,
      body: passwordFor && (
        <PasswordDialog
          key={`${passwordFor.code}-${passwordFor.wrong}`}
          code={passwordFor.code}
          wrong={passwordFor.wrong}
          onJoin={(password) => {
            setReturnTo(null);
            setPanel("online");
            join(passwordFor.code, password);
          }}
          onCancel={back}
        />
      ),
    },
    records: {
      title: "Records",
      // Wide enough for the four board choices side by side.
      width: "w-[38rem]",
      escape: back,
      body: <RecordsDialog initialTrack={settings?.track ?? lastSettings.track} playerName={profile.name} onClose={back} />,
    },
    message: {
      title: "3-4-Go!",
      width: "w-80",
      escape: back,
      body: <MessageBox text={message} onClose={back} />,
    },
    results: {
      title: "Results",
      width: "w-[26rem]",
      escape: onlineRace ? undefined : () => setPanel("none"),
      body: results && (
        <ResultsDialog
          results={results}
          onAgain={onlineRace ? startRace : restart}
          onNewRace={() => setPanel("new-race")}
          onClose={() => setPanel("none")}
          online={onlineRace ? { host: online.kind === "lobby" && online.lobby.players.some((p) => p.id === online.you && p.host), onBackToLobby: backToLobby } : undefined}
          global={global?.id === results.id ? global.places : null}
        />
      ),
    },
    help: {
      title: "How to Play",
      width: "w-[22rem]",
      escape: back,
      body: (
        <>
          <p className="m-0 font-bold">Race to the line!</p>
          <p className="m-0">
            Pick a track, a car, the number of laps and how many CPU drivers to race (none for a time trial). After
            &quot;3… 4… GO!&quot;, drive through every checkpoint, lap after lap. Miss one and the lap doesn&apos;t count.
          </p>

          <p className="m-0 font-bold">Controls</p>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            <li>↑ or W: gas. ↓ or S: brake, then reverse.</li>
            <li>← → or A D: steer.</li>
            <li>Hold Shift or Space while steering to drift. Drifting is a little faster than turning normally.</li>
            <li>P pauses, F2 restarts the race.</li>
            <li>On a touch screen, use the buttons on the screen.</li>
          </ul>

          <p className="m-0 font-bold">On the track</p>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            <li>Grass, snow and sand slow you down. Walls bounce you off and cost you speed.</li>
            <li>On Beach Day, drive into the sea and you&apos;re put back on the road after a second.</li>
            <li>Bump into other cars and they bump back: heavier cars push harder.</li>
            <li>&quot;WRONG WAY&quot; means you&apos;re driving backwards round the track.</li>
          </ul>

          <p className="m-0 font-bold">Cars and drivers</p>
          <ul className="m-0 flex list-disc flex-col gap-0.5 pl-5">
            <li>
              Every car has the same number of stat points, spread differently over speed, acceleration and handling.
              The differences are small: pick the one you like.
            </li>
            <li>You start at the back. The CPU drivers each drive their own way: some are fast, some are clumsy.</li>
            <li>
              Your best lap and best race time on each track are saved on this computer. The 10 fastest of everyone&apos;s
              make the global records: see Race → Records….
            </li>
            <li>Race → Your Name… changes the name the results show for you.</li>
          </ul>
          <PanelButtons>
            <Button onClick={back}>OK</Button>
          </PanelButtons>
        </>
      ),
    },
    about: {
      title: "About 3-4-Go!",
      width: "w-72",
      escape: back,
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
            <Button onClick={back}>OK</Button>
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
        if ((event.target as HTMLElement).closest("[role=menubar], [data-panel]") || !settings || onlineRace) return;
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
            online={onlineRace}
            options={DEV ? options : { hitboxes: false, logic: false }}
            hold={!onlineRace && panel !== "none" && panel !== "results"}
            playerName={profile.name}
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
                // Esc twice is the boss key: let it through, just close the dialog too.
                if (event.key === "Escape") open.escape?.();
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
        <StatusBarField grow>{status}</StatusBarField>
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
