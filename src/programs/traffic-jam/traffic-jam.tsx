"use client";

import { type ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { hasShortcutModifier, isApplePlatform } from "@/lib/platform";
import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { LevelPicker } from "./components/level-picker";
import { EXIT_WIDTH, lotSize, ParkingLot } from "./components/parking-lot";
import { LEVELS } from "./data/levels";
import { applyMove, boardKey, isSolved, type Move, parseBoard, type Piece, SIZE, solve } from "./lib/board";
import { dailyResult, loadProgress, recordDaily, recordLevel, type Result, saveCurrentLevel } from "./lib/progress";
import { dailyNumber, dayNumber, formatTime, type Mode, modeTitle, puzzleFor, vehicleLooks } from "./lib/puzzles";

/** Must match the id in programs/registry.tsx (used by Game → Exit). */
const PROGRAM_ID = "traffic-jam";
/** Cell size limits in px; cells grow to fill the window, within these. */
const MIN_CELL = 28;
const MAX_CELL = 72;
/** How long the red car takes to drive out before the "solved" box. */
const ESCAPE_MS = 500;

/** One entry per move: the board before it and which vehicle moved. */
type Step = { board: Piece[]; piece: number };
type Panel = "none" | "help" | "about" | "levels" | "won";

export function TrafficJam() {
  const { closeWindow } = useDesktop();
  const [progress] = useState(loadProgress);
  const [mode, setMode] = useState<Mode>(() => ({ kind: "level", index: Math.min(progress.current, LEVELS.length - 1) }));
  const [par, board] = puzzleFor(mode);
  const start = useMemo(() => parseBoard(board), [board]);
  const looks = useMemo(() => vehicleLooks(board, start), [board, start]);

  const [pieces, setPieces] = useState<Piece[]>(start);
  const [history, setHistory] = useState<Step[]>([]);
  const [hints, setHints] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [won, setWon] = useState(false);
  const [escaping, setEscaping] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [panel, setPanel] = useState<Panel>(() =>
    Object.keys(progress.levels).length === 0 && !progress.daily ? "help" : "none",
  );
  const [solved, setSolved] = useState(progress.levels);
  const [newBest, setNewBest] = useState(false);
  const [daily, setDaily] = useState<Result | null>(null);

  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const [rootRef, visible] = useElementVisible<HTMLDivElement>();
  const [areaRef, area] = useElementSize<HTMLDivElement>();
  const lotRef = useRef<HTMLDivElement>(null);

  // The clock starts with the first move and pauses while minimized.
  const running = history.length > 0 || seconds > 0;
  useEffect(() => {
    if (!running || won || !visible) return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [running, won, visible]);

  function begin(next: Mode, note = "") {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setMode(next);
    setPieces(parseBoard(puzzleFor(next)[1]));
    setHistory([]);
    setHints(0);
    setSeconds(0);
    setWon(false);
    setEscaping(false);
    setHighlight(null);
    setNewBest(false);
    setMessage(note);
    setPanel("none");
    if (next.kind === "level") saveCurrentLevel(next.index);
    setDaily(next.kind === "daily" ? dailyResult(next.day) : null);
  }

  function openDaily() {
    const day = dayNumber();
    const done = dailyResult(day);
    begin(
      { kind: "daily", day },
      done ? `Already solved today in ${done.moves} moves. Playing again won't change that.` : "",
    );
  }

  function finish(moves: number, usedHints: number) {
    setWon(true);
    setEscaping(true);
    const result = { moves, seconds, hints: usedHints };
    if (mode.kind === "level") {
      const hadBest = Boolean(solved[mode.index]);
      const improved = recordLevel(mode.index, result);
      setNewBest(hadBest && improved);
      setSolved(loadProgress().levels);
    } else {
      setDaily(recordDaily(mode.day, result));
    }
    setMessage(`Solved in ${moves} moves!`);
    later(() => setPanel("won"), ESCAPE_MS);
  }

  /**
   * Applies a move. Moving the same vehicle again right away counts as the
   * same move (sliding it any distance is one move), and moving it back where
   * it was takes the move back.
   */
  function play(move: Move, usedHints = hints) {
    if (won) return;
    const next = applyMove(pieces, move);
    const last = history.at(-1);
    const nextHistory =
      last?.piece === move.piece
        ? boardKey(next) === boardKey(last.board)
          ? history.slice(0, -1)
          : history
        : [...history, { board: pieces, piece: move.piece }];
    setPieces(next);
    setHistory(nextHistory);
    if (isSolved(next)) finish(nextHistory.length, usedHints);
  }

  function undo() {
    const last = history.at(-1);
    if (!last || won) return;
    setPieces(last.board);
    setHistory(history.slice(0, -1));
    setMessage("");
  }

  function hint() {
    if (won) return;
    const solution = solve(pieces);
    if (!solution?.length) return;
    const used = hints + 1;
    setHints(used);
    setHighlight(solution[0].piece);
    later(() => setHighlight(null), 800);
    setMessage(solution.length > 1 ? `Hint: ${solution.length - 1} more move${solution.length > 2 ? "s" : ""} from here.` : "Hint: that's it!");
    play(solution[0], used);
  }

  async function share() {
    if (mode.kind !== "daily" || !daily) return;
    const extra = daily.hints ? ` · ${daily.hints} hint${daily.hints > 1 ? "s" : ""}` : "";
    const text = `Traffic Jam 95 #${dailyNumber(mode.day)} 🚗\n${daily.moves} moves (par ${par}) · ${formatTime(daily.seconds)}${extra}\n\nPlay at: https://playground-95.vercel.app/`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to the clipboard!");
    } catch {
      setMessage("Couldn't copy to the clipboard.");
    }
  }

  const closePanel = () => {
    setPanel("none");
    lotRef.current?.querySelector<HTMLElement>("button")?.focus();
  };

  const nextLevel = mode.kind === "level" && mode.index + 1 < LEVELS.length ? mode.index + 1 : null;
  const undoKey = isApplePlatform() ? "⌘Z" : "Ctrl+Z";
  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "Restart", shortcut: "F2", onSelect: () => begin(mode) },
        { label: "Undo", shortcut: undoKey, disabled: !history.length || won, onSelect: undo },
        { label: "Hint", shortcut: "H", disabled: won, onSelect: hint },
        "divider",
        { label: "Choose Level…", onSelect: () => setPanel("levels") },
        { label: "Next Level", disabled: nextLevel === null, onSelect: () => nextLevel !== null && begin({ kind: "level", index: nextLevel }) },
        { label: "Daily Puzzle", checked: mode.kind === "daily", onSelect: openDaily },
        { label: "Share Result", disabled: !daily, onSelect: () => void share() },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    {
      label: "Help",
      entries: [
        { label: "How to Play", onSelect: () => setPanel("help") },
        { label: "About Traffic Jam…", onSelect: () => setPanel("about") },
      ],
    },
  ];

  const cell = Math.max(
    MIN_CELL,
    Math.min(
      MAX_CELL,
      Math.floor(Math.min((area.width - lotSize(0).width - EXIT_WIDTH) / SIZE, (area.height - lotSize(0).height) / SIZE)),
    ),
  );
  const moves = history.length;

  return (
    <div
      ref={rootRef}
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if (panel !== "none") {
          if (event.key === "Escape" && panel !== "won") {
            event.preventDefault();
            closePanel();
          }
          return;
        }
        if ((event.target as HTMLElement).closest("[role=menubar]")) return;
        if (event.key === "F2") {
          event.preventDefault();
          begin(mode);
        } else if (hasShortcutModifier(event) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          undo();
        } else if (!event.metaKey && !event.ctrlKey && !event.altKey && event.key.toLowerCase() === "h") {
          event.preventDefault();
          hint();
        }
      }}
    >
      <MenuBar menus={menus} />

      <div ref={areaRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-2">
        {/* Left margin as wide as the exit arrow, so the lot itself is centred. */}
        <div ref={lotRef} style={{ marginLeft: EXIT_WIDTH }}>
          <ParkingLot
            pieces={pieces}
            looks={looks}
            cell={cell}
            locked={won}
            escaping={escaping}
            highlight={highlight}
            onMove={(move) => {
              setMessage("");
              play(move);
            }}
          />
        </div>

        {panel !== "none" && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25 p-3">
            <Frame
              role="dialog"
              aria-label={{ help: "How to play", about: "About Traffic Jam", levels: "Choose level", won: "Solved", none: "" }[panel]}
              boxShadow="$out"
              bgColor="$material"
              className={`flex max-h-full flex-col gap-3 overflow-auto p-3 ${panel === "levels" ? "w-80" : "w-72"}`}
            >
              {panel === "help" && (
                <>
                  <p className="m-0 font-bold">Get the red car out of the parking lot.</p>
                  <p className="m-0">
                    Drag the cars and trucks to clear a path to the exit (►) on the right. They only slide forwards and
                    backwards in their own lane, and can&apos;t jump over each other.
                  </p>
                  <p className="m-0">
                    Sliding a vehicle any distance is one move. <span className="font-bold">Par</span> is the fewest moves
                    that solve the puzzle.
                  </p>
                  <p className="m-0">
                    Keyboard: Tab to a vehicle and slide it with the arrow keys. {undoKey} undoes, H gives a hint, F2
                    restarts.
                  </p>
                  <p className="m-0">200 levels, from Beginner to Expert, and a new daily puzzle every midnight.</p>
                  <PanelButtons>
                    <Button onClick={closePanel}>Play</Button>
                  </PanelButtons>
                </>
              )}

              {panel === "about" && (
                <>
                  <p className="m-0 font-bold">Traffic Jam 95</p>
                  <p className="m-0">
                    A sliding-block puzzle in the spirit of Nob Yoshigahara&apos;s classic. Not affiliated with any board game
                    publisher.
                  </p>
                  <p className="m-0">
                    Puzzles from{" "}
                    <a href="https://www.michaelfogleman.com/rush/" target="_blank" rel="noreferrer" className="text-[#0000ff] underline">
                      Michael Fogleman&apos;s puzzle database
                    </a>
                    .
                  </p>
                  <p className="m-0">
                    Vehicle sprites: &quot;TopDown Vehicles&quot; by{" "}
                    <a href="https://minzinn.itch.io/" target="_blank" rel="noreferrer" className="text-[#0000ff] underline">
                      @MinZiin_
                    </a>
                    , licensed{" "}
                    <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer" className="text-[#0000ff] underline">
                      CC BY 4.0
                    </a>
                    . Trimmed and converted to WebP.
                  </p>
                  <PanelButtons>
                    <Button onClick={closePanel}>OK</Button>
                  </PanelButtons>
                </>
              )}

              {panel === "levels" && (
                <LevelPicker
                  current={mode.kind === "level" ? mode.index : 0}
                  solved={solved}
                  onPlay={(index) => begin({ kind: "level", index })}
                  onCancel={closePanel}
                />
              )}

              {panel === "won" && (
                <>
                  <p className="m-0 text-center font-bold">You got out!</p>
                  <div className="flex flex-col gap-1 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-2">
                    <span>
                      Moves: <b>{moves}</b> (par {par})
                    </span>
                    <span>
                      Time: <b>{formatTime(seconds)}</b>
                    </span>
                    {hints > 0 && <span>Hints used: {hints}</span>}
                  </div>
                  {moves === par && hints === 0 && <p className="m-0 text-center">Perfect, the fewest moves possible!</p>}
                  {newBest && <p className="m-0 text-center">New best for this level!</p>}
                  {mode.kind === "daily" && daily && (daily.moves !== moves || daily.seconds !== seconds) && (
                    <p className="m-0 text-center">
                      Today&apos;s result stays your first: {daily.moves} moves in {formatTime(daily.seconds)}.
                    </p>
                  )}
                  {mode.kind === "daily" && <p className="m-0 text-center">A new puzzle comes at midnight.</p>}
                  <PanelButtons>
                    {mode.kind === "daily" ? (
                      <Button onClick={() => void share()}>Share</Button>
                    ) : (
                      nextLevel !== null && <Button onClick={() => begin({ kind: "level", index: nextLevel })}>Next Level</Button>
                    )}
                    <Button onClick={() => begin(mode)}>Replay</Button>
                    <Button onClick={() => setPanel("none")}>Close</Button>
                  </PanelButtons>
                </>
              )}
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow>{message || (won ? "Solved!" : modeTitle(mode))}</StatusBarField>
        <StatusBarField width={78}>Moves: {moves}</StatusBarField>
        <StatusBarField width={60}>Par: {par}</StatusBarField>
        <StatusBarField width={48}>
          {/* Not announced every second by the status bar's live region. */}
          <span aria-hidden>{formatTime(seconds)}</span>
        </StatusBarField>
      </StatusBar>
    </div>
  );
}

function PanelButtons({ children }: { children: ReactNode }) {
  return <div className="flex justify-center gap-2">{children}</div>;
}
