"use client";

import type { PointerEvent, ReactNode } from "react";

const BEVEL =
  "shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080,inset_2px_2px_#dfdfdf] active:shadow-[inset_1px_1px_#000,inset_-1px_-1px_#fff,inset_2px_2px_#808080]";

/**
 * A button that holds a key while it's pressed. It doesn't take focus (the
 * view keeps it, so the keyboard keeps working) and releases when the
 * finger slides off or the touch is cancelled.
 */
function HoldButton({ code, label, press, children, wide }: {
  code: string;
  label: string;
  press: (code: string, down: boolean) => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const release = () => press(code, false);
  return (
    <button
      type="button"
      tabIndex={-1}
      aria-label={label}
      onPointerDown={(event: PointerEvent<HTMLButtonElement>) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        press(code, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(event) => event.preventDefault()}
      className={`flex h-12 cursor-default items-center justify-center border-0 bg-[#c0c0c0]/90 p-0 text-sm font-bold select-none [-webkit-touch-callout:none] ${wide ? "w-16" : "w-12"} ${BEVEL}`}
    >
      {children}
    </button>
  );
}

/** On-screen controls for touch screens: steering on the left, pedals and drift on the right. */
export function TouchControls({ press }: { press: (code: string, down: boolean) => void }) {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex touch-none items-end justify-between p-2">
      <div className="pointer-events-auto flex gap-2">
        <HoldButton code="ArrowLeft" label="Steer left" press={press}>
          ◄
        </HoldButton>
        <HoldButton code="ArrowRight" label="Steer right" press={press}>
          ►
        </HoldButton>
      </div>
      <div className="pointer-events-auto flex items-end gap-2">
        <HoldButton code="Space" label="Drift" press={press} wide>
          Drift
        </HoldButton>
        <HoldButton code="ArrowDown" label="Brake" press={press} wide>
          Brake
        </HoldButton>
        <HoldButton code="ArrowUp" label="Gas" press={press} wide>
          Gas
        </HoldButton>
      </div>
    </div>
  );
}
