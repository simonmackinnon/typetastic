import { useEffect, useRef } from 'react';
import { Play } from 'lucide-react';
import { useTypingGame } from '../../hooks/useTypingGame';
import Keyboard from '../Keyboard/Keyboard';
import ZoneIcon from '../icons/ZoneIcon';
import type { Exercise, Level, TypingResult } from '../../types';

interface Props {
  level: Level;
  exercise: Exercise;
  exerciseNumber: number;
  totalExercises: number;
  onComplete: (result: TypingResult) => void;
}

export default function TypingGame({
  level,
  exercise,
  exerciseNumber,
  totalExercises,
  onComplete,
}: Props) {
  const game = useTypingGame(exercise.target, level.requiredAccuracy);
  const completedRef = useRef(false);

  useEffect(() => {
    completedRef.current = false;
    game.reset();
  }, [exercise.id]);

  useEffect(() => {
    if (game.status === 'complete' && !completedRef.current && game.result) {
      completedRef.current = true;
      setTimeout(() => onComplete(game.result!), 600);
    }
  }, [game.status, game.result, onComplete]);

  const isKeyLevel = level.type === 'keys';

  // Build character spans for display
  const chars = exercise.target.split('');
  const typed = game.typed;

  return (
    <div className="flex flex-col items-center gap-6 w-full max-w-3xl mx-auto px-4">
      {/* Exercise header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span data-testid="level-name" className={`px-3 py-1 rounded-full text-sm font-body font-bold text-white ${level.color} flex items-center gap-1.5`}>
            <ZoneIcon zone={level.zone as 1|2|3|4|5|6} size={16} />
            {level.name}
          </span>
          <span className="text-gray-500 font-body text-sm">
            Exercise {exerciseNumber} of {totalExercises}
          </span>
        </div>
        <p className="font-body text-gray-600 text-lg">{exercise.prompt}</p>
      </div>

      {/* Stats bar */}
      {game.status === 'playing' && (
        <div className="flex gap-6 font-body text-sm font-bold">
          <div className="flex flex-col items-center">
            <span className="text-2xl font-display text-purple-600">{game.wpm}</span>
            <span className="text-gray-500 text-xs">WPM</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-2xl font-display text-green-600">{game.accuracy}%</span>
            <span className="text-gray-500 text-xs">Accuracy</span>
          </div>
          {level.speedTarget && (
            <div className="flex flex-col items-center">
              <span className="text-2xl font-display text-orange-500">{level.speedTarget}</span>
              <span className="text-gray-500 text-xs">WPM target</span>
            </div>
          )}
        </div>
      )}

      {/* Countdown */}
      {game.status === 'countdown' && (
        <div className="flex items-center justify-center w-24 h-24 rounded-full bg-purple-600 text-white">
          <span className="font-display text-6xl animate-pop">{game.countdown}</span>
        </div>
      )}

      {/* Idle - start button */}
      {game.status === 'idle' && (
        <button
          onClick={game.start}
          className="px-10 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
        >
          <Play size={22} fill="white" /> Start!
        </button>
      )}

      {/* Text display */}
      {(game.status === 'playing' || game.status === 'complete') && (
        <div
          className={`
            p-6 rounded-2xl shadow-inner w-full
            ${isKeyLevel
              ? 'bg-purple-50 border-2 border-purple-200'
              : 'bg-gray-50 border-2 border-gray-200'}
            ${game.lastKeyCorrect === false ? 'animate-shake border-red-400' : ''}
          `}
        >
          {isKeyLevel ? (
            /* Key practice: show large single character */
            <div className="flex flex-col items-center gap-4">
              <div
                className={`
                  text-8xl font-display w-32 h-32 flex items-center justify-center
                  rounded-2xl border-4 shadow-lg
                  ${game.lastKeyCorrect === true
                    ? 'bg-green-100 border-green-400 text-green-700 animate-pop'
                    : game.lastKeyCorrect === false
                    ? 'bg-red-100 border-red-400 text-red-700'
                    : 'bg-white border-purple-300 text-purple-700'}
                `}
              >
                {game.currentChar === ' ' ? '␣' : game.currentChar.toUpperCase()}
              </div>
              <div className="font-body text-gray-500 text-sm">
                {game.currentIndex} / {chars.length} keys typed
              </div>
              {/* Show remaining sequence */}
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {chars.map((ch, i) => (
                  <span
                    key={i}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-lg font-display text-sm
                      ${i < game.currentIndex
                        ? 'bg-green-200 text-green-700'
                        : i === game.currentIndex
                        ? 'bg-purple-600 text-white scale-110 shadow-md'
                        : 'bg-gray-200 text-gray-500'}
                    `}
                  >
                    {ch === ' ' ? '·' : ch.toUpperCase()}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            /* Word/sentence levels: show text with character highlighting */
            <p className="font-body text-2xl leading-relaxed tracking-wide text-center break-all">
              {chars.map((ch, i) => {
                const isTyped = i < typed.length;
                const isCurrent = i === game.currentIndex;
                return (
                  <span
                    key={i}
                    className={`
                      relative
                      ${isTyped ? 'text-green-600' : isCurrent ? 'text-purple-700 font-bold' : 'text-gray-400'}
                      ${isCurrent ? 'border-b-4 border-purple-500' : ''}
                    `}
                  >
                    {ch}
                  </span>
                );
              })}
            </p>
          )}
        </div>
      )}

      {/* Complete celebration */}
      {game.status === 'complete' && game.result && (
        <div className="flex flex-col items-center gap-3 p-6 bg-gradient-to-br from-yellow-50 to-green-50 rounded-2xl border-2 border-yellow-300 shadow-lg w-full animate-bounce-in">
          <div className="text-5xl">🎉</div>
          <p className="font-display text-2xl text-green-700">Exercise complete!</p>
          <div className="flex gap-8">
            <div className="text-center">
              <div className="font-display text-3xl text-purple-600">{game.result.wpm}</div>
              <div className="font-body text-xs text-gray-500">WPM</div>
            </div>
            <div className="text-center">
              <div className="font-display text-3xl text-green-600">{game.result.accuracy}%</div>
              <div className="font-body text-xs text-gray-500">Accuracy</div>
            </div>
          </div>
        </div>
      )}

      {/* Virtual keyboard */}
      {(game.status === 'playing' || game.status === 'idle') && exercise.showKeyboard && (
        <div className="w-full overflow-x-auto pb-2">
          <Keyboard
            nextChar={game.status === 'playing' ? game.currentChar : undefined}
            highlightKeys={game.status === 'idle' ? level.highlightKeys : []}
            visible
          />
        </div>
      )}
    </div>
  );
}
