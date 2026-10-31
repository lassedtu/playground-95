"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { StatsPanel } from "./components/stats-panel";
import {
  dailyWord,
  dayNumber,
  isValidWord,
  keyboardMarks,
  MAX_GUESSES,
  type Mark,
  scoreGuess,
  WORD_LENGTH,
} from "./lib/game";
import { loadGuesses, loadStats, recordGame, saveGuesses, type Stats } from "./lib/storage";

/** Must match the id in programs/registry.tsx (used by Game → Exit). */
const PROGRAM_ID = "word-guess";
/** Day numbers count from here in the share text ("Word Guess #1"). */
const FIRST_DAY = dayNumber(new Date(2026, 10, 1));

const KEY_ROWS = ["qwertyuiop", "asdfghjkl", "+zxcvbnm-"]; // + = Enter, - = Backspace

const TILE: Record<Mark, string> = {
  correct: "bg-[#008000] text-white border-[#008000]",
  present: "bg-[#d4b000] text-black border-[#d4b000]",
  absent: "bg-[#808080] text-white border-[#808080]",
};
const KEY: Record<Mark, string> = {
  correct: "!bg-[#008000] text-white",
  present: "!bg-[#d4b000] text-black",
  absent: "!bg-[#808080] text-white",
};
const EMOJI: Record<Mark, string> = { correct: "🟩", present: "🟨", absent: "⬜" };
const SPOKEN: Record<Mark, string> = { correct: "correct", present: "in the word", absent: "not in the word" };

