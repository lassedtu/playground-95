"use client";

import { type Region, regionStyle } from "../data/camera-layout";

type ShutterButtonProps = {
  region: Region;
  disabled: boolean;
  onPress: () => void;
};

/** Invisible button over the camera photo's shutter, with a pressed-in look. */
export function ShutterButton({ region, disabled, onPress }: ShutterButtonProps) {
  return (
    <button
      type="button"
      aria-label="Take photo"
      title="Take photo"
      disabled={disabled}
      onClick={onPress}
      style={regionStyle(region)}
      className="absolute cursor-pointer bg-transparent outline-offset-2 transition-shadow duration-75 focus-visible:outline-1 focus-visible:outline-black focus-visible:outline-dotted enabled:active:bg-black/10 enabled:active:shadow-[inset_0_3px_8px_rgb(0_0_0/0.45)] disabled:cursor-not-allowed"
    />
  );
}
