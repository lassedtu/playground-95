"use client";

import Image from "next/image";

import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import cameraOpen from "./assets/camera-open.webp";
import { MirrorPreview } from "./components/mirror-preview";
import { MIRROR } from "./data/camera-layout";
import { type CameraStatus, useCameraStream } from "./lib/use-camera-stream";
import { useElementVisible } from "./lib/use-element-visible";

const STATUS_MESSAGES: Record<CameraStatus, string> = {
  idle: "Camera off",
  starting: "Starting camera…",
  live: "Ready",
  denied: "Camera access blocked. Allow it in your browser settings.",
  unavailable: "No camera found.",
  busy: "Camera is in use by another app.",
  error: "Camera couldn't be started.",
};

export function PolaroidCamera() {
  // Only hold the camera while the window is actually visible (not minimized).
  const [containerRef, visible] = useElementVisible<HTMLDivElement>();
  const { status, stream } = useCameraStream(visible);
  const message = STATUS_MESSAGES[status];

  return (
    <div className="flex size-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div
          ref={containerRef}
          className="relative aspect-[1200/1201] h-full max-w-full"
        >
          <Image
            src={cameraOpen}
            alt="Instax Mini 12 instant camera"
            sizes="400px"
            loading="eager"
            draggable={false}
            className="size-full select-none"
          />
          <MirrorPreview region={MIRROR} stream={stream} />
        </div>
      </div>
      <StatusBar>
        <StatusBarField grow title={message}>
          {message}
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
