"use client";

import dynamic from "next/dynamic";

/**
 * The desktop is rendered client-only: React95's Modal generates random ids
 * and the TaskBar clock reads the current time on render, both of which
 * would cause hydration mismatches if server-rendered.
 */
export const DesktopLoader = dynamic(
  () => import("./desktop").then((mod) => mod.Desktop),
  { ssr: false },
);
