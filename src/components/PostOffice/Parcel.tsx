import { useRef } from 'react';
import { motion, useIsPresent, type Variants } from 'framer-motion';
import { Package } from 'lucide-react';
import type { BeltParcelView } from '../../hooks/usePostOfficeGame';
import type { ParcelRegion } from '../../data/postOfficeParcels';

interface Props {
  parcel: BeltParcelView;
  active: boolean;
  typedIndex: number;
  lastKeyCorrect: boolean | null;
}

// Passed down by <AnimatePresence custom={...}> so an exiting parcel knows
// whether it was routed (fly to its bucket) or ran off the belt (drop).
export type ParcelExitInfo = { uid: number; region: ParcelRegion } | null;

export default function Parcel({ parcel, active, typedIndex, lastKeyCorrect }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const isPresent = useIsPresent(); // false while playing its exit animation
  const { uid, entry, progress } = parcel;

  const variants: Variants = {
    enter: { opacity: 0, y: -24, scale: 0.8 },
    onBelt: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.25 } },
    exit: (routed: ParcelExitInfo) => {
      if (routed?.uid !== uid) {
        return { y: 90, rotate: 25, opacity: 0, transition: { duration: 0.5, ease: 'easeIn' } };
      }
      // Fly from the parcel's current spot into its region's bucket.
      const from = ref.current?.getBoundingClientRect();
      const to = document.querySelector(`[data-bucket="${entry.region}"]`)?.getBoundingClientRect();
      const x = from && to ? to.left + to.width / 2 - (from.left + from.width / 2) : 0;
      const y = from && to ? to.top + to.height / 2 - (from.top + from.height / 2) : 0;
      return { x, y, scale: 0.3, opacity: 0, transition: { duration: 0.45, ease: 'easeInOut' } };
    },
  };

  const shaking = active && lastKeyCorrect === false;

  return (
    <motion.div
      ref={ref}
      variants={variants}
      initial="enter"
      animate="onBelt"
      exit="exit"
      data-testid={!isPresent ? 'exiting-parcel' : active ? 'active-parcel' : 'queued-parcel'}
      data-code={entry.code}
      // Belt position is driven by the hook's 100ms ticks; a matching linear
      // CSS transition keeps the movement smooth between ticks.
      style={{ left: `calc(${progress} * (100% - 9rem))` }}
      className="absolute top-1/2 -mt-10 w-36 transition-[left] duration-100 ease-linear"
    >
      <div
        className={`
          flex flex-col items-center gap-1 px-2 py-2 rounded-xl border-4 shadow-lg
          ${active ? 'bg-amber-100 border-amber-500' : 'bg-amber-50 border-amber-300 opacity-80'}
          ${shaking ? 'animate-shake border-red-400' : ''}
        `}
      >
        <Package size={22} className="text-amber-700" aria-hidden="true" />
        <div className="font-display text-xl tracking-wider" aria-label={`Parcel ${entry.code}`}>
          {entry.code.split('').map((ch, i) => {
            const state = !active
              ? 'pending'
              : i < typedIndex
              ? 'typed'
              : i === typedIndex
              ? (lastKeyCorrect === false ? 'wrong' : 'current')
              : 'pending';
            return (
              <span
                key={i}
                data-state={state}
                className={
                  state === 'typed'
                    ? 'text-green-600'
                    : state === 'wrong'
                    ? 'text-red-600 border-b-4 border-red-500'
                    : state === 'current'
                    ? 'text-purple-700 border-b-4 border-purple-500'
                    : 'text-gray-500'
                }
              >
                {ch}
              </span>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
