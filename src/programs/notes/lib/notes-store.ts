import { useSyncExternalStore } from "react";

/**
 * Notes saved in the browser (localStorage). Kept apart from the UI so other
 * parts of the site (e.g. the boss key) can read and edit them.
 */
export type Note = {
  id: string;
  text: string;
  created: number;
  updated: number;
};

export type NotesState = {
  notes: Note[];
  selectedId: string | null;
  wordWrap: boolean;
};

const STORAGE_KEY = "playground95.notes";

const WELCOME = `Welcome to Notes!

Everything you type is saved automatically, in the browser.
The first line of a note is its title.

Tip: press F5 to stamp the time and date, like the real Notepad.`;

export function createNote(text = ""): Note {
  const now = Date.now();
  return { id: `${now.toString(36)}-${Math.random().toString(36).slice(2, 7)}`, text, created: now, updated: now };
}

export function loadNotes(): NotesState {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<NotesState> | null;
    if (saved && Array.isArray(saved.notes) && saved.notes.length) {
      return { selectedId: saved.selectedId ?? null, notes: saved.notes, wordWrap: saved.wordWrap ?? true };
    }
  } catch {
    // start fresh
  }
  const welcome = createNote(WELCOME);
  return { notes: [welcome], selectedId: welcome.id, wordWrap: true };
}

/** Saves the notes. Returns false if the browser refused (e.g. storage full). */
export function saveNotes(state: NotesState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** The first non-empty line, shortened. */
export function noteTitle(note: Note): string {
  const line = note.text.split("\n").find((l) => l.trim())?.trim() ?? "";
  if (!line) return "Untitled";
  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}

/** Newest first. */
export const byUpdated = (a: Note, b: Note) => b.updated - a.updated;

// Shared store: Notes and the boss screen edit the same notes live.

let cache: NotesState | null = null;
const listeners = new Set<() => void>();
const EMPTY: NotesState = { notes: [], selectedId: null, wordWrap: true };

function snapshot(): NotesState {
  cache ??= loadNotes();
  return cache;
}

/** Replaces the notes, tells everyone using them, and saves. Returns false if saving failed. */
export function setNotesState(next: NotesState): boolean {
  cache = next;
  listeners.forEach((listener) => listener());
  return saveNotes(next);
}

export function useNotesState(): NotesState {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    snapshot,
    () => EMPTY,
  );
}

/** Updates one note's text. */
export function editNote(id: string, text: string): boolean {
  const state = snapshot();
  return setNotesState({
    ...state,
    notes: state.notes.map((n) => (n.id === id ? { ...n, text, updated: Date.now() } : n)),
  });
}

/**
 * Today's "Lecture notes" note (used by the boss key), created on first use.
 * Returns its id.
 */
export function todaysLectureNote(date = new Date()): string {
  const heading = `Lecture notes - ${date.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" })}`;
  const state = snapshot();
  const existing = state.notes.find((n) => n.text.split("\n", 1)[0] === heading);
  if (existing) return existing.id;
  const note = createNote(`${heading}\n\n`);
  setNotesState({ ...state, notes: [...state.notes, note] });
  return note.id;
}
