import { useEffect, useRef } from 'react';
import { AnimatePresence, MotionConfig, motion } from 'framer-motion';
import { Play, Timer, Mountain, Flame } from 'lucide-react';
import { useRocketsGame, STAGES, type RocketsRoundResult } from '../../hooks/useRocketsGame';
import Rocket from './Rocket';
import SpeedGauge from './SpeedGauge';

interface Props {
  onComplete: (result: RocketsRoundResult) => void;
  random?: () => number;
  autoStart?: boolean; // skip the Start button and go straight to the countdown
}

// Background per stage: Sky, Clouds, Space, Satellites, Moon.
const SKY_BY_STAGE = [
  'from-sky-300 to-sky-100',
  'from-sky-500 to-slate-200',
  'from-indigo-950 to-indigo-700',
  'from-slate-950 to-indigo-900',
  'from-black to-slate-800',
];

// The scenery scrolls down as the rocket climbs, so the rocket reads as
// flying; faster speed = faster scrolling. Clouds in the Sky and Clouds
// stages, then stars (at half speed, for depth) from Space upwards.
const SCENERY_PX_PER_KM = 6;
const CLOUDS =
  'radial-gradient(ellipse 60px 22px at 20% 30%, rgba(255,255,255,0.8) 60%, transparent 62%),' +
  'radial-gradient(ellipse 80px 26px at 75% 70%, rgba(255,255,255,0.65) 60%, transparent 62%)';
const STARS =
  'radial-gradient(circle 1.5px at 10% 15%, white 98%, transparent),' +
  'radial-gradient(circle 1px at 55% 45%, white 98%, transparent),' +
  'radial-gradient(circle 1.5px at 85% 25%, white 98%, transparent),' +
  'radial-gradient(circle 1px at 35% 85%, white 98%, transparent),' +
  'radial-gradient(circle 1px at 70% 60%, white 98%, transparent)';
const FIRST_SPACE_STAGE = 2;

function formatTime(seconds: number): string {
  const s = Math.max(seconds, 0);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export default function RocketsGame({ onComplete, random, autoStart = false }: Props) {
  const game = useRocketsGame({ random });
  const completedRef = useRef(false);

  useEffect(() => {
    if (autoStart) game.start();
  }, []);

  useEffect(() => {
    if (game.status === 'countdown') completedRef.current = false;
  }, [game.status]);

  useEffect(() => {
    if (game.status === 'complete' && !completedRef.current && game.result) {
      completedRef.current = true;
      // Let the final climb/sputter settle for a moment before the results.
      setTimeout(() => onComplete(game.result!), 600);
    }
  }, [game.status, game.result, onComplete]);

  const stage = STAGES[game.stage];
  const word = game.activeWord?.word ?? '';

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

        {(game.status === 'playing' || game.status === 'complete') && (
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
                <span data-testid="hud-km" aria-label={`Altitude ${Math.floor(game.altitude)} kilometres`} className="flex items-center gap-1 text-2xl font-display text-sky-600">
                  <Mountain size={18} aria-hidden="true" /> {Math.floor(game.altitude)} km
                </span>
                <span className="text-gray-500 text-xs">Altitude</span>
              </div>
              <div className="flex flex-col items-center">
                <span data-testid="hud-streak" aria-label={`Streak ${game.streak}`} className="flex items-center gap-1 text-2xl font-display text-orange-500">
                  <Flame size={18} aria-hidden="true" /> {game.streak}
                </span>
                <span className="text-gray-500 text-xs">Streak</span>
              </div>
            </div>
            <span className="sr-only" aria-live="polite">{`${Math.floor(game.altitude / 10) * 10} km, ${stage.name}`}</span>

            {/* Sky */}
            <div
              data-testid="sky"
              data-stage={stage.name}
              className={`relative w-full h-72 rounded-3xl overflow-hidden border-4 border-white shadow-xl bg-linear-to-t ${SKY_BY_STAGE[game.stage]} transition-colors duration-700`}
            >
              {/* Scenery driven by the 100ms ticks, smoothed by a matching CSS transition */}
              <div
                data-testid="scenery"
                data-offset={Math.round(game.altitude * SCENERY_PX_PER_KM)}
                aria-hidden="true"
                className="absolute inset-0"
              >
                <div
                  className={`absolute inset-0 transition-[background-position,opacity] duration-100 ease-linear ${game.stage < FIRST_SPACE_STAGE ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    backgroundImage: CLOUDS,
                    backgroundSize: '320px 240px',
                    backgroundPosition: `0 ${Math.round(game.altitude * SCENERY_PX_PER_KM)}px`,
                  }}
                />
                <div
                  className={`absolute inset-0 transition-[background-position,opacity] duration-100 ease-linear ${game.stage >= FIRST_SPACE_STAGE ? 'opacity-100' : 'opacity-0'}`}
                  style={{
                    backgroundImage: STARS,
                    backgroundSize: '240px 200px',
                    backgroundPosition: `0 ${Math.round((game.altitude * SCENERY_PX_PER_KM) / 2)}px`,
                  }}
                />
              </div>
              <span className="absolute top-3 left-4 font-display text-lg text-white drop-shadow">{stage.name}</span>
              <Rocket speed={game.speed} thrusts={game.wordsTyped} />

              {/* "Stage reached!" flash, re-keyed on each new stage */}
              <AnimatePresence>
                {game.stage > 0 && game.status === 'playing' && (
                  <motion.div
                    key={game.stage}
                    data-testid="stage-flash"
                    initial={{ opacity: 1, scale: 0.8 }}
                    animate={{ opacity: 0, scale: 1.2 }}
                    transition={{ duration: 1.5 }}
                    className="absolute inset-x-0 top-1/3 text-center font-display text-4xl text-yellow-300 drop-shadow-lg pointer-events-none"
                  >
                    {stage.name} reached!
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <SpeedGauge speed={game.speed} stallFor={game.stallFor} />

            {/* Word to type, with the next one previewed */}
            <div className="flex items-baseline gap-6">
              <div
                key={`${game.wordsTyped}`}
                data-testid="active-word"
                data-word={word}
                aria-label={`Type ${word}`}
                className={`px-6 py-3 rounded-2xl bg-white border-4 shadow-lg font-display text-4xl tracking-wider
                  ${game.lastKeyCorrect === false ? 'animate-shake border-red-400' : 'border-purple-300'}`}
              >
                {word.split('').map((ch, i) => {
                  const state =
                    i < game.typedIndex ? 'typed'
                    : i === game.typedIndex ? (game.lastKeyCorrect === false ? 'wrong' : 'current')
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
              {game.nextWord && (
                <div data-testid="next-word" className="font-display text-2xl tracking-wider text-gray-400" aria-label={`Next: ${game.nextWord.word}`}>
                  {game.nextWord.word}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </MotionConfig>
  );
}
