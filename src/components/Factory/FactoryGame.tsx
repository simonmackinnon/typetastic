import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Play, Timer, ToyBrick, Zap } from 'lucide-react';
import { useFactoryGame, COMBO_BONUS_AT, COMBO_BONUS_MS, type FactoryRoundResult } from '../../hooks/useFactoryGame';
import OrderTicket from './OrderTicket';
import ToyAssembly from './ToyAssembly';

interface Props {
  onComplete: (result: FactoryRoundResult) => void;
  random?: () => number;
  autoStart?: boolean; // skip the Start button and go straight to the countdown
}

function formatTime(seconds: number): string {
  const s = Math.max(seconds, 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function FactoryGame({ onComplete, random, autoStart = false }: Props) {
  const game = useFactoryGame({ random });
  const completedRef = useRef(false);
  const [bonusFor, setBonusFor] = useState<number | null>(null); // uid of the toy that earned it

  useEffect(() => {
    if (autoStart) game.start();
  }, []);

  useEffect(() => {
    if (game.status === 'countdown') {
      completedRef.current = false;
      setBonusFor(null);
    }
  }, [game.status]);

  // A toy finished with the combo at 3+ gives the next order extra time.
  useEffect(() => {
    if (game.lastBuilt && game.combo >= COMBO_BONUS_AT) setBonusFor(game.lastBuilt.uid);
  }, [game.lastBuilt?.uid]);

  useEffect(() => {
    if (game.status === 'complete' && !completedRef.current && game.result) {
      completedRef.current = true;
      // Let the last toy roll off before the results.
      setTimeout(() => onComplete(game.result!), 600);
    }
  }, [game.status, game.result, onComplete]);

  const playing = game.status === 'playing';

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex flex-col items-center gap-5 w-full max-w-4xl mx-auto px-4">
        {/* Idle - start button */}
        {game.status === 'idle' && (
          <button
            onClick={game.start}
            className="flex items-center gap-2 px-10 py-4 bg-linear-to-r from-green-400 to-emerald-500 text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
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

        {(playing || game.status === 'complete') && (
          <>
            {/* HUD */}
            <div className="flex gap-8 font-body text-sm font-bold">
              <div className="flex flex-col items-center">
                <span data-testid="hud-time" aria-label={`Time left ${formatTime(game.timeRemaining)}`} className="flex items-center gap-1 text-2xl font-display text-purple-600">
                  <Timer size={18} aria-hidden="true" /> {formatTime(game.timeRemaining)}
                </span>
                <span className="text-gray-500 text-xs">Time</span>
              </div>
              <div className="flex flex-col items-center">
                <span data-testid="hud-score" aria-label={`${game.score} toys built`} className="flex items-center gap-1 text-2xl font-display text-green-600">
                  <ToyBrick size={18} aria-hidden="true" /> {game.score}
                </span>
                <span className="text-gray-500 text-xs">Toys</span>
              </div>
              <div className="flex flex-col items-center">
                <span data-testid="hud-combo" aria-label={`Combo ${game.combo}`} className="flex items-center gap-1 text-2xl font-display text-orange-500">
                  <Zap size={18} aria-hidden="true" /> ×{game.combo}
                </span>
                <span className="text-gray-500 text-xs">Combo</span>
              </div>
            </div>
            <span className="sr-only" aria-live="polite">{`${game.score} toys built`}</span>

            <div className="relative w-full">
              <ToyAssembly order={game.orders[0] ?? null} builtUid={game.lastBuilt?.uid ?? null} />

              {/* "+3 s!" flash when the combo bonus is applied */}
              <AnimatePresence>
                {bonusFor !== null && playing && (
                  <motion.div
                    key={`bonus-${bonusFor}`}
                    data-testid="bonus-flash"
                    initial={{ opacity: 1, y: 0, scale: 1 }}
                    animate={{ opacity: 0, y: -30, scale: 1.3 }}
                    transition={{ duration: 1.2 }}
                    className="absolute right-4 top-2 font-display text-3xl text-yellow-300 drop-shadow-lg pointer-events-none"
                  >
                    +{COMBO_BONUS_MS / 1000} s!
                  </motion.div>
                )}
              </AnimatePresence>

              {/* "Missed!" flash, re-keyed on each miss */}
              <AnimatePresence>
                {game.ordersMissed > 0 && playing && (
                  <motion.div
                    key={`missed-${game.ordersMissed}`}
                    data-testid="missed-flash"
                    initial={{ opacity: 1, y: 0 }}
                    animate={{ opacity: 0, y: 24 }}
                    transition={{ duration: 0.8 }}
                    className="absolute left-4 top-2 font-display text-3xl text-red-400 pointer-events-none"
                  >
                    Missed!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Order tickets: the front one is active */}
            <div data-testid="order-tickets" className="flex flex-wrap justify-center gap-4 min-h-[12rem]">
              {game.orders.map((order) => (
                <OrderTicket key={order.uid} order={order} typedIndex={game.typedIndex} lastKeyCorrect={game.lastKeyCorrect} />
              ))}
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
