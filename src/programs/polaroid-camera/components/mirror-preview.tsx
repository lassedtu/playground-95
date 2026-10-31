"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

import { type Region, regionStyle } from "../data/camera-layout";
import { coverCrop, get2d, hasFrame } from "../lib/photo/capture";
import { applyFilmLook, type FilmLook } from "../lib/photo/film-look";

type MirrorPreviewProps = {
  region: Region;
  stream: MediaStream | null;
  /** The camera's <video>; also used to capture photos. */
  videoRef: RefObject<HTMLVideoElement | null>;
  /** The selected film's look, shown live in the mirror. */
  look: FilmLook;
};

/** Device pixels per CSS pixel to render at; the mirror is tiny either way. */
const MAX_DPR = 2;

/**
 * Live camera feed laid over the camera photo's selfie mirror, clipped to the
 * mirror's shape and developed with the selected film's look, so the mirror
 * previews what the photo will look like. Until the feed is playing it's
 * transparent, so the photo's own reflection shows instead.
 */
export function MirrorPreview({ region, stream, videoRef, look }: MirrorPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.srcObject = stream;
    if (stream) {
      // Autoplay of a muted inline video is allowed; ignore aborts caused by
      // the stream changing mid-play.
      video.play().catch(() => {});
    }
  }, [stream, videoRef]);

  // Draw each frame mirrored, cropped to the mirror's shape, with the look.
  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!playing || !video || !canvas) return;
    const ctx = get2d(canvas, { willReadFrequently: true });
    let frame = 0;

    const draw = () => {
      frame = requestAnimationFrame(draw);
      const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      const width = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      if (!hasFrame(video)) return;

      const { sx, sy, sw, sh } = coverCrop(video.videoWidth, video.videoHeight, width / height);
      ctx.setTransform(-1, 0, 0, 1, width, 0); // mirror horizontally
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, width, height);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      const image = ctx.getImageData(0, 0, width, height);
      applyFilmLook(image, look);
      ctx.putImageData(image, 0, 0);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [playing, look, videoRef]);

  const visible = playing && stream !== null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute overflow-hidden"
      style={regionStyle(region)}
    >
      {/* Source for the canvas and for photos; never shown itself. */}
      <video
        ref={videoRef}
        muted
        playsInline
        disablePictureInPicture
        onPlaying={() => setPlaying(true)}
        onEmptied={() => setPlaying(false)}
        className="absolute inset-0 size-full opacity-0"
      />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 size-full transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
      {/* Glass: darkened rim and a soft diagonal glare, so the feed reads as a reflection. */}
      <div
        className={`absolute inset-0 bg-[linear-gradient(135deg,rgb(255_255_255/0.35)_0%,transparent_35%,transparent_70%,rgb(255_255_255/0.12)_100%)] shadow-[inset_0_0_6px_rgb(0_0_0/0.55)] transition-opacity duration-500 ${
          visible ? "opacity-100" : "opacity-0"
        }`}
      />
    </div>
  );
}
