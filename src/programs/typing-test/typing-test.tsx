"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";
import { KeyboardMouse } from "@react95/icons/KeyboardMouse";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { useElementVisible } from "@/lib/use-element-visible";

import { BEST_RESULTS_SIZE, BestResultsWindow } from "./components/best-results-window";
import { TextDisplay } from "./components/text-display";
import { TEXTS } from "./data/texts";
import { randomWords } from "./data/words";
import { accuracy, countCorrect, recordResult, type Result, wordsPerMinute } from "./lib/results";

/** Must match the id in programs/registry.tsx (used by Test -> Exit). */
const PROGRAM_ID = "typing-test";
const BEST_WINDOW_ID = "typing-test-best";
const CHOICE_KEY = "playground95.typing-test.choice";

type Choice =
  | { id: string; label: string; kind: "words"; count: number }
  | { id: string; label: string; kind: "text"; text: string };

const WORD_CHOICES: Choice[] = [25, 50, 100].map((count) => ({
  id: `words-${count}`,
  label: `Random words (${count})`,
  kind: "words",
  count,
}));
const TEXT_CHOICES: Choice[] = TEXTS.map((t) => ({ id: t.id, label: t.title, kind: "text", text: t.text }));
const CHOICES = [...WORD_CHOICES, ...TEXT_CHOICES];
/** With no text chosen, it's random words. */
const DEFAULT_CHOICE = WORD_CHOICES[0];

function savedChoice(): Choice {
  try {
    const id = localStorage.getItem(CHOICE_KEY);
    return CHOICES.find((c) => c.id === id) ?? DEFAULT_CHOICE;
  } catch {
    return DEFAULT_CHOICE;
  }
}

const targetFor = (choice: Choice) => (choice.kind === "words" ? randomWords(choice.count) : choice.text);

const formatTime = (ms: number) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

type Status = "ready" | "typing" | "done";

