import type { ComponentType, SVGProps } from "react";
import { Calculator } from "@react95/icons/Calculator";
import { Computer } from "@react95/icons/Computer";
import { Folder } from "@react95/icons/Folder";
import { Globe } from "@react95/icons/Globe";
import { Joy102 } from "@react95/icons/Joy102";
import { Logo } from "@react95/icons/Logo";
import { Mail } from "@react95/icons/Mail";
import { MediaCd } from "@react95/icons/MediaCd";
import { Mspaint } from "@react95/icons/Mspaint";
import { Notepad } from "@react95/icons/Notepad";
import { Printer } from "@react95/icons/Printer";

type Icon = ComponentType<SVGProps<SVGSVGElement> & { variant?: "32x32_4" }>;

export type TileStyle = { icon: Icon; name: string; background: string; color: string };

/**
 * Each value climbs the Win95 ladder, from a humble notepad to the Windows
 * logo at 2048. The number is always shown too, so it's clear which is bigger.
 */
const STYLES: Record<number, TileStyle> = {
  2: { icon: Notepad, name: "Notepad", background: "#ffffff", color: "#000000" },
  4: { icon: Folder, name: "Folder", background: "#ffffe1", color: "#000000" },
  8: { icon: Mail, name: "Mail", background: "#ffff80", color: "#000000" },
  16: { icon: Calculator, name: "Calculator", background: "#ffc080", color: "#000000" },
  32: { icon: Mspaint, name: "Paint", background: "#ff8040", color: "#000000" },
  64: { icon: MediaCd, name: "CD", background: "#ff4040", color: "#ffffff" },
  128: { icon: Joy102, name: "Joystick", background: "#80ffff", color: "#000000" },
  256: { icon: Printer, name: "Printer", background: "#00c0c0", color: "#000000" },
  512: { icon: Computer, name: "My Computer", background: "#8080ff", color: "#ffffff" },
  1024: { icon: Globe, name: "Internet", background: "#4040c0", color: "#ffffff" },
  2048: { icon: Logo, name: "Windows", background: "#000080", color: "#ffff00" },
};

/** Beyond 2048: still Windows, on black. */
const BEYOND: TileStyle = { icon: Logo, name: "Windows", background: "#000000", color: "#ffff00" };

export const tileStyle = (value: number): TileStyle => STYLES[value] ?? BEYOND;
