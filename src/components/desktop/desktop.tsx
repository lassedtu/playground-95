"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { TaskBar } from "@react95/core";

import { BossScreen } from "@/components/boss/boss-screen";
import { initDisplaySettings } from "@/lib/display/display-settings";
import { todaysLectureNote } from "@/programs/notes/lib/notes-store";
import { programs } from "@/programs/registry";

import { type DesktopApi, DesktopContext, type WindowSpec } from "./desktop-context";
import { DesktopIcon } from "./desktop-icon";
import { DesktopWindow } from "./desktop-window";
import { StartMenu } from "./start-menu";

/** Two Esc presses within this many ms toggle the boss key. */
const DOUBLE_ESCAPE_MS = 500;

export function Desktop() {
  // Apply the saved theme and background as soon as the desktop starts.
  useEffect(() => initDisplaySettings(), []);

  // Boss key: Esc twice in a row (anywhere) toggles the fake lecture notes.
  const [bossNoteId, setBossNoteId] = useState<string | null>(null);
  const bossOpen = useRef(false);
  const toggleBoss = useCallback(() => {
    bossOpen.current = !bossOpen.current;
    // Looked up (or created) in the event, not during rendering: it writes to storage.
    setBossNoteId(bossOpen.current ? todaysLectureNote() : null);
  }, []);

  useEffect(() => {
    let lastEscape = 0;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.repeat) return;
      const now = performance.now();
      if (now - lastEscape < DOUBLE_ESCAPE_MS) {
        lastEscape = 0;
        toggleBoss();
      } else {
        lastEscape = now;
      }
    };
    // Capture: works even while a program (or the notes editor) has focus.
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [toggleBoss]);

  // Open windows, in the order they were opened.
  const [windows, setWindows] = useState<WindowSpec[]>([]);
  // Kept outside state so closing doesn't need a side effect in a state updater.
  const closeCallbacks = useRef(new Map<string, () => void>());

  const openWindow = useCallback((spec: WindowSpec) => {
    setWindows((open) => {
      if (open.some((w) => w.id === spec.id)) return open;
      return [...open, spec];
    });
    if (spec.onClose && !closeCallbacks.current.has(spec.id)) {
      closeCallbacks.current.set(spec.id, spec.onClose);
    }
  }, []);

  const closeWindow = useCallback((id: string) => {
    setWindows((open) => open.filter((w) => w.id !== id));
    const onClose = closeCallbacks.current.get(id);
    closeCallbacks.current.delete(id);
    onClose?.();
  }, []);

  const openProgram = useCallback(
    (programId: string) => {
      const program = programs.find((p) => p.id === programId);
      if (!program) return;
      const Program = program.component;
      openWindow({
        id: program.id,
        title: program.title,
        icon: program.icon.small,
        size: program.window,
        content: <Program />,
      });
    },
    [openWindow],
  );

  const api = useMemo<DesktopApi>(
    () => ({ openWindow, closeWindow, openProgram }),
    [openWindow, closeWindow, openProgram],
  );

  return (
    <DesktopContext value={api}>
      <main className="relative h-dvh w-full overflow-hidden">
        <ul className="flex h-[calc(100%-28px)] flex-col flex-wrap content-start gap-2 p-2">
          {programs
            .filter((program) => program.category !== "settings")
            .map((program) => (
              <li key={program.id}>
                <DesktopIcon program={program} onOpen={openProgram} />
              </li>
            ))}
        </ul>

        {windows.map((spec, index) => (
          <DesktopWindow
            key={spec.id}
            spec={spec}
            index={index}
            onClose={closeWindow}
          />
        ))}

        <TaskBar list={<StartMenu onOpen={openProgram} onBossKey={toggleBoss} />} />
      </main>
      {bossNoteId && <BossScreen noteId={bossNoteId} onExit={toggleBoss} />}
    </DesktopContext>
  );
}
