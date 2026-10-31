"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";
import { Sol1 } from "@react95/icons/Sol1";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { useElementSize } from "@/lib/use-element-size";
import { useElementVisible } from "@/lib/use-element-visible";

import { BEST_SCORES_SIZE, BestScoresWindow } from "./components/best-scores-window";
import { MemoryCard } from "./components/memory-card";
import {
  DEFAULT_DIFFICULTY,
  DIFFICULTIES,
  type Difficulty,
  pairCount,
} from "./data/difficulties";
import { CARD_ICONS } from "./data/icons";
import { formatTime, recordScore } from "./lib/best-scores";
import { deal, flipCard, type Game, hideMismatch } from "./lib/game";

export const MEMORY_PROGRAM_ID = "memory";
const BEST_SCORES_WINDOW_ID = "memory-best-scores";
const DIFFICULTY_KEY = "playground95.memory.difficulty";

/** How long a non-matching pair stays face up. */
const MISMATCH_MS = 900;

const ICONS_BY_ID = new Map(CARD_ICONS.map((icon) => [icon.id, icon]));
const ICON_IDS = CARD_ICONS.map((icon) => icon.id);

function savedDifficulty(): Difficulty {
  try {
    const id = localStorage.getItem(DIFFICULTY_KEY);
    return DIFFICULTIES.find((d) => d.id === id) ?? DEFAULT_DIFFICULTY;
  } catch {
    return DEFAULT_DIFFICULTY;
  }
}

/** Largest square card size that fits the board, and the gap between cards. */
function layout(difficulty: Difficulty, width: number, height: number) {
  const { columns, rows } = difficulty;
  const gap = columns >= 8 ? 5 : columns >= 6 ? 6 : 8;
  const card = Math.floor(
    Math.min((width - gap * (columns - 1)) / columns, (height - gap * (rows - 1)) / rows),
  );
  return { card: Math.max(0, card), gap };
}

export function Memory() {
  const { openWindow, closeWindow } = useDesktop();
  const [game, setGame] = useState<Game>(() => deal(savedDifficulty(), ICON_IDS));
  const [elapsedMs, setElapsedMs] = useState(0);
  const elapsedRef = useRef(0);
  const [newBest, setNewBest] = useState(false);
  const mismatchTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const playAgainRef = useRef<HTMLButtonElement>(null);

  // The clock only runs while you can see the game (paused when minimized).
  const [rootRef, visible] = useElementVisible<HTMLDivElement>();
  const [boardRef, boardSize] = useElementSize<HTMLDivElement>();

  useEffect(() => {
    if (game.status !== "playing" || !visible) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      elapsedRef.current += now - last;
      last = now;
      setElapsedMs(elapsedRef.current);
    }, 250);
    return () => clearInterval(id);
  }, [game.status, visible]);

  useEffect(() => () => clearTimeout(mismatchTimer.current), []);
  // Close the game's extra window together with the game.
  useEffect(() => () => closeWindow(BEST_SCORES_WINDOW_ID), [closeWindow]);

  useEffect(() => {
    if (game.status === "won") playAgainRef.current?.focus();
  }, [game.status]);

  function newGame(difficulty: Difficulty = game.difficulty) {
    clearTimeout(mismatchTimer.current);
    elapsedRef.current = 0;
    setElapsedMs(0);
    setNewBest(false);
    setGame(deal(difficulty, ICON_IDS));
    try {
      localStorage.setItem(DIFFICULTY_KEY, difficulty.id);
    } catch {
      // not remembered, that's fine
    }
  }

  function flip(cardId: number) {
    const next = flipCard(game, cardId);
    if (next === game) return;
    setGame(next);

    if (next.mismatch) {
      const pair = next.mismatch;
      clearTimeout(mismatchTimer.current);
      mismatchTimer.current = setTimeout(
        () => setGame((current) => hideMismatch(current, pair)),
        MISMATCH_MS,
      );
    }
    if (next.status === "won") {
      setNewBest(
        recordScore(next.difficulty, { moves: next.moves, seconds: elapsedRef.current / 1000 }),
      );
    }
  }

  function showBestScores() {
    openWindow({
      id: BEST_SCORES_WINDOW_ID,
      title: "Best Scores",
      icon: <Sol1 variant="16x16_4" />,
      size: BEST_SCORES_SIZE,
      content: <BestScoresWindow onClose={() => closeWindow(BEST_SCORES_WINDOW_ID)} />,
    });
  }

  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "New", shortcut: "F2", onSelect: () => newGame() },
        "divider",
        ...DIFFICULTIES.map((difficulty) => ({
          label: difficulty.name,
          checked: difficulty.id === game.difficulty.id,
          onSelect: () => newGame(difficulty),
        })),
        "divider",
        { label: "Best Scores…", onSelect: showBestScores },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(MEMORY_PROGRAM_ID) },
      ],
    },
  ];

  const { columns } = game.difficulty;
  const { card, gap } = layout(game.difficulty, boardSize.width, boardSize.height);
  const seconds = elapsedMs / 1000;
  const pairs = pairCount(game.difficulty);

  const message =
    game.status === "won"
      ? "You won!"
      : game.status === "ready"
        ? "Click a card to start."
        : game.mismatch
          ? "Not a pair."
          : "Find the pairs!";

  return (
    <div
      ref={rootRef}
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          newGame();
        }
      }}
    >
      <MenuBar menus={menus} />
      <Frame
        boxShadow="$in"
        className="relative mt-0.5 flex min-h-0 flex-1 bg-[#008000] p-3"
      >
        <div ref={boardRef} className="flex min-h-0 flex-1 items-center justify-center">
          {card > 0 && (
            <div
              role="group"
              aria-label={`Memory board, ${game.difficulty.name}, ${columns} by ${game.difficulty.rows}`}
              className="grid"
              style={{ gridTemplateColumns: `repeat(${columns}, ${card}px)`, gap }}
            >
              {game.cards.map((c, index) => (
                <MemoryCard
                  key={c.id}
                  icon={ICONS_BY_ID.get(c.iconId)!}
                  state={c.state}
                  size={card}
                  position={index + 1}
                  onFlip={() => flip(c.id)}
                />
              ))}
            </div>
          )}
        </div>

        {game.status === "won" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Frame
              role="alertdialog"
              aria-labelledby="memory-won-title"
              aria-describedby="memory-won-text"
              boxShadow="$out"
              bgColor="$material"
              className="flex max-w-72 flex-col items-center gap-3 p-4 text-center"
            >
              <p id="memory-won-title" className="font-bold">
                You found all {pairs} pairs!
              </p>
              <p id="memory-won-text">
                {game.moves} moves in {formatTime(seconds)}.
                {newBest && (
                  <>
                    <br />
                    New best score for {game.difficulty.name}!
                  </>
                )}
              </p>
              <Button ref={playAgainRef} onClick={() => newGame()}>
                Play again
              </Button>
            </Frame>
          </div>
        )}
      </Frame>
      <StatusBar>
        <StatusBarField grow>{message}</StatusBarField>
        <StatusBarField width={74}>Moves: {game.moves}</StatusBarField>
        <StatusBarField width={78}>
          Pairs: {game.pairsFound}/{pairs}
        </StatusBarField>
        <StatusBarField width={70}>Time: {formatTime(seconds)}</StatusBarField>
      </StatusBar>
    </div>
  );
}
