"use client";

import { Suspense } from "react";
import { Modal, TitleBar } from "@react95/core";

import { useViewportSize, type ViewportSize } from "@/lib/use-viewport-size";

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
/** Window frame + title bar around the content, measured from React95's Modal. */
export const WINDOW_CHROME = { width: 5, height: 30 };
export const TASKBAR_HEIGHT = 28;
/** Space kept between a window and the screen edges. */
const SCREEN_MARGIN = 4;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Shrinks a window's content size to fit the screen (above the taskbar), so
 * windows work on phones. Programs lay out with flexbox/measurement and adapt.
 */
function fitToViewport(size: WindowSpec["size"], viewport: ViewportSize) {
  return {
    width: Math.min(size.width, viewport.width - WINDOW_CHROME.width - SCREEN_MARGIN * 2),
    height: Math.min(
      size.height,
      viewport.height - TASKBAR_HEIGHT - WINDOW_CHROME.height - SCREEN_MARGIN * 2,
    ),
  };
}

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
  const viewport = useViewportSize();
  const size = fitToViewport(spec.size, viewport);

  // Initial position: cascading, or where the program asked for it, then
  // kept fully on screen (only used when the window first opens).
  const cascade = 40 + (index % 8) * CASCADE_OFFSET;
  const wanted = spec.position ?? { x: cascade + 40, y: cascade + MODAL_BASE_TOP - 40 };
  const outer = { width: size.width + WINDOW_CHROME.width, height: size.height + WINDOW_CHROME.height };
  const defaultPosition = {
    x: clamp(wanted.x, SCREEN_MARGIN, viewport.width - outer.width - SCREEN_MARGIN),
    y:
      clamp(wanted.y, SCREEN_MARGIN, viewport.height - TASKBAR_HEIGHT - outer.height - SCREEN_MARGIN) -
      MODAL_BASE_TOP,
  };

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
      {/* overflow: auto is a fallback for content that can't shrink further. */}
      <Modal.Content style={{ width: size.width, height: size.height, overflow: "auto" }}>
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
