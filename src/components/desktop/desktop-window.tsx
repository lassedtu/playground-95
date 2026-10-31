"use client";

import { Suspense } from "react";
import { Modal, TitleBar } from "@react95/core";

import type { WindowSpec } from "./desktop-context";
import { ProgramLoading } from "./program-loading";

type DesktopWindowProps = {
  spec: WindowSpec;
  /** Position in the open-window stack, used to cascade new windows. */
  index: number;
  onClose: (id: string) => void;
};

const CASCADE_OFFSET = 24;
/** React95's Modal is `position: fixed; top: 50px` before the drag offset is applied. */
const MODAL_BASE_TOP = 50;

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

export function DesktopWindow({ spec, index, onClose }: DesktopWindowProps) {
  const cascade = 40 + (index % 8) * CASCADE_OFFSET;
  const defaultPosition = spec.position
    ? { x: spec.position.x, y: spec.position.y - MODAL_BASE_TOP }
    : { x: cascade + 40, y: cascade - 40 };

  return (
    <Modal
      id={spec.id}
      title={spec.title}
      icon={spec.icon}
      dragOptions={{
        defaultPosition,
        bounds: "parent",
        cancel: DRAG_CANCEL,
        onDragEnd: disarmNeodragClickBlocker,
      }}
      titleBarOptions={[
        <Modal.Minimize key="minimize" />,
        <TitleBar.Close key="close" onClick={() => onClose(spec.id)} />,
      ]}
    >
      <Modal.Content style={{ width: spec.size.width, height: spec.size.height }}>
        {/*
          Programs are lazy-loaded. Without a boundary here, a loading program
          suspends up to the desktop-level boundary, hiding the whole desktop
          (flicker) and tearing down the TaskBar's listeners so it misses the
          window's "add" event (window missing from the taskbar).
        */}
        <Suspense fallback={<ProgramLoading title={spec.title} />}>
          {spec.content}
        </Suspense>
      </Modal.Content>
    </Modal>
  );
}
