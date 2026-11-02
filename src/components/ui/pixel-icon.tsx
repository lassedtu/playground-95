import Image, { type StaticImageData } from "next/image";

/** A program icon from a pixel-art image, kept crisp at any size. */
export function PixelIcon({ src, size }: { src: StaticImageData; size: 16 | 32 }) {
  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      unoptimized
      draggable={false}
      className="[image-rendering:pixelated]"
    />
  );
}
