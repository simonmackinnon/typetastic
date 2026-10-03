import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Play, Timer, Trophy, Flame, PackageX } from 'lucide-react';
import { usePostOfficeGame, MAX_PARCELS, type PostOfficeRoundResult } from '../../hooks/usePostOfficeGame';
import { REGIONS, type ParcelRegion } from '../../data/postOfficeParcels';
import Parcel from './Parcel';
import Bucket from './Bucket';

interface Props {
  onComplete: (result: PostOfficeRoundResult) => void;
  random?: () => number;
  autoStart?: boolean; // skip the Start button and go straight to the countdown
}

const emptyCounts = (): Record<ParcelRegion, number> => ({ NE: 0, SE: 0, MW: 0, W: 0 });

function formatTime(seconds: number): string {
  const s = Math.max(seconds, 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function PostOfficeGame({ onComplete, random, autoStart = false }: Props) {
  const game = usePostOfficeGame({ random });
  const [bucketCounts, setBucketCounts] = useState(emptyCounts);
  const completedRef = useRef(false);

  useEffect(() => {
    if (autoStart) game.start();
  }, []);

  useEffect(() => {
    if (game.status === 'countdown') {
      completedRef.current = false;
      setBucketCounts(emptyCounts());
    }
  }, [game.status]);

  useEffect(() => {
    if (!game.lastRouted) return;
    const { region } = game.lastRouted;
    setBucketCounts((c) => ({ ...c, [region]: c[region] + 1 }));
  }, [game.lastRouted?.uid]);

  useEffect(() => {
    if (game.status === 'complete' && !completedRef.current && game.result) {
      completedRef.current = true;
      // Give the last parcel's exit animation a moment to play.
      setTimeout(() => onComplete(game.result!), 600);
    }
  }, [game.status, game.result, onComplete]);

  const onBelt = [game.activeParcel, ...game.queue]
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, MAX_PARCELS);

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col items-center gap-6 w-full max-w-4xl mx-auto px-4">
        {/* Idle - start button */}
        {game.status === 'idle' && (
          <button
            onClick={game.start}
            className="flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
          >
            <Play size={22} fill="white" /> Start!
          </button>
        )}

        {/* Countdown */}
        {game.status === 'countdown' && (
          <div className="flex items-center justify-center w-24 h-24 rounded-full bg-purple-600 text-white">
            <span className="font-display text-6xl animate-pop">{game.countdown}</span>
          </div>
        )}

        {(game.status === 'playing' || game.status === 'complete') && (
          <>
            {/* HUD */}
            <div className="flex gap-8 font-body text-sm font-bold">
              <div className="flex flex-col items-center">
                <span data-testid="hud-time" className="flex items-center gap-1 text-2xl font-display text-purple-600">
                  <Timer size={18} aria-hidden="true" /> {formatTime(game.timeRemaining)}
                </span>
                <span className="text-gray-500 text-xs">Time</span>
              </div>
              <div className="flex flex-col items-center">
                <span data-testid="hud-score" className="flex items-center gap-1 text-2xl font-display text-green-600">
                  <Trophy size={18} aria-hidden="true" /> {game.score}
                </span>
                <span className="text-gray-500 text-xs">Sorted</span>
              </div>
              <div className="flex flex-col items-center">
                <span data-testid="hud-streak" className="flex items-center gap-1 text-2xl font-display text-orange-500">
                  <Flame size={18} aria-hidden="true" /> {game.streak}
                </span>
                <span className="text-gray-500 text-xs">Streak</span>
              </div>
              <div className="flex flex-col items-center">
                <span data-testid="hud-missed" className="flex items-center gap-1 text-2xl font-display text-red-500">
                  <PackageX size={18} aria-hidden="true" /> {game.parcelsMissed}
                </span>
                <span className="text-gray-500 text-xs">Missed</span>
              </div>
            </div>

            {/* Belt */}
            <div className="relative w-full">
              <div
                data-testid="belt"
                className="relative w-full h-36 rounded-2xl bg-gray-700 border-4 border-gray-800 overflow-visible
                           bg-[repeating-linear-gradient(90deg,#4b5563_0_2px,transparent_2px_40px)]"
              >
                <AnimatePresence custom={game.lastRouted}>
                  {onBelt.map((parcel) => (
                    <Parcel
                      key={parcel.uid}
                      parcel={parcel}
                      active={parcel.uid === game.activeParcel?.uid}
                      typedIndex={game.typedIndex}
                      lastKeyCorrect={game.lastKeyCorrect}
                    />
                  ))}
                </AnimatePresence>
              </div>

              {/* "Missed!" flash, re-keyed on each miss */}
              <AnimatePresence>
                {game.parcelsMissed > 0 && game.status === 'playing' && (
                  <motion.div
                    key={game.parcelsMissed}
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.8 }}
                    className="absolute right-2 -bottom-8 font-display text-red-500 pointer-events-none"
                    aria-hidden="true"
                  >
                    Missed!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Buckets */}
            <div className="flex flex-wrap justify-center gap-4 mt-4">
              {REGIONS.map(({ region, name }) => (
                <Bucket key={region} region={region} name={name} count={bucketCounts[region]} />
              ))}
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
