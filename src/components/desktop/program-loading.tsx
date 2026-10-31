import { Cursor, Frame } from "@react95/core";
import { FlyingWindows100 } from "@react95/icons";

type ProgramLoadingProps = {
  title: string;
};

/** Content shown while a program is loading. */
export function ProgramLoading({ title }: ProgramLoadingProps) {
  return (
    <div
      role="status"
      className={`${Cursor.Wait} flex h-full animate-delayed-fade-in flex-col items-center justify-center gap-4 p-4 motion-reduce:animate-none`}
    >
      <FlyingWindows100 variant="32x32_4" aria-hidden />
      <p>Starting {title}…</p>
      <Frame
        aria-hidden
        boxShadow="$in"
        bgColor="$inputBackground"
        className="relative h-5 w-48 overflow-hidden p-0.5"
      >
        <div className="h-full w-2/5 animate-indeterminate bg-[repeating-linear-gradient(90deg,var(--color-win-navy)_0_8px,transparent_8px_10px)] motion-reduce:animate-none" />
      </Frame>
    </div>
  );
}