function untilMidnight(now = new Date()) {
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const s = Math.max(0, Math.floor((midnight.getTime() - now.getTime()) / 1000));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(s % 60)}`;
}

type Panel = "none" | "stats" | "help";

export function WordGuess() {
  const { closeWindow } = useDesktop();
  const [day, setDay] = useState(dayNumber);
  const answer = dailyWord(day);
  const [guesses, setGuesses] = useState(() => loadGuesses(day));
  const [current, setCurrent] = useState("");
  const [message, setMessage] = useState("");
  const [shakeKey, setShakeKey] = useState(0);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [panel, setPanel] = useState<Panel>(() => (loadGuesses(day).length === 0 && loadStats().played === 0 ? "help" : "none"));
  const [countdown, setCountdown] = useState(untilMidnight);
  const rootRef = useRef<HTMLDivElement>(null);

  const won = guesses.includes(answer);
  const over = won || guesses.length >= MAX_GUESSES;

  // A new word at midnight, and the countdown to it.
  useEffect(() => {
    const id = setInterval(() => {
      setCountdown(untilMidnight());
      const today = dayNumber();
      if (today !== day) {
        setDay(today);
        setGuesses([]);
        setCurrent("");
        setMessage("A new word is ready!");
        setPanel("none");
      }
    }, 1000);
    return () => clearInterval(id);
  }, [day]);

  useEffect(() => rootRef.current?.focus(), []);

  function submit() {
    if (current.length < WORD_LENGTH) return reject("Not enough letters.");
    if (!isValidWord(current)) return reject("Not in the word list.");
    const next = [...guesses, current];
    setGuesses(next);
    setCurrent("");
    saveGuesses(day, next);

    const solved = current === answer;
    if (solved || next.length >= MAX_GUESSES) {
      setStats(recordGame(day, solved, next.length));
      setMessage(solved ? ["Genius!", "Magnificent!", "Impressive!", "Splendid!", "Great!", "Phew!"][next.length - 1] : `The word was ${answer.toUpperCase()}.`);
      setPanel("stats");
    } else {
      setMessage("");
    }
  }

  function reject(text: string) {
    setMessage(text);
    setShakeKey((k) => k + 1);
  }

  function press(key: string) {
    if (over) return;
    if (key === "enter") submit();
    else if (key === "backspace") setCurrent((c) => c.slice(0, -1));
    else if (/^[a-z]$/.test(key) && current.length < WORD_LENGTH) setCurrent((c) => c + key);
  }

  async function share() {
    const rows = guesses.map((g) => scoreGuess(g, answer).map((m) => EMOJI[m]).join(""));
    const text = `Word Guess 95 #${day - FIRST_DAY + 1} ${won ? guesses.length : "X"}/${MAX_GUESSES}\n\n${rows.join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      setMessage("Copied to the clipboard!");
    } catch {
      setMessage("Couldn't copy to the clipboard.");
    }
  }

  const keys = keyboardMarks(guesses, answer);
  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "Statistics…", onSelect: () => setPanel("stats") },
        { label: "Share Result", disabled: !over, onSelect: () => void share() },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    { label: "Help", entries: [{ label: "How to Play", onSelect: () => setPanel("help") }] },
  ];

  const rows = Array.from({ length: MAX_GUESSES }, (_, i) => guesses[i] ?? (i === guesses.length ? current : ""));

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex size-full flex-col outline-none"
      onKeyDown={(event) => {
        if (event.ctrlKey || event.metaKey || event.altKey) return;
        if ((event.target as HTMLElement).closest("[role=menubar], [data-panel]")) return;
        const key = event.key.toLowerCase();
        if (key === "enter" || key === "backspace" || /^[a-z]$/.test(key)) {
          event.preventDefault();
          press(key);
        }
      }}
    >
      <MenuBar menus={menus} />

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-3 p-2">
        {/* Board */}
        <div role="group" aria-label="Guesses" className="grid gap-1" style={{ gridTemplateRows: `repeat(${MAX_GUESSES}, 1fr)` }}>
          {rows.map((word, row) => {
            const scored = row < guesses.length ? scoreGuess(word, answer) : null;
            const label = scored
              ? [...word].map((l, i) => `${l.toUpperCase()} ${SPOKEN[scored[i]]}`).join(", ")
              : word
                ? `Typing: ${word.toUpperCase()}`
                : "Empty";
            return (
              <div
                key={row === guesses.length ? `current-${shakeKey}` : row}
                role="img"
                aria-label={`Row ${row + 1}: ${label}`}
                className={`flex gap-1 ${row === guesses.length && shakeKey ? "animate-row-shake motion-reduce:animate-none" : ""}`}
              >
                {Array.from({ length: WORD_LENGTH }, (_, i) => {
                  const letter = word[i] ?? "";
                  const mark = scored?.[i];
                  return (
                    <span
                      key={i}
                      aria-hidden
                      className={`flex size-10 items-center justify-center border-2 text-xl font-bold uppercase ${
                        mark
                          ? `${TILE[mark]} animate-tile-reveal motion-reduce:animate-none`
                          : letter
                            ? "border-black bg-white"
                            : "border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white"
                      }`}
                      style={mark ? { animationDelay: `${i * 120}ms` } : undefined}
                    >
                      {letter}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* On-screen keyboard */}
        <div role="group" aria-label="Keyboard" className="flex flex-col items-center gap-1">
          {KEY_ROWS.map((row) => (
            <div key={row} className="flex gap-1">
              {[...row].map((char) => {
                const key = char === "+" ? "enter" : char === "-" ? "backspace" : char;
                const mark = keys.get(char);
                const label = key === "enter" ? "Enter" : key === "backspace" ? "⌫" : char.toUpperCase();
                return (
                  <Button
                    key={key}
                    aria-label={key === "backspace" ? "Backspace" : mark ? `${label}, ${SPOKEN[mark]}` : label}
                    disabled={over}
                    onClick={() => press(key)}
                    className={`h-9 !min-w-0 p-0 font-bold ${key.length > 1 ? "w-14" : "w-7"} ${mark ? KEY[mark] : ""}`}
                  >
                    {label}
                  </Button>
                );
              })}
            </div>
          ))}
        </div>

        {panel !== "none" && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/25 p-3">
            <Frame
              data-panel
              role="dialog"
              aria-label={panel === "help" ? "How to play" : "Statistics"}
              boxShadow="$out"
              bgColor="$material"
              className="flex max-h-full w-72 flex-col gap-3 overflow-auto p-3"
            >
              {panel === "help" ? (
                <div className="flex flex-col gap-2">
                  <p className="font-bold">Guess the word in {MAX_GUESSES} tries.</p>
                  <p>Type a five-letter word and press Enter. After each guess, the letters change colour:</p>
                  <ul className="m-0 flex list-none flex-col gap-1 p-0">
                    <li><span className={`inline-block w-5 text-center font-bold ${TILE.correct}`}>W</span> is in the word, in the right spot.</li>
                    <li><span className={`inline-block w-5 text-center font-bold ${TILE.present}`}>O</span> is in the word, in another spot.</li>
                    <li><span className={`inline-block w-5 text-center font-bold ${TILE.absent}`}>R</span> isn&apos;t in the word.</li>
                  </ul>
                  <p>There&apos;s a new word every day at midnight.</p>
                </div>
              ) : (
                <>
                  {over && (
                    <p className="text-center font-bold">
                      {won ? `Solved in ${guesses.length}!` : `The word was ${answer.toUpperCase()}.`}
                    </p>
                  )}
                  <StatsPanel stats={stats} highlight={won ? guesses.length - 1 : null} />
                  {over && (
                    <p className="text-center">
                      Next word in <span className="font-bold tabular-nums">{countdown}</span>
                    </p>
                  )}
                </>
              )}
              <div className="flex justify-center gap-2">
                {panel === "stats" && over && <Button onClick={() => void share()}>Share</Button>}
                <Button
                  onClick={() => {
                    setPanel("none");
                    rootRef.current?.focus();
                  }}
                >
                  {panel === "help" ? "Play" : "Close"}
                </Button>
              </div>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow>{message || (over ? "Come back tomorrow for a new word." : "Type a word and press Enter.")}</StatusBarField>
        <StatusBarField width={90}>
          Guess {Math.min(guesses.length + (over ? 0 : 1), MAX_GUESSES)}/{MAX_GUESSES}
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
