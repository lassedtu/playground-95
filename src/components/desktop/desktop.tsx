"use client";

import { useCallback, useState } from "react";
import { TaskBar } from "@react95/core";

import { programs } from "@/programs/registry";

import { DesktopIcon } from "./desktop-icon";
import { ProgramWindow } from "./program-window";
import { StartMenu } from "./start-menu";

export function Desktop() {
  // Ids of currently open programs, in the order they were opened.
  const [openIds, setOpenIds] = useState<string[]>([]);

  const open = useCallback((id: string) => {
    setOpenIds((ids) => (ids.includes(id) ? ids : [...ids, id]));
  }, []);

  const close = useCallback((id: string) => {
    setOpenIds((ids) => ids.filter((openId) => openId !== id));
  }, []);

  return (
    <main className="relative h-dvh w-full overflow-hidden">
      <ul className="flex h-[calc(100%-28px)] flex-col flex-wrap content-start gap-2 p-2">
        {programs.map((program) => (
          <li key={program.id}>
            <DesktopIcon program={program} onOpen={open} />
          </li>
        ))}
      </ul>

      {openIds.map((id, index) => {
        const program = programs.find((p) => p.id === id);
        if (!program) return null;
        return (
          <ProgramWindow
            key={id}
            program={program}
            index={index}
            onClose={close}
          />
        );
      })}

      <TaskBar list={<StartMenu onOpen={open} />} />
    </main>
  );
}
