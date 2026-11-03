import { Check } from 'lucide-react';
import type { FactoryOrderView } from '../../hooks/useFactoryGame';

interface Props {
  order: FactoryOrderView;
  typedIndex: number;            // progress into the active part (active ticket only)
  lastKeyCorrect: boolean | null;
}

export const URGENT_MS = 3_000; // timer bar turns red for the last 3 s

export default function OrderTicket({ order, typedIndex, lastKeyCorrect }: Props) {
  const { toy, partsDone, active, timeLeft, timeLimit } = order;
  const urgent = timeLeft <= URGENT_MS;
  const shaking = active && lastKeyCorrect === false;

  return (
    <div
      data-testid="order-ticket"
      data-toy={toy.id}
      data-active={active}
      aria-label={`${toy.name} order, ${Math.ceil(timeLeft / 1000)} seconds left`}
      className={`w-56 rounded-2xl border-4 bg-white p-3 shadow-lg ${active ? 'border-teal-400' : 'border-gray-200 opacity-75'}`}
    >
      <div className="flex items-center gap-2 mb-2">
        <span className="text-3xl" aria-hidden="true">{toy.icon}</span>
        <span className="font-display text-xl text-purple-700">{toy.name}</span>
      </div>

      <ul className="flex flex-col gap-1 mb-3">
        {toy.parts.map((part, i) => {
          const state = i < partsDone ? 'done' : active && i === partsDone ? 'active' : 'pending';
          if (state !== 'active') {
            return (
              <li
                key={i}
                data-testid="part"
                data-state={state}
                className={`flex items-center gap-1 font-display text-lg tracking-wider ${state === 'done' ? 'text-green-600' : 'text-gray-400'}`}
              >
                {state === 'done' ? <Check size={16} aria-label="done" /> : <span className="w-4" />}
                {part}
              </li>
            );
          }
          return (
            <li
              key={i}
              data-testid="active-part"
              data-part={part}
              data-state="active"
              className={`flex items-center gap-1 font-display text-2xl tracking-wider ${shaking ? 'animate-shake' : ''}`}
            >
              <span className="w-4" />
              {part.split('').map((ch, j) => {
                const s = j < typedIndex ? 'typed' : j === typedIndex ? (lastKeyCorrect === false ? 'wrong' : 'current') : 'pending';
                return (
                  <span
                    key={j}
                    data-state={s}
                    className={
                      s === 'typed'
                        ? 'text-green-600'
                        : s === 'wrong'
                        ? 'text-red-600 border-b-4 border-red-500'
                        : s === 'current'
                        ? 'text-purple-700 border-b-4 border-purple-500'
                        : 'text-gray-500'
                    }
                  >
                    {ch}
                  </span>
                );
              })}
            </li>
          );
        })}
      </ul>

      {/* Timer bar, driven by the hook's 100ms ticks with a matching CSS transition */}
      <div
        data-testid="order-timer"
        data-urgent={urgent}
        className="h-2.5 w-full rounded-full bg-gray-200 overflow-hidden"
      >
        <div
          className={`h-full ${urgent ? 'bg-red-500' : 'bg-teal-400'} transition-[width] duration-100 ease-linear`}
          style={{ width: `${(100 * timeLeft) / timeLimit}%` }}
        />
      </div>
    </div>
  );
}
