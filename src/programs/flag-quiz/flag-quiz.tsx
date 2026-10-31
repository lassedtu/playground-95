"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Fieldset, Frame, Input, RadioButton, Range } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import {
  type Config,
  countriesIn,
  DIFFICULTIES,
  flagUrl,
  isCorrectName,
  makeQuiz,
  type Question,
  REGIONS,
  regionLabel,
  verdict,
} from "./lib/quiz";

/** Must match the id in programs/registry.tsx (used by Game → Exit). */
const PROGRAM_ID = "flag-quiz";
const SETTINGS_KEY = "playground95.flag-quiz.settings";
const DEFAULT_CONFIG: Config = { region: "all", difficulty: "easy", count: 10 };

type Answer = { question: Question; correct: boolean; given: string };
type Screen = { kind: "setup" } | { kind: "quiz"; questions: Question[] } | { kind: "results" };

function loadConfig(): Config {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? "{}") as Partial<Config>;
    const region = REGIONS.includes(saved.region as never) ? saved.region! : DEFAULT_CONFIG.region;
    return {
      region,
      difficulty: DIFFICULTIES.some((d) => d.id === saved.difficulty) ? saved.difficulty! : DEFAULT_CONFIG.difficulty,
      count: Math.min(countriesIn(region).length, Math.max(1, saved.count ?? DEFAULT_CONFIG.count)),
    };
  } catch {
    return DEFAULT_CONFIG;
  }
}

/** Slider steps like the original: finer for small regions. */
const stepFor = (max: number) => (max <= 20 ? 1 : max <= 50 ? 5 : 10);

function Flag({ code, name, className = "" }: { code: string; name?: string; className?: string }) {
  return (
    // Remote SVG from flagcdn; next/image would need extra config for it.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={flagUrl(code)}
      alt={name ? `Flag of ${name}` : "The flag to guess"}
      draggable={false}
      className={`border border-[#808080] object-contain select-none ${className}`}
    />
  );
}

