import { STAT_MAX, statsFor } from "../data/car-stats";
import { type Vehicle, VEHICLES } from "../data/vehicles";

const masses = VEHICLES.map((v) => v.mass);
const lightest = Math.min(...masses);
const heaviest = Math.max(...masses);

/** Weight on the same 1–5 scale, from the lightest car (1) to the heaviest (5). */
const weightOf = (vehicle: Vehicle) =>
  heaviest === lightest ? 3 : Math.round(1 + ((vehicle.mass - lightest) / (heaviest - lightest)) * (STAT_MAX - 1));

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-1" role="img" aria-label={`${label}: ${value} out of ${STAT_MAX}`}>
      <span aria-hidden className="w-[4.75rem] shrink-0 text-xs">
        {label}
      </span>
      <span aria-hidden className="flex gap-px border border-t-[#808080] border-r-white border-b-white border-l-[#808080] bg-white p-px">
        {Array.from({ length: STAT_MAX }, (_, i) => (
          <span key={i} className={`h-2 w-3 ${i < value ? "bg-win-navy" : "bg-[#c0c0c0]"}`} />
        ))}
      </span>
    </div>
  );
}

/** The selected car's speed, acceleration, handling and weight, as Win95-ish bar meters. */
export function CarStatBars({ vehicle }: { vehicle: Vehicle }) {
  const stats = statsFor(vehicle.name);
  return (
    <div className="flex flex-col gap-0.5">
      <Bar label="Speed" value={stats.speed} />
      <Bar label="Acceleration" value={stats.acceleration} />
      <Bar label="Handling" value={stats.handling} />
      <Bar label="Weight" value={weightOf(vehicle)} />
    </div>
  );
}
