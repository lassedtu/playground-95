"use client";

import type { ReactElement } from "react";
import { List } from "@react95/core";
import { FolderExe2 } from "@react95/icons/FolderExe2";
import { Joy102 } from "@react95/icons/Joy102";
import { Notepad } from "@react95/icons/Notepad";

import { programs } from "@/programs/registry";
import type { ProgramDefinition } from "@/programs/types";

type StartMenuProps = {
  onOpen: (id: string) => void;
  onBossKey: () => void;
};

const inCategory = (category: ProgramDefinition["category"]) => programs.filter((p) => p.category === category);

const FOLDERS: { label: string; icon: ReactElement; programs: ProgramDefinition[] }[] = [
  { label: "Programs", icon: <FolderExe2 variant="32x32_4" />, programs: inCategory("programs") },
  { label: "Games", icon: <Joy102 variant="32x32_4" />, programs: inCategory("games") },
];

export function StartMenu({ onOpen, onBossKey }: StartMenuProps) {
  return (
    <List width="200px">
      {FOLDERS.map((folder) => (
        <List.Item key={folder.label} icon={folder.icon}>
          {folder.label}
          {/* Grow upwards from the item, like Windows does next to the taskbar. */}
          <List width="200px" className="top-auto -bottom-0.5">
            {folder.programs.map((program) => (
              <List.Item key={program.id} icon={program.icon.small} onClick={() => onOpen(program.id)}>
                {program.title}
              </List.Item>
            ))}
          </List>
        </List.Item>
      ))}
      {inCategory("settings").map((program) => (
        <List.Item key={program.id} icon={program.icon.large} onClick={() => onOpen(program.id)}>
          {program.title}
        </List.Item>
      ))}
      <List.Divider />
      <List.Item icon={<Notepad variant="32x32_4" />} onClick={onBossKey}>
        Boss Key (Esc Esc)
      </List.Item>
    </List>
  );
}
