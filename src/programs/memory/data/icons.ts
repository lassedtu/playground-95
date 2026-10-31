import type { ComponentType, SVGProps } from "react";
// One module per icon: the package index re-exports all ~1,800 icons.
import { Bookmark } from "@react95/icons/Bookmark";
import { Calculator } from "@react95/icons/Calculator";
import { Camera } from "@react95/icons/Camera";
import { Computer } from "@react95/icons/Computer";
import { Defrag } from "@react95/icons/Defrag";
import { Folder } from "@react95/icons/Folder";
import { Freecell1 } from "@react95/icons/Freecell1";
import { Globe } from "@react95/icons/Globe";
import { HelpBook } from "@react95/icons/HelpBook";
import { Ie } from "@react95/icons/Ie";
import { Joy102 } from "@react95/icons/Joy102";
import { KeyboardMouse } from "@react95/icons/KeyboardMouse";
import { Lock } from "@react95/icons/Lock";
import { Logo } from "@react95/icons/Logo";
import { Mail } from "@react95/icons/Mail";
import { MediaCd } from "@react95/icons/MediaCd";
import { Mplayer10 } from "@react95/icons/Mplayer10";
import { Mspaint } from "@react95/icons/Mspaint";
import { Notepad } from "@react95/icons/Notepad";
import { Phone2 } from "@react95/icons/Phone2";
import { Printer } from "@react95/icons/Printer";
import { RecycleFull } from "@react95/icons/RecycleFull";
import { Winmine1 } from "@react95/icons/Winmine1";
import { Wordpad } from "@react95/icons/Wordpad";

type IconComponent = ComponentType<SVGProps<SVGSVGElement> & { variant?: "32x32_4" }>;

export type CardIcon = {
  id: string;
  /** Spoken name for screen readers. */
  label: string;
  Icon: IconComponent;
};

/**
 * Card faces: 24 Win95 icons picked to be easy to tell apart at small sizes
 * (no two computers, CDs, globes, card games, …). Expert uses all of them.
 */
export const CARD_ICONS: readonly CardIcon[] = [
  { id: "computer", label: "My Computer", Icon: Computer },
  { id: "paint", label: "Paint", Icon: Mspaint },
  { id: "notepad", label: "Notepad", Icon: Notepad },
  { id: "camera", label: "Video camera", Icon: Camera },
  { id: "folder", label: "Folder", Icon: Folder },
  { id: "mine", label: "Mine", Icon: Winmine1 },
  { id: "windows", label: "Windows logo", Icon: Logo },
  { id: "cards", label: "Playing cards", Icon: Freecell1 },
  { id: "wordpad", label: "WordPad", Icon: Wordpad },
  { id: "calculator", label: "Calculator", Icon: Calculator },
  { id: "mail", label: "Mail", Icon: Mail },
  { id: "recycle", label: "Recycle Bin", Icon: RecycleFull },
  { id: "printer", label: "Printer", Icon: Printer },
  { id: "joystick", label: "Joystick", Icon: Joy102 },
  { id: "cd", label: "CD", Icon: MediaCd },
  { id: "globe", label: "Globe", Icon: Globe },
  { id: "help", label: "Help book", Icon: HelpBook },
  { id: "phone", label: "Telephone", Icon: Phone2 },
  { id: "media-player", label: "Media Player", Icon: Mplayer10 },
  { id: "internet-explorer", label: "Internet Explorer", Icon: Ie },
  { id: "defrag", label: "Disk Defragmenter", Icon: Defrag },
  { id: "lock", label: "Padlock", Icon: Lock },
  { id: "book", label: "Book", Icon: Bookmark },
  { id: "keyboard", label: "Keyboard and mouse", Icon: KeyboardMouse },
];
