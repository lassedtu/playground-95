"use client";

import { type CSSProperties, useEffect, useState } from "react";

import type { DisplaySettings } from "@/lib/display/display-settings";
import { loadTheme, type ThemeColors } from "@/lib/display/themes";
import { desktopBackground } from "@/lib/display/wallpapers";
import { useViewportSize } from "@/lib/use-viewport-size";

const SCREEN = { width: 168, height: 118 };

/** A little CRT showing the desktop and two windows with the chosen settings. */
export function PreviewMonitor({ settings }: { settings: DisplaySettings }) {
  const viewport = useViewportSize();
  const [colors, setColors] = useState<ThemeColors | null>(null);

  useEffect(() => {
    let current = true;
    void loadTheme(settings.theme).then((tokens) => current && setColors(tokens.colors));
    return () => {
      current = false;
    };
  }, [settings.theme]);

  const scale = SCREEN.width / Math.max(320, viewport.width);
  const background = desktopBackground(settings.desktopColor, settings.wallpaper, settings.mode, settings.image, scale);

  return (
    <div aria-hidden className="flex flex-col items-center">
      {/* Monitor body */}
      <div className="rounded-sm bg-[#c0c0c0] p-2.5 pb-4 shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff,inset_-2px_-2px_#808080]">
        <div
          className="relative overflow-hidden border border-t-[#808080] border-r-white border-b-white border-l-[#808080]"
          style={{ ...SCREEN, ...background }}
        >
          {colors && (
            <>
              <MiniWindow colors={colors} active={false} title="Inactive" style={{ left: 14, top: 12 }} />
              <MiniWindow colors={colors} active title="Active Window" style={{ left: 40, top: 32 }} />
              {/* Taskbar */}
              <div
                className="absolute inset-x-0 bottom-0 h-2.5"
                style={{ background: colors.material, borderTop: `1px solid ${colors.borderLightest}` }}
              />
            </>
          )}
        </div>
      </div>
      {/* Stand */}
      <div className="h-2 w-12 bg-[#c0c0c0] shadow-[inset_-1px_0_#808080,inset_1px_0_#fff]" />
      <div className="h-1.5 w-24 bg-[#c0c0c0] shadow-[inset_-1px_-1px_#000,inset_1px_1px_#fff]" />
    </div>
  );
}

function MiniWindow({
  colors,
  active,
  title,
  style,
}: {
  colors: ThemeColors;
  active: boolean;
  title: string;
  style: CSSProperties;
}) {
  return (
    <div
      className="absolute flex w-[100px] flex-col p-px"
      style={{
        ...style,
        background: colors.material,
        boxShadow: `inset 1px 1px ${colors.borderLightest}, inset -1px -1px ${colors.borderDarkest}`,
      }}
    >
      <div
        className="truncate px-0.5 text-[6px] leading-[8px] font-bold"
        style={{
          background: active ? colors.headerBackground : colors.headerNotActiveBackground,
          color: active ? colors.headerText : colors.headerNotActiveText,
        }}
      >
        {title}
      </div>
      <div className="h-8 p-0.5 text-[6px] leading-[8px]" style={{ color: colors.materialText }}>
        <div className="h-full" style={{ background: colors.inputBackground, boxShadow: `inset 1px 1px ${colors.borderDark}` }} />
      </div>
    </div>
  );
}