export function FlagQuiz() {
  const { closeWindow } = useDesktop();
  const [config, setConfig] = useState(loadConfig);
  const [screen, setScreen] = useState<Screen>({ kind: "setup" });
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [typed, setTyped] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const typedRef = useRef<HTMLInputElement>(null);

  const questions = screen.kind === "quiz" ? screen.questions : [];
  const question = questions[index];
  const current = answers[index]; // set once this question is answered
  const score = answers.filter((a) => a.correct).length;
  const maxCount = countriesIn(config.region).length;

  useEffect(() => {
    if (current) nextRef.current?.focus();
    else if (screen.kind === "quiz" && config.difficulty === "hard") typedRef.current?.focus();
    else rootRef.current?.focus();
  }, [current, screen.kind, index, config.difficulty]);

  function updateConfig(patch: Partial<Config>) {
    const next = { ...config, ...patch };
    next.count = Math.min(countriesIn(next.region).length, next.count);
    setConfig(next);
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      // not remembered
    }
  }

  function start() {
    setScreen({ kind: "quiz", questions: makeQuiz(config) });
    setIndex(0);
    setAnswers([]);
    setTyped("");
  }

  function answer(given: string, correct: boolean) {
    if (!question || current) return;
    setAnswers([...answers, { question, correct, given }]);
  }

  function next() {
    if (index + 1 < questions.length) {
      setIndex(index + 1);
      setTyped("");
    } else {
      setScreen({ kind: "results" });
    }
  }

  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "New Quiz", shortcut: "F2", onSelect: start },
        { label: "Settings…", onSelect: () => setScreen({ kind: "setup" }) },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
  ];

  const percent = answers.length ? Math.round((score / answers.length) * 100) : 0;
  const status =
    screen.kind === "setup"
      ? "Choose your quiz, then press Start."
      : screen.kind === "results"
        ? `${verdict(percent)} ${score} of ${answers.length} right.`
        : current
          ? current.correct
            ? "Correct!"
            : `Wrong. It's ${question.answer.name}.`
          : config.difficulty === "hard"
            ? "Type the country's name and press Enter."
            : "Which country's flag is this? (keys 1–6 work too)";

  return (
    <div
      ref={rootRef}
      tabIndex={-1}
      className="flex size-full flex-col outline-none"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          return start();
        }
        if (screen.kind !== "quiz" || !question) return;
        if (current && event.key === "Enter") {
          event.preventDefault();
          return next();
        }
        // Number keys pick an option.
        const option = question.options[Number(event.key) - 1];
        if (!current && option && !(event.target instanceof HTMLInputElement)) {
          event.preventDefault();
          answer(option.name, option.code === question.answer.code);
        }
      }}
    >
      <MenuBar menus={menus} />

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto p-3">
        {screen.kind === "setup" && (
          <form
            className="m-auto flex w-full max-w-md flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              start();
            }}
          >
            <Fieldset legend="Region">
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                {REGIONS.map((region) => (
                  <RadioButton
                    key={region}
                    name="region"
                    value={region}
                    checked={config.region === region}
                    onChange={() => updateConfig({ region })}
                  >
                    {regionLabel(region)} ({countriesIn(region).length})
                  </RadioButton>
                ))}
              </div>
            </Fieldset>
            <Fieldset legend="Difficulty">
              <div className="flex flex-col gap-1">
                {DIFFICULTIES.map((d) => (
                  <RadioButton
                    key={d.id}
                    name="difficulty"
                    value={d.id}
                    checked={config.difficulty === d.id}
                    onChange={() => updateConfig({ difficulty: d.id })}
                  >
                    {d.name} ({d.hint})
                  </RadioButton>
                ))}
              </div>
            </Fieldset>
            <Fieldset legend={`Number of flags: ${config.count}`}>
              <Range
                aria-label="Number of flags"
                min={1}
                max={maxCount}
                step={1}
                value={config.count}
                onChange={(event: React.ChangeEvent<HTMLInputElement>) => {
                  const step = stepFor(maxCount);
                  const raw = Number(event.target.value);
                  // Snap to the step, but always allow the region's full count.
                  const snapped = raw >= maxCount ? maxCount : Math.max(1, Math.round(raw / step) * step);
                  updateConfig({ count: Math.min(maxCount, snapped) });
                }}
                className="w-full"
              />
            </Fieldset>
            <div className="flex justify-end">
              <Button type="submit" className="min-w-24 font-bold">
                Start
              </Button>
            </div>
          </form>
        )}

        {screen.kind === "quiz" && question && (
          <div className="m-auto flex w-full max-w-md flex-col items-center gap-3">
            <div className="w-full">
              <ProgressBar label="Quiz progress" percent={(index / questions.length) * 100} />
              <p className="mt-1 flex justify-between text-[11px]">
                <span>
                  Flag {index + 1} of {questions.length}
                </span>
                <span>Score: {score}</span>
              </p>
            </div>

            <Frame boxShadow="$in" bgColor="$inputBackground" className="flex h-40 w-full items-center justify-center p-3">
              <Flag code={question.answer.code} className="max-h-full max-w-full" />
            </Frame>

            {config.difficulty === "hard" ? (
              <form
                className="flex w-full gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  if (typed.trim()) answer(typed, isCorrectName(typed, question.answer));
                }}
              >
                <Input
                  ref={typedRef}
                  aria-label="Country name"
                  placeholder="Type the country's name…"
                  value={typed}
                  disabled={!!current}
                  autoComplete="off"
                  spellCheck={false}
                  onChange={(event) => setTyped(event.target.value)}
                  className="min-w-0 flex-1"
                />
                <Button type="submit" disabled={!!current}>
                  Answer
                </Button>
              </form>
            ) : (
              <div className={`grid w-full gap-1.5 ${question.options.length > 4 ? "grid-cols-2 sm:grid-cols-3" : "grid-cols-2"}`}>
                {question.options.map((option, i) => {
                  const isAnswer = option.code === question.answer.code;
                  const picked = current?.given === option.name;
                  const mark = current ? (isAnswer ? "✓" : picked ? "✗" : "") : "";
                  return (
                    <Button
                      key={option.code}
                      disabled={!!current && !isAnswer && !picked}
                      aria-label={`${i + 1}: ${option.name}${mark === "✓" ? ", correct answer" : mark === "✗" ? ", your answer, wrong" : ""}`}
                      onClick={() => answer(option.name, isAnswer)}
                      className={`relative h-10 !min-w-0 px-5 leading-tight ${current && isAnswer ? "font-bold" : ""}`}
                    >
                      <span aria-hidden className="absolute top-0.5 left-1 text-[10px] text-[#808080]">
                        {i + 1}
                      </span>
                      {mark && (
                        <span
                          aria-hidden
                          className={`absolute top-1/2 right-1.5 -translate-y-1/2 font-bold ${isAnswer ? "text-[#008000]" : "text-[#c00000]"}`}
                        >
                          {mark}
                        </span>
                      )}
                      {option.name}
                    </Button>
                  );
                })}
              </div>
            )}

            <div className="flex h-9 items-center gap-3">
              {current && (
                <>
                  <span className={`font-bold ${current.correct ? "text-[#008000]" : "text-[#c00000]"}`}>
                    {current.correct ? "✓ Correct!" : `✗ It's ${question.answer.name}.`}
                  </span>
                  <Button ref={nextRef} onClick={next}>
                    {index + 1 < questions.length ? "Next flag →" : "See results"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {screen.kind === "results" && (
          <div className="m-auto flex w-full max-w-md flex-col items-center gap-3 text-center">
            <p className="text-2xl font-bold">{verdict(percent)}</p>
            <p className="text-4xl font-bold tabular-nums">
              {score} / {answers.length}
            </p>
            <p>
              {percent}% · {regionLabel(config.region)} · {DIFFICULTIES.find((d) => d.id === config.difficulty)!.name}
            </p>

            {answers.some((a) => !a.correct) && (
              <Fieldset legend="Flags you missed" className="w-full text-left">
                <ul className="m-0 flex max-h-40 list-none flex-col gap-1 overflow-y-auto p-0">
                  {answers
                    .filter((a) => !a.correct)
                    .map(({ question: q, given }) => (
                      <li key={q.answer.code} className="flex items-center gap-2">
                        <Flag code={q.answer.code} name={q.answer.name} className="h-5 w-8 shrink-0" />
                        <span>
                          <span className="font-bold">{q.answer.name}</span>
                          <span className="text-[#808080]"> (you said {given || "nothing"})</span>
                        </span>
                      </li>
                    ))}
                </ul>
              </Fieldset>
            )}

            <div className="flex gap-2">
              <Button autoFocus onClick={start}>
                Play again
              </Button>
              <Button onClick={() => setScreen({ kind: "setup" })}>Change settings</Button>
            </div>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow title={status}>
          {status}
        </StatusBarField>
        {screen.kind === "quiz" && (
          <StatusBarField width={90}>
            Score: {score}/{answers.length}
          </StatusBarField>
        )}
      </StatusBar>
    </div>
  );
}
