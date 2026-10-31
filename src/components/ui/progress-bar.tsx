type ProgressBarProps = {
  /** 0–100. */
  percent: number;
  /** Accessible name, e.g. "Quiz progress". */
  label: string;
};

/**
 * Win95-style progress bar: a sunken track with a fill in the theme's
 * highlight colour. The percentage is shown once, inside the filled part
 * (hidden while the fill is too narrow for it).
 */
export function ProgressBar({ percent, label }: ProgressBarProps) {
  const value = Math.max(0, Math.min(100, Math.round(percent)));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className="h-5 w-full border border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-px"
    >
      <div
        className="flex h-full items-center justify-end overflow-hidden bg-win-navy pr-1 text-[11px] text-white transition-[width] duration-200 motion-reduce:transition-none"
        style={{ width: `${value}%` }}
      >
        {value >= 12 && <span aria-hidden>{value}%</span>}
      </div>
    </div>
  );
}
