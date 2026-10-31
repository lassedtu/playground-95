"use client";

import { List } from "@react95/core";
import { FolderExe2 } from "@react95/icons";

import { programs } from "@/programs/registry";

type StartMenuProps = {
  onOpen: (id: string) => void;
};

const listed = programs.filter((p) => (p.placement ?? "programs") === "programs");
const settings = programs.filter((p) => p.placement === "settings");

export function StartMenu({ onOpen }: StartMenuProps) {
  return (
    <List width="200px">
      <List.Item icon={<FolderExe2 variant="32x32_4" />}>
        Programs
        {/* Grow upwards from the item, like Windows does next to the taskbar. */}
        <List width="200px" className="top-auto -bottom-0.5">
          {listed.map((program) => (
            <List.Item key={program.id} icon={program.icon.small} onClick={() => onOpen(program.id)}>
              {program.title}
            </List.Item>
          ))}
        </List>
      </List.Item>
      {settings.map((program) => (
        <List.Item key={program.id} icon={program.icon.large} onClick={() => onOpen(program.id)}>
          {program.title}
        </List.Item>
      ))}
    </List>
  );
}
