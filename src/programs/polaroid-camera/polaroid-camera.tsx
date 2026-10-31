"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Wangimg128 } from "@react95/icons";

import { useDesktop } from "@/components/desktop/desktop-context";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";

import cameraOpen from "./assets/camera-open.webp";
import { MirrorPreview } from "./components/mirror-preview";
import { PHOTO_WINDOW_SIZE, PhotoPrint } from "./components/photo-print";
import { ShutterButton } from "./components/shutter-button";
import { MIRROR, SHUTTER } from "./data/camera-layout";
import { flashScreen } from "./lib/flash-screen";
import { captureFrame, developPrint } from "./lib/photo/develop-print";
import { STANDARD_FILM } from "./lib/photo/films";
import { loadPrintFrame } from "./lib/photo/print-frame";
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

const pad = (n: number) => String(n).padStart(2, "0");

/** Window frame + title bar around the content, measured from React95's Modal. */
const WINDOW_CHROME = { width: 5, height: 30 };
const TASKBAR_HEIGHT = 28;
const PHOTO_GAP = 12;
/** Each new photo is offset a little more, so prints fan out like a stack. */
const PHOTO_FAN_OFFSET = 20;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Opens photos beside the camera window (right, else left) so they don't
 * cover the shutter, kept within the viewport.
 */
function photoWindowPosition(cameraWindow: Element | null, photoIndex: number) {
  if (!cameraWindow) return undefined;
  const camera = cameraWindow.getBoundingClientRect();
  const width = PHOTO_WINDOW_SIZE.width + WINDOW_CHROME.width;
  const height = PHOTO_WINDOW_SIZE.height + WINDOW_CHROME.height;
  const fan = (photoIndex % 6) * PHOTO_FAN_OFFSET;

  let x = camera.right + PHOTO_GAP + fan;
  if (x + width > window.innerWidth) x = camera.left - PHOTO_GAP - width - fan;
  return {
    x: clamp(x, 0, window.innerWidth - width),
    y: clamp(camera.top + fan, 0, window.innerHeight - TASKBAR_HEIGHT - height),
  };
}

function photoNames(date: Date) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return {
    title: `Photo ${time}`,
    filename: `polaroid-${day}-${time.replaceAll(":", "")}.png`,
    alt: `Instant photo taken at ${time}`,
  };
}

export function PolaroidCamera() {
  const { openWindow } = useDesktop();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Only hold the camera while the window is actually visible (not minimized).
  const [containerRef, visible] = useElementVisible<HTMLDivElement>();
  const { status, stream } = useCameraStream(visible);

  const [developing, setDeveloping] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const photosTaken = useRef(0);

  // Preload the print frame so the first photo isn't delayed by it.
  useEffect(() => {
    loadPrintFrame().catch(() => {}); // a failure resurfaces when shooting
  }, []);

  async function shoot() {
    const video = videoRef.current;
    if (!video || status !== "live" || developing) return;

    setDeveloping(true);
    setPhotoError(false);
    try {
      // Capture first: once the flash is on screen its light reaches the
      // webcam and would wash out the picture.
      const takenAt = new Date();
      const picture = captureFrame(video);
      const flash = flashScreen();

      // Develop during the flash; the photo appears once it has faded.
      const [blob] = await Promise.all([
        developPrint(picture, STANDARD_FILM),
        flash.done,
      ]);
      const url = URL.createObjectURL(blob);
      const { title, filename, alt } = photoNames(takenAt);
      openWindow({
        id: `photo-${takenAt.getTime()}`,
        title,
        icon: <Wangimg128 variant="16x16_4" />,
        size: PHOTO_WINDOW_SIZE,
        position: photoWindowPosition(
          video.closest('[role="dialog"]'),
          photosTaken.current++,
        ),
        content: <PhotoPrint url={url} filename={filename} alt={alt} />,
        // The photo only lives in memory: closing its window deletes it.
        onClose: () => URL.revokeObjectURL(url),
      });
    } catch (error) {
      console.error("Taking photo failed:", error);
      setPhotoError(true);
    } finally {
      setDeveloping(false);
    }
  }

  const message = photoError
    ? "Couldn't take the photo. Try again."
    : developing
      ? "Developing…"
      : STATUS_MESSAGES[status];

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
          <MirrorPreview region={MIRROR} stream={stream} videoRef={videoRef} />
          <ShutterButton
            region={SHUTTER}
            disabled={status !== "live" || developing}
            onPress={shoot}
          />
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
