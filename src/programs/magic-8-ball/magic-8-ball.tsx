"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Input } from "@react95/core";

import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { EightBall } from "./components/eight-ball";
import { type Answer, pickAnswer } from "./data/answers";
import { useWindowShake } from "./lib/use-window-shake";

/** How long the ball shakes before the answer floats up. Matches --animate-ball-shake. */
const SHAKE_MS = 900;

export function MagicEightBall() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [shaking, setShaking] = useState(false);
  const [revealKey, setRevealKey] = useState(0);
  const shakeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(shakeTimer.current), []);

  function shake() {
    if (shaking) return;
    setShaking(true);
    shakeTimer.current = setTimeout(() => {
      setAnswer((previous) => pickAnswer(previous));
      setRevealKey((key) => key + 1);
      setShaking(false);
    }, SHAKE_MS);
  }

  // Dragging the window back and forth shakes the ball too.
  const shakeRef = useWindowShake<HTMLDivElement>(shake);

  const message = shaking
    ? "Shaking…"
    : answer
      ? `${question.trim() ? `“${question.trim()}” ` : ""}${answer.text}.`
      : "Ask a yes-or-no question, then shake the window.";

  return (
    <div ref={shakeRef} className="flex size-full flex-col">
      {/* Size container: the ball fits the space both ways (see EightBall). */}
      <div className="flex min-h-0 flex-1 items-center justify-center p-4 [container-type:size]">
        <EightBall answer={answer} shaking={shaking} revealKey={revealKey} />
      </div>
      <form
        className="flex shrink-0 gap-2 px-1 pb-2"
        onSubmit={(event) => {
          event.preventDefault();
          shake();
        }}
      >
        <Input
          aria-label="Your question"
          placeholder="Will it rain tomorrow?"
          value={question}
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setQuestion(event.target.value)}
          className="min-w-0 flex-1"
        />
        <Button type="submit" disabled={shaking}>
          Shake
        </Button>
      </form>
      <StatusBar>
        <StatusBarField grow title={message}>
          {message}
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
