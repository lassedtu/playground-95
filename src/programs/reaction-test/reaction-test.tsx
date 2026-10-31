"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

/** Must match the id in programs/registry.tsx (used by Test → Exit). */
const PROGRAM_ID = "reaction-test";
const BEST_KEY = "playground95.reaction-test.best";
const ROUNDS = 5;
/** Random wait before green, in ms. */
const MIN_WAIT = 1500;
const MAX_WAIT = 4500;

/** Ranks by average reaction time, slowest first. Edit freely. */
const RANKS: { below: number; name: string; quip: string }[] = [
  { below: 200, name: "Bill \"Microsoft\" Gates himself", quip: "Creator of microslop windows!" },
  { below: 250, name: "Fortnite Streamer", quip: "Go grind 90's." },
  { below: 320, name: "Human", quip: "Perfectly average." },
  { below: 420, name: "Grandma", quip: "You're gonna have to eat alot more žganci." },
  { below: Infinity, name: "Grandpa", quip: "Did you remember to click?" },
];

const rankFor = (ms: number) => RANKS.find((r) => ms < r.below)!;

type Phase = "idle" | "waiting" | "go" | "early" | "result" | "done";

function loadBest(): number | null {
  try {
    const value = Number(localStorage.getItem(BEST_KEY));
    return value > 0 ? value : null;
  } catch {
    return null;
  }
}

const PANEL: Record<Phase, { background: string; color: string }> = {
  idle: { background: "#000080", color: "#ffffff" },
  waiting: { background: "#c00000", color: "#ffffff" },
  go: { background: "#00a000", color: "#ffffff" },
  early: { background: "#ffff80", color: "#000000" },
  result: { background: "#000080", color: "#ffffff" },
  done: { background: "#c0c0c0", color: "#000000" },
};

export function ReactionTest() {
  const { closeWindow } = useDesktop();
  const [phase, setPhase] = useState<Phase>("idle");
  const [times, setTimes] = useState<number[]>([]);
  const [best, setBest] = useState(loadBest);
  const [newBest, setNewBest] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const greenAt = useRef(0);
  const panelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => panelRef.current?.focus(), []);

  function startRound() {
    clearTimeout(timer.current);
    setPhase("waiting");
    const wait = MIN_WAIT + Math.random() * (MAX_WAIT - MIN_WAIT);
    timer.current = setTimeout(() => {
      setPhase("go");
      // Start the clock once green is actually on screen (after the next paint).
      requestAnimationFrame(() => requestAnimationFrame(() => (greenAt.current = performance.now())));
    }, wait);
  }

  function restart() {
    clearTimeout(timer.current);
    setTimes([]);
    setNewBest(false);
    setPhase("idle");
    panelRef.current?.focus();
  }

  /** The one action: click, tap, Space or Enter on the panel. */
  function react() {
    switch (phase) {
      case "idle":
      case "result":
      case "early":
        return startRound();
      case "waiting":
        clearTimeout(timer.current);
        return setPhase("early");
      case "go": {
        if (!greenAt.current) return; // pressed in the same frame green appeared
        const ms = Math.round(performance.now() - greenAt.current);
        greenAt.current = 0;
        const next = [...times, ms];
        setTimes(next);
        if (next.length < ROUNDS) return setPhase("result");
        const average = Math.round(next.reduce((a, b) => a + b, 0) / next.length);
        const isBest = best === null || average < best;
        if (isBest) {
          setBest(average);
          try {
            localStorage.setItem(BEST_KEY, String(average));
          } catch {
            // not remembered
          }
        }
        setNewBest(isBest);
        return setPhase("done");
      }
      case "done":
        return restart();
    }
  }

  const last = times[times.length - 1];
  const average = times.length ? Math.round(times.reduce((a, b) => a + b, 0) / times.length) : 0;
  const rank = rankFor(average);

  const content: Record<Phase, { title: string; text: string }> = {
    idle: { title: "Reaction Time Test", text: `When the box turns green, click as fast as you can. ${ROUNDS} rounds. Click to start.` },
    waiting: { title: "Wait for green…", text: "" },
    go: { title: "CLICK!", text: "" },
    early: { title: "Too soon!", text: "Wait for green. Click to try this round again." },
    result: { title: `${last} ms`, text: `Round ${times.length} of ${ROUNDS}. Click to keep going.` },
    done: { title: "", text: "" },
  };

  const menus: Menu[] = [
    {
      label: "Test",
      entries: [
        { label: "New", shortcut: "F2", onSelect: restart },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
  ];

  return (
    <div
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
        {phase === "done" ? (
          <Frame
            role="alertdialog"
            aria-labelledby="reaction-rank"
            boxShadow="$in"
            bgColor="$material"
            className="flex flex-1 flex-col items-center justify-center gap-2 p-4 text-center"
          >
            <p className="text-sm">Average over {ROUNDS} rounds</p>
            <p className="text-4xl font-bold tabular-nums">{average} ms</p>
            <p className="text-sm">You are:</p>
            <p id="reaction-rank" className="text-xl font-bold">
              {rank.name}
            </p>
            <p className="italic">{rank.quip}</p>
            {newBest && <p className="font-bold text-[#008000]">New personal best!</p>}
            <p className="text-sm text-[#404040] tabular-nums">{times.map((t) => `${t} ms`).join(" · ")}</p>
            <Button autoFocus onClick={restart} className="mt-1">
              Try again
            </Button>
          </Frame>
        ) : (
          <button
            ref={panelRef}
            type="button"
            aria-live="assertive"
            // Pointer down, not click: a click only fires on release, adding ~100 ms.
            onPointerDown={(event) => {
              if (event.button === 0) react();
            }}
            onKeyDown={(event) => {
              if (event.key === " " || event.key === "Enter") {
                event.preventDefault();
                if (!event.repeat) react();
              }
            }}
            className="flex flex-1 touch-manipulation flex-col items-center justify-center gap-3 border-2 border-t-[#808080] border-r-white border-b-white border-l-[#808080] p-4 text-center outline-none select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-dotted focus-visible:outline-current"
            style={PANEL[phase]}
          >
            <span className="text-3xl font-bold tabular-nums">{content[phase].title}</span>
            {content[phase].text && <span className="max-w-72">{content[phase].text}</span>}
          </button>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow>
          {phase === "done" ? `${rank.name}!` : `Round ${Math.min(times.length + 1, ROUNDS)} of ${ROUNDS}`}
        </StatusBarField>
        <StatusBarField width={110}>Average: {average ? `${average} ms` : "–"}</StatusBarField>
        <StatusBarField width={100}>Best: {best ? `${best} ms` : "–"}</StatusBarField>
      </StatusBar>
    </div>
  );
}
