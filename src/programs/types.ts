import type { ComponentType, ReactElement } from "react";

/**
 * A "program" is a self-contained interactive piece of the playground
 * (e.g. the polaroid camera). Each one is opened in its own window on the
 * desktop and listed in the Start menu.
 */
export type ProgramDefinition = {
  /** Stable, URL-safe identifier. */
  id: string;
  /** Shown in the window title bar, taskbar, desktop and Start menu. */
  title: string;
  icon: {
    /** 32x32 icon used on the desktop. */
    large: ReactElement;
    /** 16x16 icon used in title bar, taskbar and Start menu. */
    small: ReactElement;
  };
  /** Initial window content size in pixels. */
  window: {
    width: number;
    height: number;
  };
  /**
   * Where it's listed. "programs" (default): desktop icon and Start → Programs.
   * "settings": only as Start → Settings, like Win95's Control Panel items.
   */
  placement?: "programs" | "settings";
  /** The program's UI. Load it lazily so each program is its own chunk. */
  component: ComponentType;
};
