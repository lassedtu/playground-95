"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Wangimg128 } from "@react95/icons";

import { useDesktop } from "@/components/desktop/desktop-context";
import { TASKBAR_HEIGHT, WINDOW_CHROME } from "@/components/desktop/desktop-window";
import { type Menu, MenuBar } from "@/components/ui/menu-bar";
import { StatusBar, StatusBarField } from "@/components/ui/status-bar";
import { useElementVisible } from "@/lib/use-element-visible";

import cameraOpen from "./assets/camera-open.webp";
import { MirrorPreview } from "./components/mirror-preview";
import { PHOTO_WINDOW_SIZE, PhotoPrint } from "./components/photo-print";
import { ShutterButton } from "./components/shutter-button";
import { MIRROR, SHUTTER } from "./data/camera-layout";
import { flashScreen } from "./lib/flash-screen";
import { captureFrame, developPrint } from "./lib/photo/develop-print";
import { CLASSIC_FILM, FILMS, type Film } from "./lib/photo/films";
import { loadPrintFrame } from "./lib/photo/print-frame";
import { type CameraStatus, useCameraStream } from "./lib/use-camera-stream";

const STATUS_MESSAGES: Record<CameraStatus, string> = {
  idle: "Camera off",
  starting: "Starting camera…",
  live: "Ready",
  denied: "Camera access blocked. Allow it in your browser settings.",
  unavailable: "No camera found.",
  busy: "Camera is in use by another app.",
  error: "Camera couldn't be started.",
};

/** Must match the id in programs/registry.tsx (used by Camera -> Exit). */
const POLAROID_CAMERA_PROGRAM_ID = "polaroid-camera";

const pad = (n: number) => String(n).padStart(2, "0");

const WINDOW_GAP = 12;
/** Each new photo is offset a little more, so prints fan out like a stack. */
const PHOTO_FAN_OFFSET = 20;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Where to open a window of the given content size beside the camera window
 * (right, else left) so it doesn't cover the camera, kept within the viewport.
 * `offset` shifts it right and down, e.g. to fan out a stack of photos.
 */
function besideCamera(
  cameraWindow: Element | null,
  size: { width: number; height: number },
  offset = 0,
) {
  if (!cameraWindow) return undefined;
  const camera = cameraWindow.getBoundingClientRect();
  const width = size.width + WINDOW_CHROME.width;
  const height = size.height + WINDOW_CHROME.height;

  let x = camera.right + WINDOW_GAP + offset;
  if (x + width > window.innerWidth) x = camera.left - WINDOW_GAP - width - offset;
  return {
    x: clamp(x, 0, window.innerWidth - width),
    y: clamp(camera.top + offset, 0, window.innerHeight - TASKBAR_HEIGHT - height),
  };
}

function photoNames(date: Date, film: Film) {
  const day = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const time = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
  return {
    title: `Photo ${time}`,
    filename: `polaroid-${day}-${time.replaceAll(":", "")}-${film.id}.png`,
    alt: `Instant photo with the ${film.name} filter, taken at ${time}`,
  };
}

export function PolaroidCamera() {
  const { openWindow, closeWindow } = useDesktop();
  const videoRef = useRef<HTMLVideoElement>(null);
  // Only hold the camera while the window is actually visible (not minimized).
  const [containerRef, visible] = useElementVisible<HTMLDivElement>();
  const { status, stream } = useCameraStream(visible);

  const [developing, setDeveloping] = useState(false);
  const [photoError, setPhotoError] = useState(false);
  const photosTaken = useRef(0);

  const [film, setFilm] = useState<Film>(CLASSIC_FILM);

  // Preload the print frame so the first photo isn't delayed by it.
  useEffect(() => {
    loadPrintFrame().catch(() => { }); // a failure resurfaces when shooting
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
      const [blob] = await Promise.all([developPrint(picture, film), flash.done]);
      const url = URL.createObjectURL(blob);
      const { title, filename, alt } = photoNames(takenAt, film);
      openWindow({
        id: `photo-${takenAt.getTime()}`,
        title,
        icon: <Wangimg128 variant="16x16_4" />,
        size: PHOTO_WINDOW_SIZE,
        position: besideCamera(
          video.closest('[role="dialog"]'),
          PHOTO_WINDOW_SIZE,
          (photosTaken.current++ % 6) * PHOTO_FAN_OFFSET,
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

  const canShoot = status === "live" && !developing;

  const menus: Menu[] = [
    {
      label: "Camera",
      entries: [
        { label: "Take Photo", disabled: !canShoot, onSelect: () => void shoot() },
        "divider",
        { label: "Exit", onSelect: () => closeWindow(POLAROID_CAMERA_PROGRAM_ID) },
      ],
    },
    {
      label: "Filters",
      entries: FILMS.map((option) => ({
        label: option.name,
        checked: option.id === film.id,
        onSelect: () => setFilm(option),
      })),
    },
  ];

  return (
    <div className="flex size-full flex-col">
      <MenuBar menus={menus} />
      <div className="flex min-h-0 flex-1 items-center justify-center p-6 [container-type:size]">
        <div
          ref={containerRef}
          // Largest box with the photo's aspect that fits both ways.
          className="relative aspect-[1200/1201] w-[min(100cqw,100cqh*1200/1201)]"
        >
          <Image
            src={cameraOpen}
            alt="Instax Mini 12 instant camera"
            sizes="420px"
            loading="eager"
            draggable={false}
            className="size-full select-none"
          />
          <MirrorPreview region={MIRROR} stream={stream} videoRef={videoRef} look={film.look} />
          <ShutterButton region={SHUTTER} disabled={!canShoot} onPress={shoot} />
        </div>
      </div>
      <StatusBar>
        <StatusBarField grow title={message}>
          {message}
        </StatusBarField>
        <StatusBarField width={120} title={`Filter: ${film.name}`}>
          Filter: {film.name}
        </StatusBarField>
      </StatusBar>
    </div>
  );
}
