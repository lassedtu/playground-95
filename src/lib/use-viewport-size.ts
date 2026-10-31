"use client";

import { useSyncExternalStore } from "react";

export type ViewportSize = { width: number; height: number };

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

// Snapshots must be stable between changes, so cache by value.
let cached: ViewportSize = { width: 0, height: 0 };
function getSnapshot(): ViewportSize {
  const { innerWidth: width, innerHeight: height } = window;
  if (cached.width !== width || cached.height !== height) cached = { width, height };
  return cached;
}

const SERVER_SIZE: ViewportSize = { width: 1024, height: 768 };

/** The browser viewport size, updated on resize and rotation. */
export function useViewportSize(): ViewportSize {
  return useSyncExternalStore(subscribe, getSnapshot, () => SERVER_SIZE);
}
