import { motion } from 'framer-motion';
import { Rocket as RocketIcon } from 'lucide-react';
import { STAGES } from '../../hooks/useRocketsGame';

interface Props {
  altitude: number; // km
  fuel: number;     // 0-100
}

const MOON_KM = STAGES[STAGES.length - 1].km;

export default function Rocket({ altitude, fuel }: Props) {
  // Climb from near the ground to near the top of the sky as the rocket nears the Moon.
  const height = 8 + 70 * Math.min(altitude / MOON_KM, 1);
  const empty = fuel === 0;

  return (
    // Height and flame are driven by the hook's 100ms ticks; matching linear CSS
    // transitions keep them smooth between ticks (as the Post Office belt does).
    // Starting a Framer animation on every tick was ~12x slower and could stall
    // Playwright's fake clock, so Framer is kept for the one-off effects below.
    <div
      data-testid="rocket"
      data-engine={empty ? 'sputtering' : 'burning'}
      className="absolute left-1/2 -ml-8 transition-[bottom] duration-100 ease-linear"
      style={{ bottom: `${height}%` }}
    >
      {/* Lift-off on mount; a wobble each time the engine cuts out */}
      <motion.div
        key={empty ? 'sputtering' : 'burning'}
        className="flex flex-col items-center"
        initial={empty ? { rotate: 0 } : { y: 24, opacity: 0 }}
        animate={empty ? { rotate: [0, -8, 8, -4, 0] } : { y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        <RocketIcon size={64} className="-rotate-45 text-white drop-shadow-lg" aria-hidden="true" />
        {/* Flame size follows fuel; a sputtering engine flickers instead */}
        <div
          aria-hidden="true"
          className={`w-4 rounded-b-full bg-linear-to-b from-yellow-300 via-orange-500 to-red-500 transition-[height] duration-100 ease-linear ${empty ? 'animate-pulse opacity-40' : ''}`}
          style={{ height: empty ? 4 : 8 + fuel * 0.4 }}
        />
      </motion.div>
    </div>
  );
}
