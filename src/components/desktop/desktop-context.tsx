"use client";

import { createContext, use } from "react";
import type { ReactElement, ReactNode } from "react";

export type WindowSpec = {
  /** Unique among open windows. Opening an id that's already open is a no-op. */
  id: string;
  title: string;
  /** 16×16 icon for the title bar and taskbar. */
  icon: ReactElement;
  /** Content size in pixels. */
  size: { width: number; height: number };
  /**
   * Where to open the window's top-left corner, in viewport pixels.
   * Defaults to cascading from the top-left.
   */
  position?: { x: number; y: number };
  content: ReactNode;
  /** Called once when the window is closed, e.g. to release resources. */
  onClose?: () => void;
};

export type DesktopApi = {
  openWindow: (spec: WindowSpec) => void;
  closeWindow: (id: string) => void;
  /** Opens a program from the registry by id. */
  openProgram: (programId: string) => void;
};

export const DesktopContext = createContext<DesktopApi | null>(null);

/** Window management for programs, e.g. to open additional windows. */
export function useDesktop(): DesktopApi {
  const desktop = use(DesktopContext);
  if (!desktop) throw new Error("useDesktop() must be used inside <Desktop>.");
  return desktop;
}
