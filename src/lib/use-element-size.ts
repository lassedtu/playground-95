"use client";

import { useEffect, useState } from "react";

export type ElementSize = { width: number; height: number };

/**
 * Tracks an element's content-box size. Returns a callback ref to attach to
 * the element, and its size (0×0 until measured).
 */
export function useElementSize<T extends Element>() {
  const [element, setElement] = useState<T | null>(null);
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

  useEffect(() => {
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, size] as const;
}