export function TypingTest() {
  const { openWindow, closeWindow } = useDesktop();
  const [choice, setChoice] = useState<Choice>(savedChoice);
  const [target, setTarget] = useState(() => targetFor(choice));
  const [typed, setTyped] = useState("");
  const [status, setStatus] = useState<Status>("ready");
  const [focused, setFocused] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [result, setResult] = useState<(Result & { best: boolean }) | null>(null);
  // Every typed character counts once (corrections don't undo a mistake).
  const [keystrokes, setKeystrokes] = useState({ total: 0, correct: 0 });
  const elapsedRef = useRef(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);

  // The clock runs while typing, paused while the window is minimized.
  const [rootRef, visible] = useElementVisible<HTMLDivElement>();
  useEffect(() => {
    if (status !== "typing" || !visible) return;
    let last = performance.now();
    const id = setInterval(() => {
      const now = performance.now();
      elapsedRef.current += now - last;
      last = now;
      setElapsedMs(elapsedRef.current);
    }, 200);
    return () => clearInterval(id);
  }, [status, visible]);

  useEffect(() => () => closeWindow(BEST_WINDOW_ID), [closeWindow]);
  useEffect(() => {
    if (status === "done") againRef.current?.focus();
  }, [status]);

  function restart(next: Choice = choice) {
    setChoice(next);
    setTarget(targetFor(next));
    setTyped("");
    setStatus("ready");
    setResult(null);
    setElapsedMs(0);
    elapsedRef.current = 0;
    setKeystrokes({ total: 0, correct: 0 });
    try {
      localStorage.setItem(CHOICE_KEY, next.id);
    } catch {
      // not remembered
    }
    // After the results dialog unmounts.
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function onType(value: string) {
    if (status === "done") return;
    const next = value.slice(0, target.length);
    const keys = { ...keystrokes };
    for (let i = typed.length; i < next.length; i++) {
      keys.total++;
      if (next[i] === target[i]) keys.correct++;
    }
    setKeystrokes(keys);
    if (status === "ready" && next.length > 0) setStatus("typing");
    setTyped(next);

    if (next.length === target.length) {
      const ms = Math.max(elapsedRef.current, 1000);
      const final: Result = {
        wpm: wordsPerMinute(countCorrect(next, target), ms),
        accuracy: accuracy(keys.correct, keys.total),
        seconds: Math.round(ms / 1000),
      };
      setStatus("done");
      setElapsedMs(ms);
      setResult({ ...final, best: recordResult(choice.id, final) });
    }
  }

  function showBest() {
    openWindow({
      id: BEST_WINDOW_ID,
      title: "Best Results",
      icon: <KeyboardMouse variant="32x32_4" width={16} height={16} />,
      size: BEST_RESULTS_SIZE,
      content: (
        <BestResultsWindow
          tests={CHOICES.map(({ id, label }) => ({ id, label }))}
          onClose={() => closeWindow(BEST_WINDOW_ID)}
        />
      ),
    });
  }

  const radio = (c: Choice) => ({ label: c.label, checked: c.id === choice.id, onSelect: () => restart(c) });
  const menus: Menu[] = [
    {
      label: "Test",
      entries: [
        { label: "New", shortcut: "F2", onSelect: () => restart() },
        "divider",
        { label: "Best Results…", onSelect: showBest },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    {
      label: "Text",
      entries: [...WORD_CHOICES.map(radio), ...(TEXT_CHOICES.length ? (["divider"] as const) : []), ...TEXT_CHOICES.map(radio)],
    },
  ];

  const liveWpm = wordsPerMinute(countCorrect(typed, target), elapsedMs);
  const liveAccuracy = accuracy(keystrokes.correct, keystrokes.total);
  const message =
    status === "done"
      ? "Finished!"
      : status === "typing"
        ? choice.label
        : focused
          ? "Start typing. The clock starts with your first key."
          : "Click the text to start.";

  return (
    <div
      ref={rootRef}
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          restart();
        }
      }}
    >
      <MenuBar menus={menus} />
      <div className="relative mt-0.5 flex min-h-0 flex-1">
        <Frame
          boxShadow="$in"
          bgColor="$inputBackground"
          className="relative min-h-0 flex-1 cursor-text overflow-auto p-3"
          onClick={() => inputRef.current?.focus()}
        >
          <TextDisplay target={target} typed={typed} focused={focused} />
          {/* Receives the typing; the text above shows it. */}
          <input
            ref={inputRef}
            aria-label={`Type this text: ${target}`}
            value={typed}
            onChange={(event) => onType(event.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onPaste={(event) => event.preventDefault()}
            onDrop={(event) => event.preventDefault()}
            disabled={status === "done"}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="absolute top-0 left-0 size-px opacity-0"
          />
        </Frame>

        {result && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
            <Frame
              role="alertdialog"
              aria-labelledby="typing-result-title"
              aria-describedby="typing-result-text"
              boxShadow="$out"
              bgColor="$material"
              className="flex max-w-72 flex-col items-center gap-3 p-4 text-center"
            >
              <p id="typing-result-title" className="text-lg font-bold">
                {result.wpm} WPM
              </p>
              <p id="typing-result-text">
                {result.accuracy}% accuracy in {formatTime(result.seconds * 1000)}.
                {result.best && (
                  <>
                    <br />
                    New best for {choice.label}!
                  </>
                )}
              </p>
              <Button ref={againRef} onClick={() => restart()}>
                {choice.kind === "words" ? "New words" : "Try again"}
              </Button>
            </Frame>
          </div>
        )}
      </div>
      <StatusBar>
        <StatusBarField grow title={message}>
          {message}
        </StatusBarField>
        <StatusBarField width={70}>WPM: {liveWpm}</StatusBarField>
        <StatusBarField width={110}>Accuracy: {liveAccuracy}%</StatusBarField>
        <StatusBarField width={70}>Time: {formatTime(elapsedMs)}</StatusBarField>
      </StatusBar>
    </div>
  );
}
