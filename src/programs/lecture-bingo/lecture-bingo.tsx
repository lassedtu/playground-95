"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Frame, Input } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import { cardFor, CENTER, completedLines, normalizeCode, randomCode, SIZE } from "./lib/card";

/** Must match the id in programs/registry.tsx (used by Game → Exit). */
const PROGRAM_ID = "lecture-bingo";
const STORAGE_KEY = "playground95.lecture-bingo";

type Saved = { code: string; marked: number[] };

function load(): Saved {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Saved | null;
    if (saved && normalizeCode(saved.code)) return saved;
  } catch {
    // start fresh
  }
  return { code: randomCode(), marked: [] };
}

function save(state: Saved) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // not remembered
  }
}

type Dialog = null | "code" | "bingo";

export function LectureBingo() {
  const { closeWindow } = useDesktop();
  const [{ code, marked: markedList }, setState] = useState(load);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState(false);
  const [message, setMessage] = useState("");
  const codeInputRef = useRef<HTMLInputElement>(null);

  const squares = cardFor(code);
  // The free square is always marked.
  const marked = new Set([...markedList, CENTER]);
  const lines = completedLines(marked);
  const winning = new Set(lines.flat());
  const blackout = marked.size === SIZE * SIZE;

  useEffect(() => {
    if (dialog === "code") codeInputRef.current?.focus();
  }, [dialog]);

  function update(next: Saved) {
    setState(next);
    save(next);
  }

  function toggle(index: number) {
    if (index === CENTER) return;
    const set = new Set(markedList);
    if (set.has(index)) set.delete(index);
    else set.add(index);
    const nextMarked = [...set];
    const before = lines.length;
    const after = completedLines(new Set([...nextMarked, CENTER])).length;
    update({ code, marked: nextMarked });
    setMessage("");
    if (after > before) setDialog("bingo");
  }

  function newCard(nextCode = randomCode()) {
    update({ code: nextCode, marked: [] });
    setDialog(null);
    setMessage(`New card: ${nextCode}`);
  }

  function applyFriendsCode() {
    const next = normalizeCode(codeInput);
    if (!next) return setCodeError(true);
    newCard(next);
    setMessage(`Playing ${next}. Same card as your friend!`);
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setMessage(`Copied ${code}. Send it to the person next to you.`);
    } catch {
      setMessage(`Your code is ${code}.`);
    }
  }

  const menus: Menu[] = [
    {
      label: "Game",
      entries: [
        { label: "New Card", shortcut: "F2", onSelect: () => newCard() },
        "divider",
        { label: "Copy Card Code", onSelect: () => void copyCode() },
        {
          label: "Use a Friend's Card…",
          onSelect: () => {
            setCodeInput("");
            setCodeError(false);
            setDialog("code");
          },
        },
        "divider",
        { label: "Clear Marks", disabled: markedList.length === 0, onSelect: () => update({ code, marked: [] }) },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
  ];

  const status =
    message ||
    (blackout
      ? "BLACKOUT! Every single square. Was the lecture that bad?"
      : lines.length
        ? `BINGO! ${lines.length} line${lines.length > 1 ? "s" : ""}. Keep going for a blackout.`
        : "Click a square when it happens.");

  return (
    <div
      className="flex size-full flex-col"
      onKeyDown={(event) => {
        if (event.key === "F2") {
          event.preventDefault();
          newCard();
        }
        if (event.key === "Escape" && dialog) setDialog(null);
      }}
    >
      <MenuBar menus={menus} />

      <div className="relative flex min-h-0 flex-1 flex-col gap-1 p-1.5">
        {/* B I N G O header */}
        <div aria-hidden className="grid shrink-0 grid-cols-5 gap-1">
          {[..."BINGO"].map((letter) => (
            <span key={letter} className="bg-win-navy text-center text-lg leading-7 font-bold text-white">
              {letter}
            </span>
          ))}
        </div>

        <div
          role="group"
          aria-label={`Bingo card ${code}`}
          className="grid min-h-0 flex-1 grid-cols-5 grid-rows-5 gap-1"
        >
          {squares.map((text, index) => {
            const isMarked = marked.has(index);
            const free = index === CENTER;
            const inLine = winning.has(index);
            return (
              <button
                key={index}
                type="button"
                aria-pressed={isMarked}
                aria-label={`${text}${isMarked ? ", marked" : ""}${inLine ? ", in a bingo line" : ""}`}
                aria-disabled={free}
                onClick={() => toggle(index)}
                className={`relative isolate flex min-h-0 items-center justify-center overflow-hidden p-1 text-center text-[11px] leading-tight outline-none select-none focus-visible:outline-1 focus-visible:-outline-offset-4 focus-visible:outline-dotted focus-visible:outline-black ${isMarked
                  ? "shadow-[inset_1px_1px_#000,inset_-1px_-1px_#fff,inset_2px_2px_#808080]"
                  : "cursor-pointer shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080]"
                  } ${inLine ? "bg-[#ffff80]" : isMarked ? "bg-[#dfdfdf]" : "bg-[#c0c0c0]"} ${free ? "font-bold" : ""}`}
              >
                <span className="relative z-10">{text}</span>
                {isMarked && (
                  // Dauber stamp: a translucent red dot over the text.
                  <span
                    aria-hidden
                    className="absolute top-1/2 left-1/2 size-[70%] max-h-12 max-w-12 -translate-1/2 rounded-full bg-[#ff0000]/35"
                  />
                )}
              </button>
            );
          })}
        </div>

        {dialog && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25">
            <Frame
              role={dialog === "bingo" ? "alertdialog" : "dialog"}
              aria-label={dialog === "bingo" ? "Bingo!" : "Use a friend's card"}
              boxShadow="$out"
              bgColor="$material"
              className="flex max-w-72 flex-col items-center gap-3 p-4 text-center"
            >
              {dialog === "bingo" ? (
                <>
                  <p className="text-2xl font-bold">{blackout ? "BLACKOUT!" : "BINGO!"}</p>
                  <p>
                    {blackout
                      ? "Every square!"
                      : `${lines.length} line${lines.length > 1 ? "s" : ""}. Wow!`}
                  </p>
                  <div className="flex gap-2">
                    <Button autoFocus onClick={() => setDialog(null)}>
                      Keep playing
                    </Button>
                    <Button onClick={() => newCard()}>New card</Button>
                  </div>
                </>
              ) : (
                <form
                  className="flex flex-col items-center gap-3"
                  onSubmit={(event) => {
                    event.preventDefault();
                    applyFriendsCode();
                  }}
                >
                  <label htmlFor="bingo-code">Enter your friend&apos;s card code:</label>
                  <Input
                    ref={codeInputRef}
                    id="bingo-code"
                    value={codeInput}
                    maxLength={8}
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    aria-invalid={codeError}
                    aria-describedby={codeError ? "bingo-code-error" : undefined}
                    onChange={(event) => {
                      setCodeInput(event.target.value);
                      setCodeError(false);
                    }}
                    className="w-32 text-center font-bold tracking-widest uppercase"
                  />
                  {codeError && (
                    <p id="bingo-code-error" className="text-[#800000]">
                      Codes are 5 letters and numbers, like K7QX2.
                    </p>
                  )}
                  <div className="flex gap-2">
                    <Button type="submit">OK</Button>
                    <Button type="button" onClick={() => setDialog(null)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              )}
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow title={status}>
          {status}
        </StatusBarField>
        <StatusBarField width={90}>Card: {code}</StatusBarField>
      </StatusBar>
    </div>
  );
}
