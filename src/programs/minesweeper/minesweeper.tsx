"use client";

import { type KeyboardEvent, type PointerEvent, useEffect, useRef, useState } from "react";
import { Winmine1 } from "@react95/icons/Winmine1";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { BEST_TIMES_SIZE, BestTimesWindow } from "./components/best-times-window";
import { FlagGlyph, MineGlyph, type Mood, SmileyGlyph } from "./components/glyphs";
import { LedCounter } from "./components/led-counter";
import { DEFAULT_LEVEL, type Level, LEVELS } from "./data/levels";
import { recordTime } from "./lib/best-times";
import { type Cell, chord, cycleMark, type Game, newGame, reveal } from "./lib/game";

/** Must match the id in programs/registry.tsx (used by Game -> Exit). */
const PROGRAM_ID = "minesweeper";
const BEST_TIMES_WINDOW_ID = "minesweeper-best-times";
const SETTINGS_KEY = "playground95.minesweeper.settings";
/** Touch: hold this long to flag instead of reveal. */
const LONG_PRESS_MS = 450;
/** Cell size limits in px; cells grow to fill the window, within these. */
const MIN_CELL = 16;
const MAX_CELL = 28;

const NUMBER_COLORS = ["", "#0000ff", "#008000", "#ff0000", "#000080", "#800000", "#008080", "#000000", "#808080"];

type Settings = { levelId: Level["id"]; marks: boolean };

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Settings>;
    return {
      levelId: LEVELS.some((l) => l.id === saved.levelId) ? saved.levelId! : DEFAULT_LEVEL.id,
      marks: saved.marks ?? true,
    };
  } catch {
    return { levelId: DEFAULT_LEVEL.id, marks: true };
  }
}

function saveSettings(settings: Settings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // not remembered, that's fine
  }
}

const levelById = (id: Level["id"]) => LEVELS.find((l) => l.id === id) ?? DEFAULT_LEVEL;

function cellLabel(cell: Cell, index: number, game: Game) {
  const position = `Row ${Math.floor(index / game.level.columns) + 1}, column ${(index % game.level.columns) + 1}`;
  const over = game.status === "lost" || game.status === "won";
  if (cell.state === "flagged") return `${position}, flagged${over && !cell.mine ? ", no mine" : ""}`;
  if (cell.state === "question") return `${position}, question mark`;
  if (cell.state === "hidden") return over && cell.mine ? `${position}, mine` : position;
  if (cell.mine) return `${position}, exploded mine`;
  return cell.adjacent ? `${position}, ${cell.adjacent} mine${cell.adjacent > 1 ? "s" : ""} around` : `${position}, empty`;
}

