"use client";

import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { Button, Frame } from "@react95/core";

import { useDesktop } from "@/components/desktop/desktop-context";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { downloadUrl } from "@/lib/download";
import { hasShortcutModifier, isApplePlatform } from "@/lib/platform";

import {
  byUpdated,
  createNote,
  type Note,
  noteTitle,
  type NotesState,
  setNotesState,
  useNotesState,
} from "./lib/notes-store";

/** Must match the id in programs/registry.tsx (used by File → Exit). */
const PROGRAM_ID = "notes";
const APPLE = isApplePlatform();

/** Notepad's F5 stamp: "14:05 31/10/2026", in the user's own format. */
const timeAndDate = (date = new Date()) =>
  `${date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })} ${date.toLocaleDateString()}`;

function position(text: string, offset: number) {
  const before = text.slice(0, offset).split("\n");
  return { line: before.length, column: before[before.length - 1].length + 1 };
}

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

function shortDate(time: number) {
  const date = new Date(time);
  const today = new Date().toDateString() === date.toDateString();
  return today
    ? date.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : date.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function Notes() {
  const { closeWindow } = useDesktop();
  const state = useNotesState();
  const [caret, setCaret] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [message, setMessage] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  /** Caret to restore after a programmatic edit (e.g. F5). */
  const pendingCaret = useRef<number | null>(null);

  const notes = [...state.notes].sort(byUpdated);
  const note = state.notes.find((n) => n.id === state.selectedId) ?? notes[0];

  useEffect(() => {
    const at = pendingCaret.current;
    if (at === null || !editorRef.current) return;
    pendingCaret.current = null;
    editorRef.current.setSelectionRange(at, at);
  });

  function update(next: NotesState) {
    setMessage(setNotesState(next) ? "" : "Couldn't save: the browser's storage is full.");
  }

  function edit(text: string) {
    update({
      ...state,
      notes: state.notes.map((n) => (n.id === note.id ? { ...n, text, updated: Date.now() } : n)),
    });
  }

  function select(id: string) {
    update({ ...state, selectedId: id });
    setCaret(0);
  }

  function newNote() {
    const fresh = createNote();
    update({ ...state, notes: [...state.notes, fresh], selectedId: fresh.id });
    setCaret(0);
    requestAnimationFrame(() => editorRef.current?.focus());
  }

  function deleteNote() {
    const remaining = state.notes.filter((n) => n.id !== note.id);
    const notesLeft = remaining.length ? remaining : [createNote()];
    update({ ...state, notes: notesLeft, selectedId: [...notesLeft].sort(byUpdated)[0].id });
    setConfirmDelete(false);
    setMessage("Note deleted.");
  }

  /** Replaces the selection in the editor with `text`, like typing it. */
  function insert(text: string) {
    const editor = editorRef.current;
    const start = editor?.selectionStart ?? note.text.length;
    const end = editor?.selectionEnd ?? note.text.length;
    edit(note.text.slice(0, start) + text + note.text.slice(end));
    pendingCaret.current = start + text.length;
    setCaret(start + text.length);
    editor?.focus();
  }

  function saveAsText(target: Note) {
    const blob = new Blob([target.text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const name = noteTitle(target).replace(/[\\/:*?"<>|…]/g, "").slice(0, 40).trim() || "note";
    downloadUrl(url, `${name}.txt`);
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "F5") {
      event.preventDefault();
      insert(timeAndDate());
    } else if (hasShortcutModifier(event, APPLE) && event.key.toLowerCase() === "s") {
      // There's nothing to save by hand, but don't let the browser save the page.
      event.preventDefault();
      setMessage("Notes save automatically.");
    } else if (event.key === "Escape" && confirmDelete) {
      setConfirmDelete(false);
    }
  }

  const menus: Menu[] = [
    {
      label: "File",
      entries: [
        { label: "New Note", onSelect: newNote },
        { label: "Delete Note…", onSelect: () => setConfirmDelete(true) },
        "divider",
        { label: "Save as Text File…", onSelect: () => saveAsText(note) },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(PROGRAM_ID) },
      ],
    },
    {
      label: "Edit",
      entries: [
        {
          label: "Select All",
          shortcut: APPLE ? "⌘A" : "Ctrl+A",
          onSelect: () => {
            editorRef.current?.focus();
            editorRef.current?.select();
          },
        },
        { label: "Time/Date", shortcut: "F5", onSelect: () => insert(timeAndDate()) },
      ],
    },
    {
      label: "Format",
      entries: [{ label: "Word Wrap", checked: state.wordWrap, onSelect: () => update({ ...state, wordWrap: !state.wordWrap }) }],
    },
  ];

  const { line, column } = position(note.text, caret);
  const trackCaret = () => setCaret(editorRef.current?.selectionStart ?? 0);

  return (
    <div className="flex size-full flex-col" onKeyDown={onKeyDown}>
      <MenuBar menus={menus} />

      <div className="relative mt-0.5 flex min-h-0 flex-1 gap-1">
        {/* Note list */}
        <div className="flex w-36 shrink-0 flex-col gap-1">
          <Button onClick={newNote}>New Note</Button>
          <Frame
            role="listbox"
            aria-label="Notes"
            boxShadow="$in"
            bgColor="$inputBackground"
            className="min-h-0 flex-1 overflow-y-auto p-0.5"
            onKeyDown={(event: KeyboardEvent) => {
              // Up/down moves through the list, like a Win95 list box.
              if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
              event.preventDefault();
              const index = notes.findIndex((n) => n.id === note.id);
              const next = notes[Math.max(0, Math.min(notes.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)))];
              select(next.id);
              (event.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-id="${next.id}"]`)?.focus();
            }}
          >
            {notes.map((n) => {
              const selected = n.id === note.id;
              return (
                <div
                  key={n.id}
                  data-id={n.id}
                  role="option"
                  aria-selected={selected}
                  tabIndex={selected ? 0 : -1}
                  onClick={() => select(n.id)}
                  className={`cursor-default px-1 py-0.5 outline-none focus-visible:outline-1 focus-visible:-outline-offset-1 focus-visible:outline-dotted focus-visible:outline-current ${
                    selected ? "bg-win-navy text-white" : ""
                  }`}
                >
                  <div className="truncate">{noteTitle(n)}</div>
                  <div className={`text-[10px] ${selected ? "text-white/80" : "text-[#808080]"}`}>{shortDate(n.updated)}</div>
                </div>
              );
            })}
          </Frame>
        </div>

        {/* Editor */}
        <Frame boxShadow="$in" bgColor="$inputBackground" className="flex min-h-0 min-w-0 flex-1">
          <textarea
            ref={editorRef}
            aria-label={`Note: ${noteTitle(note)}`}
            value={note.text}
            onChange={(event) => {
              edit(event.target.value);
              setCaret(event.target.selectionStart);
            }}
            onSelect={trackCaret}
            onKeyUp={trackCaret}
            onClick={trackCaret}
            spellCheck
            wrap={state.wordWrap ? "soft" : "off"}
            className={`min-h-0 flex-1 resize-none border-0 bg-transparent p-1 font-mono text-[13px] leading-snug text-black outline-none ${
              state.wordWrap ? "whitespace-pre-wrap" : "overflow-x-auto whitespace-pre"
            }`}
          />
        </Frame>

        {confirmDelete && (
          <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/25">
            <Frame
              role="alertdialog"
              aria-labelledby="notes-delete-text"
              boxShadow="$out"
              bgColor="$material"
              className="flex max-w-72 flex-col items-center gap-3 p-4 text-center"
            >
              <p id="notes-delete-text">
                Are you sure you want to delete &ldquo;{noteTitle(note)}&rdquo;? This can&apos;t be undone.
              </p>
              <div className="flex gap-2">
                <Button onClick={deleteNote}>Delete</Button>
                <Button autoFocus onClick={() => setConfirmDelete(false)}>
                  Cancel
                </Button>
              </div>
            </Frame>
          </div>
        )}
      </div>

      <StatusBar>
        <StatusBarField grow title={message}>
          {message || `${state.notes.length} note${state.notes.length === 1 ? "" : "s"} · saved automatically`}
        </StatusBarField>
        <StatusBarField width={100}>
          Ln {line}, Col {column}
        </StatusBarField>
        <StatusBarField width={80}>{wordCount(note.text)} words</StatusBarField>
      </StatusBar>
    </div>
  );
}
