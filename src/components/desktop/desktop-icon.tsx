"use client";

import type { ProgramDefinition } from "@/programs/types";

type DesktopIconProps = {
  program: ProgramDefinition;
  onOpen: (id: string) => void;
};

/** Win95-style desktop shortcut: double-click (or Enter/Space) to open. */
export function DesktopIcon({ program, onOpen }: DesktopIconProps) {
  return (
    <button
      type="button"
      onDoubleClick={() => onOpen(program.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen(program.id);
        }
      }}
      className="group flex w-20 flex-col items-center gap-1 border-0 bg-transparent p-1 text-white outline-none"
    >
      <span className="group-focus:opacity-70">{program.icon.large}</span>
      <span className="px-0.5 text-center leading-tight group-focus:bg-[#000080] group-focus:outline group-focus:outline-dotted group-focus:outline-white">
        {program.title}
      </span>
    </button>
  );
}
