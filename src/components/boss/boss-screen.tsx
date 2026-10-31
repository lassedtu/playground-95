"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import Image from "next/image";

import { editNote, useNotesState } from "@/programs/notes/lib/notes-store";

import flowchart from "./flowchart.png";

type BossScreenProps = {
  /** Today's lecture note: whatever you type after the notes is saved there. */
  noteId: string;
  onExit: () => void;
};

const MENU = ["File", "Edit", "View", "Insert", "Format", "Tools", "Help"];

/**
 * The boss key: a plain, modern-looking document editor covering the whole
 * site, with believable lecture notes and a real cursor blinking at the end.
 * Typing there continues the notes for real (saved in Notes).
 */
export function BossScreen({ noteId, onExit }: BossScreenProps) {
  const notes = useNotesState();
  const note = notes.notes.find((n) => n.id === noteId);
  const [heading = "", , ...rest] = (note?.text ?? "").split("\n");
  const body = rest.join("\n");
  const editorRef = useRef<HTMLTextAreaElement>(null);

  // Look the part in the browser tab too.
  useEffect(() => {
    const previous = document.title;
    document.title = heading || "Lecture notes";
    return () => {
      document.title = previous;
    };
  }, [heading]);

  // Cursor at the end, blinking, as if mid-sentence.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.focus();
    editor.setSelectionRange(editor.value.length, editor.value.length);
  }, []);

  // Grow with its text, like a document (no inner scrollbar).
  useLayoutEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.style.height = "auto";
    editor.style.height = `${editor.scrollHeight}px`;
  }, [body]);

  return (
    <div
      role="dialog"
      aria-label={heading || "Lecture notes"}
      className="fixed inset-0 z-[100000] flex flex-col bg-[#f1f3f4] font-[system-ui,-apple-system,'Segoe_UI',Roboto,Arial,sans-serif] text-[#202124]"
    >
      {/* Title bar */}
      <header className="flex shrink-0 items-center gap-3 bg-white px-3 pt-2">
        <button
          type="button"
          onClick={onExit}
          aria-label="Back to Playground 95 (or press Esc twice)"
          title="Press Esc twice to go back"
          className="flex size-9 shrink-0 cursor-default items-center justify-center rounded border-0 bg-transparent p-0"
        >
          {/* A generic document icon. Clicking it is the way back on touch screens. */}
          <svg viewBox="0 0 24 32" width="22" height="30" aria-hidden>
            <path fill="#4285f4" d="M2 0h14l8 8v22a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z" />
            <path fill="#a1c2fa" d="M16 0l8 8h-6a2 2 0 0 1-2-2z" />
            <path fill="#fff" d="M5 15h14v2H5zM5 19h14v2H5zM5 23h9v2H5z" />
          </svg>
        </button>
        <div className="min-w-0">
          <div className="truncate text-[17px] leading-6">{heading || "Lecture notes"}</div>
          <nav aria-hidden className="flex gap-3 text-[13px] text-[#444]">
            {MENU.map((item) => (
              <span key={item}>{item}</span>
            ))}
          </nav>
        </div>
        <span aria-hidden className="ml-auto hidden text-[12px] text-[#5f6368] sm:block">
          All changes saved
        </span>
      </header>

      {/* Toolbar (decoration) */}
      <div
        aria-hidden
        className="mx-3 my-2 flex shrink-0 items-center gap-4 overflow-hidden rounded-full bg-[#edf2fa] px-4 py-1.5 text-[13px] whitespace-nowrap text-[#444]"
      >
        <span>↶ ↷</span>
        <span>100%</span>
        <span className="border-l border-[#c7c7c7] pl-4">Normal text ▾</span>
        <span className="border-l border-[#c7c7c7] pl-4">Arial ▾</span>
        <span className="border-l border-[#c7c7c7] pl-4">11</span>
        <span className="border-l border-[#c7c7c7] pl-4 font-bold">B</span>
        <span className="italic">I</span>
        <span className="underline">U</span>
      </div>

      {/* The page */}
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-10 sm:px-6">
        <article className="mx-auto max-w-[816px] bg-white px-6 py-10 text-[15px] leading-[1.6] shadow-[0_1px_3px_rgba(60,64,67,0.3)] sm:px-[72px] sm:py-[60px]">
          <h1 className="mb-1 text-[26px] leading-tight font-normal">Understanding user needs</h1>
          <p className="mb-6 text-[13px] text-[#5f6368]">{heading.replace(/^Lecture notes – /, "")}</p>

          <p className="mb-4">
            User needs sit at different depths, and each depth demands a different way of surfacing it.{" "}
            <strong>Articulated</strong> needs are the ones users can put into words directly, so the way to
            access them is to listen. <strong>Observable</strong> needs show up as a mismatch between what
            people say and what they actually do, so the way to access them is to observe.{" "}
            <strong>Tacit</strong> and <strong>latent</strong> needs are the hardest: tacit is the &ldquo;I
            can&apos;t find the words, but I&apos;ll know it when I see it&rdquo; case, and latent is a need or
            feature the user didn&apos;t even know they had, until it&apos;s shown to them. Both are accessed
            primarily through empathy, reading the emotions and context around a need rather than a direct
            statement of it.
          </p>

          <Image
            src={flowchart}
            alt="Flowchart: articulated needs show up as words, accessed by listening. Observable needs show up as actions, accessed by observing. Tacit and latent needs show up as emotions, accessed by empathizing."
            sizes="672px"
            className="my-6 h-auto w-full"
          />

          <p className="mb-4">
            There are real communication gaps hiding in this picture: a gap between a need and how it happens
            to be exhibited by the user, and a further gap between what a user &ldquo;sends&rdquo; and what a
            developer actually &ldquo;gets&rdquo; from that signal. Both gaps grow wider the deeper the need
            sits.
          </p>

          <p className="mb-0">
            <strong>A worked example: the lunar greenhouse.</strong> A lunar greenhouse is used to study growing
            vegetables in space; it needs to stay warm enough for plants to grow, but not so warm that water is
            lost to evaporation. The user&apos;s <em>articulated</em> need was a phone app that notifies them if
            the temperature drifts out of range, since most trips to physically check the greenhouse turned out
            to be unnecessary, the temperature was almost always fine.
          </p>

          {/* Where your own notes continue: the real blinking cursor. */}
          <textarea
            ref={editorRef}
            aria-label="Your notes"
            value={body}
            rows={1}
            spellCheck
            onChange={(event) => note && editNote(note.id, `${heading}\n\n${event.target.value}`)}
            className="mt-4 block w-full resize-none overflow-hidden border-0 bg-transparent p-0 text-[15px] leading-[1.6] text-inherit caret-[#202124] outline-none"
          />
        </article>
      </div>

      {/* How to get back, shown briefly so it's gone before anyone looks over.
          Styled like a modern editor's "Saved" toast to keep the disguise. */}
      <div
        role="status"
        className="pointer-events-none fixed bottom-6 left-6 animate-boss-hint rounded bg-[#323232] px-4 py-3 text-[14px] text-white shadow-[0_2px_8px_rgba(0,0,0,0.3)] motion-reduce:animate-none"
      >
        Press <kbd className="font-sans font-bold">Esc</kbd> twice to go back (or click the doc icon).
      </div>
    </div>
  );
}
