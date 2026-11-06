import { Gauge } from 'lucide-react';
import { MAX_SPEED, STALL_LIMIT_MS, STALL_SPEED } from '../../hooks/useRocketsGame';

interface Props {
  speed: number;    // km/s
  stallFor: number; // ms continuously below STALL_SPEED
}

export default function SpeedGauge({ speed, stallFor }: Props) {
  const shown = Math.round(speed * 10) / 10;
  const pct = Math.min(100, (100 * speed) / MAX_SPEED);
  const stalling = speed < STALL_SPEED;
  const secondsLeft = Math.max(0, Math.ceil((STALL_LIMIT_MS - stallFor) / 1000));
  const fill = pct > 50 ? 'bg-green-500' : pct > 20 ? 'bg-amber-400' : 'bg-red-500';

  return (
    <div className="w-full max-w-md">
      <div className="flex items-center justify-between mb-1 font-body text-sm font-bold text-gray-600">
        <span className="flex items-center gap-1">
          <Gauge size={16} aria-hidden="true" /> Speed
        </span>
        <span>{shown.toFixed(1)} km/s</span>
      </div>
      <div
        data-testid="speed-gauge"
        role="meter"
        aria-label="Speed"
        aria-valuemin={0}
        aria-valuemax={MAX_SPEED}
        aria-valuenow={shown}
        aria-valuetext={`${shown.toFixed(1)} kilometres per second`}
        className="h-5 w-full rounded-full bg-gray-200 border-2 border-gray-300 overflow-hidden"
      >
        {/* Driven by the hook's 100ms ticks; a matching CSS transition keeps it smooth */}
        <div className={`h-full ${fill} transition-[width] duration-100 ease-linear`} style={{ width: `${pct}%` }} />
      </div>
      {stalling && (
        <p
          data-testid="stall-warning"
          role="alert"
          className="mt-2 text-center font-display text-2xl text-red-600 animate-pulse"
        >
          Stalling! {secondsLeft} s
        </p>
      )}
    </div>
  );
}
