import type { Stats } from "../lib/storage";

/** Played / win % / streaks, and the guess distribution as Win95 progress-style bars. */
export function StatsPanel({ stats, highlight }: { stats: Stats; highlight: number | null }) {
  const most = Math.max(1, ...stats.distribution);
  const numbers = [
    ["Played", stats.played],
    ["Win %", stats.played ? Math.round((stats.wins / stats.played) * 100) : 0],
    ["Streak", stats.streak],
    ["Best streak", stats.maxStreak],
  ] as const;

  return (
    <div className="flex flex-col gap-2">
      <dl className="m-0 grid grid-cols-4 gap-1 text-center">
        {numbers.map(([label, value]) => (
          <div key={label} className="flex flex-col-reverse">
            <dt className="text-[11px]">{label}</dt>
            <dd className="m-0 text-lg font-bold">{value}</dd>
          </div>
        ))}
      </dl>
      <div role="list" aria-label="Guess distribution" className="flex flex-col gap-0.5">
        {stats.distribution.map((count, i) => (
          <div key={i} role="listitem" aria-label={`${i + 1} guesses: ${count}`} className="flex items-center gap-1">
            <span aria-hidden className="w-3 text-right">
              {i + 1}
            </span>
            <span
              aria-hidden
              className={`min-w-5 px-1 text-right text-white ${highlight === i ? "bg-[#008000]" : "bg-[#808080]"}`}
              style={{ width: `${(count / most) * 100}%` }}
            >
              {count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
