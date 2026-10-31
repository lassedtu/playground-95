"use client";

import { type PointerEvent, useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { hasShortcutModifier, isApplePlatform } from "@/lib/platform";
import { useElementSize } from "@/lib/use-element-size";

import { tileStyle } from "./data/tiles";
import { type Direction, type Game, highestTile, move, newGame, SIZE, WIN_VALUE } from "./lib/game";

/** Must match the id in programs/registry.tsx (used by Game -> Exit). */
const PROGRAM_ID = "game-2048";
const GAME_KEY = "playground95.2048.game";
const BEST_KEY = "playground95.2048.best";
const GAP = 6;
/** Minimum swipe distance in px. */
const SWIPE = 24;

const KEYS: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
};

const APPLE = isApplePlatform();

function loadGame(): Game {
  try {
    const saved = JSON.parse(localStorage.getItem(GAME_KEY) ?? "null") as Game | null;
    if (saved?.tiles?.length) return { ...saved, tiles: saved.tiles.map((t) => ({ ...t, isNew: false, merged: false })) };
  } catch {
    // start fresh
  }
  return newGame();
}

function loadBest(): number {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function store(key: string, value: unknown) {
  try {
    localStorage.setItem(key, typeof value === "string" ? value : JSON.stringify(value));
  } catch {
    // not remembered
  }
}

export function Game2048() {
  const { closeWindow } = useDesktop();
  const [game, setGame] = useState(loadGame);
  const [previous, setPrevious] = useState<Game | null>(null);
  const [best, setBest] = useState(loadBest);
  /** The "You made 2048!" dialog; dismissed by keeping on playing. */
  const [showWin, setShowWin] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const swipe = useRef<{ x: number; y: number } | null>(null);
  const [boardRef, board] = useElementSize<HTMLDivElement>();

  useEffect(() => rootRef.current?.focus(), []);

  function play(direction: Direction) {
    if (showWin) return;
    const next = move(game, direction);
    if (next === game) return;
    setPrevious(game);
    setGame(next);
    store(GAME_KEY, next);
    if (next.score > best) {
      setBest(next.score);
      store(BEST_KEY, String(next.score));
    }
    if (!next.won && highestTile(next) >= WIN_VALUE) {
      setGame({ ...next, won: true });
      store(GAME_KEY, { ...next, won: true });
      setShowWin(true);
    }
  }

  function restart() {
    const fresh = newGame();
    setGame(fresh);
    setPrevious(null);
    setShowWin(false);
    store(GAME_KEY, fresh);
    rootRef.current?.focus();
  }

  function undo() {
    if (!previous) return;
    setGame(previous);
    setPrevious(null);
    setShowWin(false);
    store(GAME_KEY, previous);
    rootRef.current?.focus();
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current;
    swipe.current = null;
    if (!start) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE) return;
    play(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up");
  }

  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "New", shortcut: "F2", onSelect: restart },
        { label: "Undo", shortcut: APPLE ? "⌘Z" : "Ctrl+Z", disabled: !previous, onSelect: undo },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
  ];

  // Square board that fits the space; cells sized to fill it.
  const side = Math.max(0, Math.floor(Math.min(board.width, board.height)));
  const cell = Math.max(0, (side - GAP * (SIZE + 1)) / SIZE);
  const offset = (index: number) => GAP + index * (cell + GAP);
  const iconSize = cell >= 76 ? 32 : 16;

  const message = game.over
    ? "No more moves."
    : showWin
      ? `You made ${WIN_VALUE}!`
      : "Use the arrow keys (or swipe) to slide the tiles.";

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex size-full flex-col outline-none"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          return restart();
        }
        if (hasShortcutModifier(event, APPLE) && event.key.toLowerCase() === "z") {
          event.preventDefault();
          return undo();
        }
        if ((event.target as HTMLElement).closest("[role=menubar], [role=alertdialog]")) return;
        const direction = KEYS[event.key] ?? KEYS[event.key.toLowerCase()];
        if (direction && !event.ctrlKey && !event.metaKey && !event.altKey) {
          event.preventDefault();
          play(direction);
        }
      }}
    >
      <MenuBar menus={menus} />

      <div ref={boardRef} className="relative flex min-h-0 flex-1 items-center justify-center p-2">
        <div
          role="group"
          aria-label={`2048 board. Score ${game.score}.`}
          className="relative touch-none border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-[#808080] select-none"
          style={{ width: side, height: side }}
          onPointerDown={(event) => {
            swipe.current = { x: event.clientX, y: event.clientY };
          }}
          onPointerUp={onPointerUp}
          onPointerCancel={() => {
            swipe.current = null;
          }}
        >
          {/* Empty slots */}
          {Array.from({ length: SIZE * SIZE }, (_, i) => (
            <div
              key={i}
              aria-hidden
              className="absolute bg-[#c0c0c0] shadow-[inset_1px_1px_#000,inset_-1px_-1px_#dfdfdf]"
              style={{ left: offset(i % SIZE), top: offset(Math.floor(i / SIZE)), width: cell, height: cell }}
            />
          ))}
          {/* Tiles */}
          {[...game.tiles]
            .sort((a, b) => a.id - b.id)
            .map((tile) => {
              const { icon: Icon, name, background, color } = tileStyle(tile.value);
              const digits = String(tile.value).length;
              return (
                <div
                  key={tile.id}
                  role="img"
                  aria-label={`${tile.value} (${name}), row ${tile.row + 1}, column ${tile.col + 1}`}
                  className="absolute transition-transform duration-100 ease-out motion-reduce:transition-none"
                  style={{ width: cell, height: cell, transform: `translate(${offset(tile.col)}px, ${offset(tile.row)}px)` }}
                >
                  <div
                    key={`${tile.value}-${tile.merged ? "m" : ""}`}
                    className={`flex size-full flex-col items-center justify-center gap-0.5 shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080] ${tile.isNew ? "animate-tile-pop" : tile.merged ? "animate-tile-merge" : ""
                      } motion-reduce:animate-none`}
                    style={{ background, color }}
                  >
                    <Icon variant="32x32_4" aria-hidden width={iconSize} height={iconSize} />
                    <span
                      className="leading-none font-bold tabular-nums"
                      style={{ fontSize: Math.round(cell * (digits <= 2 ? 0.3 : digits === 3 ? 0.26 : 0.21)) }}
                    >
                      {tile.value}
                    </span>
                  </div>
                </div>
              );
            })}
        </div>

        {(showWin || game.over) && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Frame
              role="alertdialog"
              aria-labelledby="g2048-title"
              aria-describedby="g2048-text"
              boxShadow="$out"
              bgColor="$material"
              className="flex max-w-64 flex-col items-center gap-3 p-4 text-center"
            >
              <p id="g2048-title" className="text-lg font-bold">
                {showWin ? `You made ${WIN_VALUE}!` : "Game over"}
              </p>
              <p id="g2048-text">
                Score: {game.score}
                {game.score >= best && game.score > 0 && " (new best!)"}
              </p>
              <div className="flex gap-2">
                {showWin ? (
                  <Button
                    autoFocus
                    onClick={() => {
                      setShowWin(false);
                      rootRef.current?.focus();
                    }}
                  >
                    Keep going
                  </Button>
                ) : (
                  previous && <Button onClick={undo}>Undo</Button>
                )}
                <Button autoFocus={!showWin} onClick={restart}>
                  New game
                </Button>
              </div>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow title={message}>
          {message}
        </StatusBarField>
        <StatusBarField width={90}>Score: {game.score}</StatusBarField>
        <StatusBarField width={90}>Best: {best}</StatusBarField>
      </StatusBar>
    </div>
  );
}
