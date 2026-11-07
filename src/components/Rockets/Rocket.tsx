import { motion } from 'framer-motion';
import { Rocket as RocketIcon } from 'lucide-react';
import { MAX_SPEED, STALL_SPEED } from '../../hooks/useRocketsGame';

interface Props {
  speed: number;   // km/s
  thrusts: number; // completed words so far; each one fires a thrust
}

// The rocket stays mid-sky, always in flight; the scenery scrolls past it.
// Its flame follows speed through a CSS transition (the hook ticks every
// 100ms, and starting a Framer animation per tick stalled Playwright's fake
// clock in TYP-20). Framer is only used for the one-off thrust on each word.
export default function Rocket({ speed, thrusts }: Props) {
  const stalling = speed < STALL_SPEED;

  return (
    <div
      data-testid="rocket"
      data-engine={stalling ? 'stalling' : 'burning'}
      data-thrusts={thrusts}
      className="absolute left-1/2 bottom-[30%] -ml-8"
    >
      {/* Re-keyed on every completed word, so the thrust replays each time */}
      <motion.div
        key={thrusts}
        data-testid={thrusts > 0 ? 'thrust' : undefined}
        className="flex flex-col items-center"
        initial={false}
        animate={thrusts > 0 ? { y: [0, -28, 0] } : { y: 0 }}
        transition={{ duration: 0.45, ease: 'easeOut' }}
      >
        <RocketIcon size={64} className="-rotate-45 text-white drop-shadow-lg" aria-hidden="true" />
        <motion.div
          aria-hidden="true"
          className="origin-top"
          initial={false}
          animate={thrusts > 0 ? { scaleY: [1, 2.4, 1], scaleX: [1, 1.6, 1] } : { scaleY: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div
            className={`w-4 rounded-b-full bg-linear-to-b from-yellow-300 via-orange-500 to-red-500 transition-[height] duration-100 ease-linear ${stalling ? 'animate-pulse opacity-40' : ''}`}
            style={{ height: 6 + (34 * Math.min(speed, MAX_SPEED)) / MAX_SPEED }}
          />
        </motion.div>
      </motion.div>
    </div>
  );
}