export function Minesweeper() {
  const { openWindow, closeWindow } = useDesktop();
  const [settings, setSettings] = useState(loadSettings);
  const [game, setGame] = useState<Game>(() => newGame(levelById(settings.levelId)));
  const [seconds, setSeconds] = useState(0);
  const [pressing, setPressing] = useState(false);
  const [focusIndex, setFocusIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const gridRef = useRef<HTMLDivElement>(null);
  const longPress = useRef<{ timer: ReturnType<typeof setTimeout>; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);

  // The clock only runs while you can see the game (paused when minimized).
  const [rootRef, visible] = useElementVisible<HTMLDivElement>();
  const [boardRef, boardSize] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    if (game.status !== "playing" || !visible) return;
    const id = setInterval(() => setSeconds((s) => Math.min(999, s + 1)), 1000);
    return () => clearInterval(id);
  }, [game.status, visible]);

  // The surprised face only shows while a mouse button is held down.
  useEffect(() => {
    if (!pressing) return;
    const release = () => setPressing(false);
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);
    return () => {
      window.removeEventListener("pointerup", release);
      window.removeEventListener("pointercancel", release);
    };
  }, [pressing]);

  useEffect(() => () => closeWindow(BEST_TIMES_WINDOW_ID), [closeWindow]);
  useEffect(() => () => clearTimeout(longPress.current?.timer), []);

  function start(level: Level = game.level) {
    setGame(newGame(level));
    setSeconds(0);
    setAnnouncement("");
    setFocusIndex((i) => Math.min(i, level.columns * level.rows - 1));
  }

  function updateSettings(next: Partial<Settings>) {
    const merged = { ...settings, ...next };
    setSettings(merged);
    saveSettings(merged);
  }

  /** Applies a rules function and handles what follows from the result. */
  function act(next: Game) {
    if (next === game) return;
    // The original counts the first second as soon as you click.
    if (game.status === "ready" && next.status !== "ready") setSeconds(1);
    setGame(next);
    if (next.status === "lost") setAnnouncement("Boom! You hit a mine. Press F2 or the smiley to play again.");
    if (next.status === "won") {
      const time = game.status === "ready" ? 1 : seconds;
      const best = recordTime(next.level, time);
      setAnnouncement(`You won in ${time} seconds!${best ? ` New best time for ${next.level.name}!` : ""}`);
    }
  }

  const open = (index: number) => {
    const cell = game.cells[index];
    act(cell.state === "revealed" ? chord(game, index) : reveal(game, index));
  };
  const mark = (index: number) => act(cycleMark(game, index, settings.marks));

  const indexOf = (target: EventTarget) => {
    const el = (target as Element).closest<HTMLElement>("[data-index]");
    return el ? Number(el.dataset.index) : null;
  };

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false; // every press starts fresh
    const index = indexOf(event.target);
    if (index === null || game.status === "won" || game.status === "lost") return;
    if (event.button === 0) setPressing(true);
    if (event.pointerType === "touch") {
      clearTimeout(longPress.current?.timer);
      longPress.current = {
        x: event.clientX,
        y: event.clientY,
        timer: setTimeout(() => {
          longPress.current = null;
          suppressClick.current = true;
          setPressing(false);
          mark(index);
        }, LONG_PRESS_MS),
      };
    }
  }

  function cancelLongPress(event?: PointerEvent<HTMLDivElement>) {
    const press = longPress.current;
    if (!press) return;
    if (event && event.type === "pointermove" && Math.hypot(event.clientX - press.x, event.clientY - press.y) < 8) return;
    clearTimeout(press.timer);
    longPress.current = null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const { columns, rows } = game.level;
    const row = Math.floor(focusIndex / columns);
    const column = focusIndex % columns;
    let next: number | null = null;
    switch (event.key) {
      case "ArrowUp": next = Math.max(0, row - 1) * columns + column; break;
      case "ArrowDown": next = Math.min(rows - 1, row + 1) * columns + column; break;
      case "ArrowLeft": next = row * columns + Math.max(0, column - 1); break;
      case "ArrowRight": next = row * columns + Math.min(columns - 1, column + 1); break;
      case "Enter":
      case " ": event.preventDefault(); open(focusIndex); return;
      case "f":
      case "F": mark(focusIndex); return;
      default: return;
    }
    event.preventDefault();
    setFocusIndex(next);
    gridRef.current?.querySelector<HTMLElement>(`[data-index="${next}"]`)?.focus();
  }

  function showBestTimes() {
    openWindow({
      id: BEST_TIMES_WINDOW_ID,
      title: "Fastest Mine Sweepers",
      icon: <Winmine1 variant="16x16_4" />,
      size: BEST_TIMES_SIZE,
      content: <BestTimesWindow onClose={() => closeWindow(BEST_TIMES_WINDOW_ID)} />,
    });
  }

  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "New", shortcut: "F2", onSelect: () => start() },
        "divider",
        ...LEVELS.map((level) => ({
          label: level.name,
          checked: level.id === game.level.id,
          onSelect: () => {
            updateSettings({ levelId: level.id });
            start(level);
          },
        })),
        "divider",
        { label: "Marks (?)", checked: settings.marks, onSelect: () => updateSettings({ marks: !settings.marks }) },
        "divider",
        { label: "Best Times…", onSelect: showBestTimes },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
  ];

  const { columns, rows, mines } = game.level;
  const cell = Math.max(
    MIN_CELL,
    Math.min(MAX_CELL, Math.floor(Math.min(boardSize.width / columns, boardSize.height / rows))),
  );
  const over = game.status === "won" || game.status === "lost";
  const mood: Mood =
    game.status === "lost" ? "dead" : game.status === "won" ? "cool" : pressing ? "worried" : "smile";
  const moodLabel = { smile: "", worried: "", dead: " (you lost)", cool: " (you won)" }[mood];

  return (
    <div
      ref={rootRef}
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          start();
        }
      }}
    >
      <MenuBar menus={menus} />
      {/* Raised outer panel, as in the original. */}
      <div className="mt-0.5 flex min-h-0 flex-1 flex-col gap-1.5 border-[3px] border-t-white border-r-[#808080] border-b-[#808080] border-l-white p-1.5">
        <div className="flex shrink-0 items-center justify-between border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] px-1.5 py-1">
          <LedCounter value={mines - game.flags} label="Mines left" />
          <button
            type="button"
            aria-label={`New game${moodLabel}`}
            title="New game (F2)"
            onClick={() => start()}
            className="flex size-[26px] items-center justify-center border border-[#808080] bg-[#c0c0c0] p-0 shadow-[inset_-2px_-2px_#808080,inset_2px_2px_#fff] outline-none focus-visible:outline-1 focus-visible:outline-offset-1 focus-visible:outline-dotted focus-visible:outline-black active:shadow-[inset_1px_1px_#808080] active:[&>svg]:translate-px"
          >
            <SmileyGlyph mood={mood} />
          </button>
          <LedCounter value={seconds} label="Seconds" />
        </div>

        <div ref={boardRef} className="flex min-h-0 flex-1 items-center justify-center overflow-auto">
          <div
            ref={gridRef}
            role="group"
            aria-label={`Minefield, ${game.level.name}, ${columns} by ${rows}, ${mines} mines`}
            onClick={(event) => {
              const index = indexOf(event.target);
              if (index === null) return;
              if (suppressClick.current) {
                suppressClick.current = false;
                return;
              }
              open(index);
            }}
            onAuxClick={(event) => {
              const index = indexOf(event.target);
              if (event.button === 1 && index !== null) act(chord(game, index));
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              const index = indexOf(event.target);
              // A long-press already flagged it (Android fires contextmenu too).
              if (index === null || suppressClick.current) return;
              if (longPress.current) {
                // contextmenu beat our long-press timer: it does the flagging.
                cancelLongPress();
                suppressClick.current = true;
              }
              mark(index);
            }}
            onPointerDown={onPointerDown}
            onPointerUp={() => cancelLongPress()}
            onPointerMove={cancelLongPress}
            onPointerCancel={() => cancelLongPress()}
            onKeyDown={onKeyDown}
            className="grid shrink-0 touch-manipulation border-[3px] border-t-[#808080] border-r-white border-b-white border-l-[#808080] select-none [-webkit-touch-callout:none]"
            style={{ gridTemplateColumns: `repeat(${columns}, ${cell}px)`, gridAutoRows: `${cell}px` }}
          >
            {game.cells.map((c, index) => {
              const revealed = c.state === "revealed";
              const showMine = over && c.mine && c.state !== "flagged";
              const wrongFlag = game.status === "lost" && c.state === "flagged" && !c.mine;
              const flat = revealed || showMine || wrongFlag;
              return (
                <button
                  key={index}
                  type="button"
                  data-index={index}
                  tabIndex={index === focusIndex ? 0 : -1}
                  aria-label={cellLabel(c, index, game)}
                  onFocus={() => setFocusIndex(index)}
                  className={`flex items-center justify-center p-0 leading-none font-bold outline-none focus-visible:z-10 focus-visible:outline-1 focus-visible:-outline-offset-2 focus-visible:outline-dotted focus-visible:outline-black ${flat
                      ? "border-t border-l border-[#808080]"
                      : `border-0 shadow-[inset_-2px_-2px_#808080,inset_2px_2px_#fff] ${over ? "" : "active:border-t active:border-l active:border-[#808080] active:shadow-none"}`
                    } ${index === game.exploded ? "bg-[#ff0000]" : "bg-[#c0c0c0]"}`}
                  style={{ fontSize: Math.round(cell * 0.62), color: NUMBER_COLORS[revealed ? c.adjacent : 0] }}
                >
                  {wrongFlag ? (
                    <MineGlyph crossed />
                  ) : showMine || (revealed && c.mine) ? (
                    <MineGlyph />
                  ) : c.state === "flagged" ? (
                    <FlagGlyph />
                  ) : c.state === "question" ? (
                    <span className="text-black">?</span>
                  ) : revealed && c.adjacent > 0 ? (
                    c.adjacent
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
