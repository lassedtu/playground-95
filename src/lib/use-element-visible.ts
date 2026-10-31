"use client";

import { useEffect, useState } from "react";

/**
 * Tracks whether an element is rendered and on screen. A minimized window is
 * `display: none`, which IntersectionObserver reports as not intersecting.
 *
 * Returns a callback ref to attach to the element, and the visibility.
 */
export function useElementVisible<T extends Element>() {
  const [element, setElement] = useState<T | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) =>
      setVisible(entry.isIntersecting),
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [element]);

  return [setElement, visible] as const;
}
