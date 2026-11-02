import { Fuel } from 'lucide-react';
import { EMPTY_LIMIT_MS } from '../../hooks/useRocketsGame';

interface Props {
  fuel: number;     // 0-100
  emptyFor: number; // ms continuously at 0 fuel
}

export default function FuelGauge({ fuel, emptyFor }: Props) {
  const pct = Math.round(fuel);
  const empty = fuel === 0;
  const secondsLeft = Math.max(0, Math.ceil((EMPTY_LIMIT_MS - emptyFor) / 1000));
  const fill = pct > 60 ? 'bg-green-500' : pct > 25 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-1 font-body text-sm font-bold text-gray-600">
        <span className="flex items-center gap-1">
          <Fuel size={16} aria-hidden="true" /> Fuel
        </span>
        <span>{pct}%</span>
      </div>
      <div
        data-testid="fuel-gauge"
        role="meter"
        aria-label="Fuel"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        className="h-5 w-full rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden"
      >
        <div className={`h-full ${fill} transition-[width] duration-100 ease-linear`} style={{ width: `${pct}%` }} />
      </div>
      {empty && (
        <p
          data-testid="refuel-warning"
          role="alert"
          className="mt-2 text-center font-display text-2xl text-red-600 animate-pulse"
        >
          Refuel! {secondsLeft} s
        </p>
      )}
    </div>
  );
}
