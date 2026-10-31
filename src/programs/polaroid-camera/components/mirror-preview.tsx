"use client";

import { type RefObject, useEffect, useState } from "react";

import { type Region, regionStyle } from "../data/camera-layout";

type MirrorPreviewProps = {
  region: Region;
  stream: MediaStream | null;
  /** The camera's <video>; also used to capture photos. */
  videoRef: RefObject<HTMLVideoElement | null>;
};

/**
 * Live camera feed laid over the camera photo's selfie mirror, clipped to the
 * mirror's shape. Until the feed is playing it's transparent, so the photo's
 * own reflection shows instead.
 */
export function MirrorPreview({ region, stream, videoRef }: MirrorPreviewProps) {
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

  const visible = playing && stream !== null;

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute overflow-hidden"
      style={regionStyle(region)}
    >
      {/* CSS filters here only affect the mirror; captured frames are unfiltered. */}
      <video
        ref={videoRef}
        muted
        playsInline
        disablePictureInPicture
        onPlaying={() => setPlaying(true)}
        onEmptied={() => setPlaying(false)}
        className={`size-full -scale-x-100 object-cover brightness-95 saturate-90 transition-opacity duration-500 ${
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
