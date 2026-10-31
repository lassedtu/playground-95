import { Cursor } from "@react95/core";
import { Logo } from "@react95/icons";

/**
 * Full-screen Win95-style startup splash, shown while the desktop's
 * client-side code loads. No hooks or browser APIs, so it's part of the
 * server-rendered HTML and visible on first paint.
 */
export function BootScreen() {
  return (
    <div
      role="status"
      aria-label="Starting Playground 95"
      className={`${Cursor.Wait} fixed inset-0 flex animate-delayed-fade-in flex-col bg-black text-white motion-reduce:animate-none`}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-6">
        <Logo
          variant="32x32_4"
          aria-hidden
          className="size-28 [image-rendering:pixelated]"
        />
        <p className="text-center text-3xl font-bold tracking-wide">
          Playground <span className="text-[#ff0]">95</span>
        </p>
        <p className="text-sm text-neutral-400">Starting up…</p>
      </div>
      <div
        aria-hidden
        className="h-3 w-full animate-boot-bar bg-[linear-gradient(90deg,#000080,#1084d0,#00a0a0,#ffd400,#ff5a00,#c0008f,#000080)] bg-size-[200%_100%] motion-reduce:animate-none"
      />
    </div>
  );
}
