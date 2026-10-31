"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { Gallows, MAX_MISSES } from "./components/gallows";
import { CATEGORIES, type Category, CATEGORY_NAMES } from "./data/words";

/** Must match the id in programs/registry.tsx (used by Game → Exit). */
const PROGRAM_ID = "hangman";
const STATS_KEY = "playground95.hangman.stats";
const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

type Choice = Category | "Random";
type Round = { word: string; category: Category; guessed: string[] };
type Stats = { wins: number; losses: number; streak: number; best: number };

function pick(choice: Choice, avoid?: string): Round {
  const category = choice === "Random" ? CATEGORY_NAMES[Math.floor(Math.random() * CATEGORY_NAMES.length)] : choice;
  const words: readonly string[] = CATEGORIES[category];
  let word: string;
  do word = words[Math.floor(Math.random() * words.length)];
  while (word === avoid && words.length > 1);
  return { word, category, guessed: [] };
}

function loadStats(): Stats {
  try {
    return { wins: 0, losses: 0, streak: 0, best: 0, ...JSON.parse(localStorage.getItem(STATS_KEY) ?? "{}") };
  } catch {
    return { wins: 0, losses: 0, streak: 0, best: 0 };
  }
}

export function Hangman() {
  const { closeWindow } = useDesktop();
  const [choice, setChoice] = useState<Choice>("Random");
  const [round, setRound] = useState<Round>(() => pick("Random"));
  const [stats, setStats] = useState<Stats>(loadStats);
  const rootRef = useRef<HTMLDivElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  const letters = new Set(round.word.replace(/ /g, ""));
  const misses = round.guessed.filter((g) => !letters.has(g)).length;
  const won = [...letters].every((l) => round.guessed.includes(l));
  const lost = misses >= MAX_MISSES;
  const over = won || lost;

  useEffect(() => rootRef.current?.focus(), []);
  useEffect(() => {
    if (over) againRef.current?.focus();
  }, [over]);

  function newRound(next: Choice = choice) {
    setChoice(next);
    setRound(pick(next, round.word));
    rootRef.current?.focus();
  }

  function guess(letter: string) {
    if (over || round.guessed.includes(letter)) return;
    const guessed = [...round.guessed, letter];
    setRound({ ...round, guessed });

    const nowMisses = guessed.filter((g) => !letters.has(g)).length;
    const nowWon = [...letters].every((l) => guessed.includes(l));
    if (!nowWon && nowMisses < MAX_MISSES) return;
    const streak = nowWon ? stats.streak + 1 : 0;
    const next: Stats = {
      wins: stats.wins + (nowWon ? 1 : 0),
      losses: stats.losses + (nowWon ? 0 : 1),
      streak,
      best: Math.max(stats.best, streak),
    };
    setStats(next);
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(next));
    } catch {
      // not remembered
    }
  }

  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "New Word", shortcut: "F2", onSelect: () => newRound() },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    {
      label: "Category",
      entries: [
        { label: "Random", checked: choice === "Random", onSelect: () => newRound("Random") },
        "divider",
        ...CATEGORY_NAMES.map((name) => ({ label: name, checked: choice === name, onSelect: () => newRound(name) })),
      ],
    },
  ];

  const message = won
    ? "You got it!"
    : lost
      ? `Out of guesses. It was "${round.word.toUpperCase()}".`
      : misses === MAX_MISSES - 1
        ? "One wrong guess left…"
        : "Guess a letter.";

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex size-full flex-col outline-none"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          return newRound();
        }
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if ((event.target as HTMLElement).closest("[role=menubar]")) return;
        const key = event.key.toLowerCase();
        if (key.length === 1 && ALPHABET.includes(key)) {
          event.preventDefault();
          guess(key);
        }
      }}
    >
      <MenuBar menus={menus} />

      <div className="relative flex min-h-0 flex-1 flex-col items-center gap-3 p-3">
        <p className="shrink-0">
          Category: <span className="font-bold">{round.category}</span>
        </p>

        <div className="flex min-h-0 flex-1 items-center justify-center">
          <Gallows misses={misses} lost={lost} />
        </div>

        {/* The word: blanks for letters not guessed yet, gaps between words. */}
        <p
          aria-label={`Word: ${[...round.word]
            .map((c) => (c === " " ? "space" : round.guessed.includes(c) || lost ? c.toUpperCase() : "blank"))
            .join(", ")}`}
          className="flex shrink-0 flex-wrap justify-center gap-x-1 gap-y-2"
        >
          {[...round.word].map((char, i) =>
            char === " " ? (
              <span key={i} aria-hidden className="w-4" />
            ) : (
              <span
                key={i}
                aria-hidden
                className={`flex h-8 w-5 items-end justify-center border-b-2 border-black pb-1 text-xl leading-none font-bold uppercase ${
                  lost && !round.guessed.includes(char) ? "text-[#c00000]" : ""
                }`}
              >
                {round.guessed.includes(char) || lost ? char : ""}
              </span>
            ),
          )}
        </p>

        {/* Letter buttons */}
        <div role="group" aria-label="Letters" className="grid shrink-0 grid-cols-9 gap-1 sm:grid-cols-13">
          {[...ALPHABET].map((letter) => {
            const tried = round.guessed.includes(letter);
            const hit = tried && letters.has(letter);
            return (
              <Button
                key={letter}
                disabled={tried || over}
                aria-label={`${letter.toUpperCase()}${tried ? (hit ? ", in the word" : ", not in the word") : ""}`}
                onClick={() => guess(letter)}
                className={`size-8 !min-w-0 p-0 font-bold uppercase ${tried ? (hit ? "!text-[#008000]" : "!text-[#c00000] line-through") : ""}`}
              >
                {letter}
              </Button>
            );
          })}
        </div>

        {over && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25">
            <Frame
              role="alertdialog"
              aria-labelledby="hangman-result"
              boxShadow="$out"
              bgColor="$material"
              className="flex max-w-72 flex-col items-center gap-3 p-4 text-center"
            >
              <p id="hangman-result" className="text-lg font-bold">
                {won ? "Saved!" : "Hanged!"}
              </p>
              <p>
                The word was <span className="font-bold uppercase">{round.word}</span>
                {won && ` with ${MAX_MISSES - misses} ${MAX_MISSES - misses === 1 ? "life" : "lives"} to spare`}.
              </p>
              <Button ref={againRef} onClick={() => newRound()}>
                Next word
              </Button>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow title={message}>
          {message}
        </StatusBarField>
        <StatusBarField width={90}>
          Misses: {misses}/{MAX_MISSES}
        </StatusBarField>
        <StatusBarField width={110}>
          Wins: {stats.wins} · Streak: {stats.streak}
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
