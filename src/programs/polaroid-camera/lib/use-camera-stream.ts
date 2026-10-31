"use client";

import { useEffect, useState } from "react";

export type CameraStatus =
  | "idle" // not requested (inactive)
  | "starting" // waiting for permission / device
  | "live"
  | "denied" // user or browser blocked access
  | "unavailable" // no camera, unsupported browser, or camera disconnected
  | "busy" // camera in use by another app
  | "error";

type CameraError = Exclude<CameraStatus, "idle" | "starting" | "live">;
type Result = { stream: MediaStream } | { error: CameraError };

// The mirror is tiny; a modest resolution is plenty for the preview.
const CONSTRAINTS: MediaStreamConstraints = {
  audio: false,
  video: {
    facingMode: "user",
    width: { ideal: 640 },
    height: { ideal: 480 },
  },
};

function classify(error: unknown): CameraError {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "SecurityError":
      return "denied";
    case "NotFoundError":
    case "OverconstrainedError":
    case "NotSupportedError":
      return "unavailable";
    case "NotReadableError":
      return "busy";
    default:
      return "error";
  }
}

function stop(stream: MediaStream) {
  for (const track of stream.getTracks()) track.stop();
}

/**
 * Opens the user's camera while `active` is true and releases it (turning
 * the camera light off) when `active` becomes false or on unmount.
 */
export function useCameraStream(active: boolean): {
  status: CameraStatus;
  stream: MediaStream | null;
} {
  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!active) return;

    let cancelled = false;
    let acquired: MediaStream | null = null;

    const request = navigator.mediaDevices?.getUserMedia
      ? navigator.mediaDevices.getUserMedia(CONSTRAINTS)
      : Promise.reject(new DOMException("getUserMedia unsupported", "NotSupportedError"));

    request.then(
      (stream) => {
        if (cancelled) return stop(stream);
        acquired = stream;
        // E.g. a USB camera being unplugged.
        stream.getVideoTracks()[0]?.addEventListener("ended", () => {
          if (!cancelled) setResult({ error: "unavailable" });
        });
        setResult({ stream });
      },
      (error: unknown) => {
        if (!cancelled) setResult({ error: classify(error) });
      },
    );

    return () => {
      cancelled = true;
      if (acquired) stop(acquired);
      setResult(null);
    };
  }, [active]);

  if (!active) return { status: "idle", stream: null };
  if (!result) return { status: "starting", stream: null };
  if ("error" in result) return { status: result.error, stream: null };
  return { status: "live", stream: result.stream };
}
