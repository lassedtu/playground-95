"use client";

import { useEffect, useRef } from "react";

type TextDisplayProps = {
  target: string;
  typed: string;
  focused: boolean;
};

/**
 * The text to type: done characters black (wrong ones red), the current one
 * highlighted like a Win95 selection, the rest grey. Keeps the current
 * character scrolled into view.
 */
export function TextDisplay({ target, typed, focused }: TextDisplayProps) {
  const currentRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    currentRef.current?.scrollIntoView({ block: "nearest" });
  }, [typed.length]);

  return (
    <p aria-hidden className="text-base leading-relaxed break-words whitespace-pre-wrap">
      {[...target].map((char, i) => {
        if (i < typed.length) {
          const wrong = typed[i] !== char;
          return (
            <span
              key={i}
              className={wrong ? `text-[#c00000] ${char === " " ? "bg-[#ffc0c0]" : "underline decoration-[#c00000]"}` : "text-black"}
            >
              {char}
            </span>
          );
        }
        if (i === typed.length) {
          return (
            <span
              key={i}
              ref={currentRef}
              className={focused ? "bg-win-navy text-white" : "text-[#808080] underline"}
            >
              {char}
            </span>
          );
        }
        return (
          <span key={i} className="text-[#808080]">
            {char}
          </span>
        );
      })}
    </p>
  );
}
