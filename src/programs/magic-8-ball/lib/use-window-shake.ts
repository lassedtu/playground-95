"use client";

import { useEffect, useEffectEvent, useState } from "react";

/** A shake = this many direction changes within WINDOW_MS… */
const REVERSALS = 3;
/** …covering at least this much movement (px), so jitter doesn't count. */
const MIN_TRAVEL = 150;
const WINDOW_MS = 1000;
/** Ignore further shaking for a moment after one is detected. */
const COOLDOWN_MS = 1200;
/** Movements smaller than this (px) don't count as a direction. */
const DEAD_ZONE = 2;

type Sample = { time: number; distance: number };

/** Tracks direction changes along one axis. */
function axisTracker() {
  let direction = 0;
  let samples: Sample[] = [];
  let reversals: number[] = [];
  return {
    /** Feeds a movement; returns true when the movement completes a shake. */
    move(delta: number, now: number): boolean {
      if (Math.abs(delta) < DEAD_ZONE) return false;
      const sign = Math.sign(delta);
      samples = [...samples.filter((s) => now - s.time < WINDOW_MS), { time: now, distance: Math.abs(delta) }];
      if (direction !== 0 && sign !== direction) {
        reversals = [...reversals.filter((t) => now - t < WINDOW_MS), now];
      }
      direction = sign;
      const travel = samples.reduce((sum, s) => sum + s.distance, 0);
      return reversals.length >= REVERSALS && travel >= MIN_TRAVEL;
    },
    reset() {
      samples = [];
      reversals = [];
    },
  };
}

/**
 * Calls `onShake` when the window containing the element is dragged quickly
 * back and forth (horizontally or vertically). Watches the window's position,
 * which the window manager updates on every drag move.
 *
 * Returns a callback ref for an element inside the window.
 */
export function useWindowShake<T extends Element>(onShake: () => void) {
  const [element, setElement] = useState<T | null>(null);
  const shake = useEffectEvent(onShake);

  useEffect(() => {
    const windowElement = element?.closest('[role="dialog"]');
    if (!windowElement) return;

    const x = axisTracker();
    const y = axisTracker();
    let last = windowElement.getBoundingClientRect();
    let cooldownUntil = 0;

    // Dragging updates the window's inline `translate` style.
    const observer = new MutationObserver(() => {
      const rect = windowElement.getBoundingClientRect();
      const now = performance.now();
      const shaken = x.move(rect.x - last.x, now) || y.move(rect.y - last.y, now);
      last = rect;
      if (shaken && now >= cooldownUntil) {
        cooldownUntil = now + COOLDOWN_MS;
        x.reset();
        y.reset();
        shake();
      }
    });
    observer.observe(windowElement, { attributes: true, attributeFilter: ["style"] });
    return () => observer.disconnect();
  }, [element]);

  return setElement;
}
