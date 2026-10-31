"use client";

import Image from "next/image";

import cameraOpen from "./assets/camera-open.webp";
import { MirrorPreview } from "./components/mirror-preview";
import { MIRROR } from "./data/camera-layout";
import { type CameraStatus, useCameraStream } from "./lib/use-camera-stream";
import { useElementVisible } from "./lib/use-element-visible";

const STATUS_MESSAGES: Partial<Record<CameraStatus, string>> = {
  denied: "Camera access was blocked. Allow it in your browser to see the mirror preview.",
  unavailable: "No camera found.",
  busy: "The camera is being used by another app.",
  error: "The camera couldn't be started.",
};

export function PolaroidCamera() {
  // Only hold the camera while the window is actually visible (not minimized).
  const [containerRef, visible] = useElementVisible<HTMLDivElement>();
  const { status, stream } = useCameraStream(visible);
  const message = STATUS_MESSAGES[status];

  return (
    <div className="flex size-full items-center justify-center">
      <div
        ref={containerRef}
        className="relative aspect-[1200/1201] h-full max-w-full"
      >
        <Image
          src={cameraOpen}
          alt="Instax Mini 12 instant camera"
          sizes="440px"
          loading="eager"
          draggable={false}
          className="size-full select-none"
        />
        <MirrorPreview region={MIRROR} stream={stream} />
      </div>
      <p role="status" className="sr-only">
        {message}
      </p>
    </div>
  );
}
