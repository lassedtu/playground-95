"use client";

import dynamic from "next/dynamic";

import { BootScreen } from "@/components/boot-screen";

/**
 * The desktop is rendered client-only: React95's Modal generates random ids
 * and the TaskBar clock reads the current time on render, both of which
 * would cause hydration mismatches if server-rendered. The boot screen is
 * server-rendered and shown until the desktop's code has loaded.
 */
export const DesktopLoader = dynamic(
  () => import("./desktop").then((mod) => mod.Desktop),
  { ssr: false, loading: () => <BootScreen /> },
);
