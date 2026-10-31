"use client";

import { Suspense } from "react";
import { Modal, TitleBar } from "@react95/core";

import type { ProgramDefinition } from "@/programs/types";

import { ProgramLoading } from "./program-loading";

type ProgramWindowProps = {
  program: ProgramDefinition;
  /** Position in the open-window stack, used to cascade new windows. */
  index: number;
  onClose: (id: string) => void;
};

const CASCADE_OFFSET = 24;

/**
 * Modal drags via @neodrag/react with the title bar (`.draggable`) as handle.
 * Title bar buttons sometimes needed two clicks, for three reasons:
 *
 * 0. The button icons are <img>s, which start a native HTML drag when the
 *    mouse moves while pressed, so no click fires. Fixed in globals.css.
 * 1. The buttons live inside the handle, so a few pixels of movement while
 *    clicking starts a drag. `cancel` excludes them from dragging.
 * 2. After every drag, neodrag arms a one-shot capture listener on `window`
 *    that swallows the next click. If the browser never fires a click for
 *    that release (e.g. pointer released over another element), the listener
 *    stays armed and eats the user's next click. Dispatching a synthetic
 *    click right after drag end consumes it instead. React doesn't listen on
 *    `window`, so the synthetic event has no other effect.
 */
const DRAG_CANCEL = ".draggable button";

function disarmNeodragClickBlocker() {
  setTimeout(() => window.dispatchEvent(new MouseEvent("click")), 0);
}

export function ProgramWindow({ program, index, onClose }: ProgramWindowProps) {
  const Program = program.component;
  const offset = 40 + (index % 8) * CASCADE_OFFSET;

  return (
    <Modal
      id={program.id}
      title={program.title}
      icon={program.icon.small}
      dragOptions={{
        defaultPosition: { x: offset + 40, y: offset - 40 },
        bounds: "parent",
        cancel: DRAG_CANCEL,
        onDragEnd: disarmNeodragClickBlocker,
      }}
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={() => onClose(program.id)} />,
      ]}
    >
      <Modal.Content
        style={{ width: program.window.width, height: program.window.height }}
      >
        {/*
          Programs are lazy-loaded. Without a boundary here, a loading program
          suspends up to the desktop-level boundary, hiding the whole desktop
          (flicker) and tearing down the TaskBar's listeners so it misses the
          window's "add" event (window missing from the taskbar).
        */}
        <Suspense fallback={<ProgramLoading title={program.title} />}>
          <Program />
        </Suspense>
      </Modal.Content>
    </Modal>
  );
}
