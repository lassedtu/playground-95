"use client";

import { List } from "@react95/core";
import { FolderExe2 } from "@react95/icons";

import { programs } from "@/programs/registry";

type StartMenuProps = {
  onOpen: (id: string) => void;
};

export function StartMenu({ onOpen }: StartMenuProps) {
  return (
    <List width="200px">
      <List.Item icon={<FolderExe2 variant="32x32_4" />}>
        Programs
        <List width="200px">
          {programs.map((program) => (
            <List.Item
              key={program.id}
              icon={program.icon.small}
              onClick={() => onOpen(program.id)}
            >
              {program.title}
            </List.Item>
          ))}
        </List>
      </List.Item>
    </List>
  );
}
