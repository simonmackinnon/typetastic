import { Fragment, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, RotateCcw, Gamepad2, type LucideIcon } from 'lucide-react';
import { useProgress } from '../../context/ProgressContext';
import { useAuth } from '../../context/AuthContext';
import { GAMES_BY_ID, type GameDefinition, type GameId } from '../../data/games';
import type { GameRoundResult } from '../../types';

// The page around every arcade game: instructions -> playing -> results, the
// phone keyboard gate, the saved best and score submission. Each game page
// supplies only what's specific to it.

export interface ResultStat {
  id: string;        // rendered as data-testid="result-<id>"
  label: string;
  value: ReactNode;
  Icon: LucideIcon;
  color: string;     // Tailwind text colour for the value
  bg: string;        // Tailwind background for the tile
}

interface Props<R extends GameRoundResult> {
  gameId: GameId;
  instructions: ReactNode;
  renderGame: (props: { onComplete: (result: R) => void }) => ReactNode;
  resultStats: (result: R) => ResultStat[];
  headline: (result: R) => string;
  iconColor?: string; // Tailwind text colour for the game's icon
}

type Phase = 'instructions' | 'playing' | 'results';

/** "1 parcel", "3 parcels" */
export function formatUnit(n: number, unit: GameDefinition['unit']): string {
  return `${n} ${n === 1 ? unit.one : unit.many}`;
}

function personalBestMessage(score: number, previousBest: number | null, unit: GameDefinition['unit']): string {
  if (previousBest === null) return `First score saved: ${score}!`;
  if (score > previousBest) return `New personal best! (was ${previousBest})`;
  return `Your best is ${formatUnit(previousBest, unit)}. Keep going to beat it!`;
}

export default function GameFlowPage<R extends GameRoundResult>({
  gameId, instructions, renderGame, resultStats, headline, iconColor = 'text-purple-600',
}: Props<R>) {
  const game = GAMES_BY_ID[gameId];
  const { Icon } = game;
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [round, setRound] = useState(0); // re-keys the game so each round starts fresh
  const [result, setResult] = useState<R | null>(null);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const { gameScores, submitGameScore } = useProgress();
  const { user } = useAuth();
  const savedBest = gameScores[gameId]?.bestScore ?? null;

  const play = () => {
    setResult(null);
    setRound((r) => r + 1);
    setPhase('playing');
  };

  const handleComplete = (r: R) => {
    setPreviousBest(savedBest); // captured before this round updates it
    setResult(r);
    setPhase('results');
    submitGameScore(gameId, r);
  };

  // ── Results screen ───────────────────────────────────────────────────────
  if (phase === 'results' && result) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center animate-bounce-in">
          <Icon size={64} className={`${iconColor} mx-auto mb-4`} aria-hidden="true" />
          <h2 className="font-display text-4xl text-purple-700 mb-1">{headline(result)}</h2>
          <p className="font-body text-gray-500 mb-4">{game.name} round complete</p>

          {user && (
            <p data-testid="personal-best" className="font-body font-bold text-orange-600 mb-6">
              {personalBestMessage(result.score, previousBest, game.unit)}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            {resultStats(result).map(({ label, value, Icon: StatIcon, color, bg, id }) => (
              <div key={id} className={`${bg} rounded-2xl p-4`}>
                <div data-testid={`result-${id}`} className={`flex items-center justify-center gap-2 font-display text-4xl ${color}`}>
                  <StatIcon size={24} aria-hidden="true" /> {value}
                </div>
                <div className="font-body text-sm text-gray-500">{label}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-3">
            <button
              onClick={play}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-xl rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Play Again
            </button>
            <button
              onClick={() => navigate('/games')}
              className="w-full py-2.5 bg-gray-100 text-gray-700 font-body font-bold rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Gamepad2 size={16} /> Back to Games
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Instructions + game ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-pink-50 py-8">
      {/* Mobile: can't play without a physical keyboard (same gate as GamePage) */}
      <div className="md:hidden flex flex-col items-center justify-center min-h-[60vh] text-center px-8 gap-6">
        <div className="text-6xl">⌨️</div>
        <h2 className="font-display text-3xl text-purple-700">Need a keyboard to play!</h2>
        <p className="font-body text-gray-500 max-w-xs leading-relaxed">
          This game needs a physical keyboard. Come back on a desktop or laptop to play.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/tutorials')}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-lg rounded-2xl hover:scale-105 transition-transform"
          >
            Browse Tutorials
          </button>
          <button
            onClick={() => navigate('/games')}
            className="w-full py-3 bg-gray-100 text-gray-700 font-body font-bold rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Back to Games
          </button>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:block">
        <div className="max-w-4xl mx-auto px-4 mb-6 flex items-center justify-between">
          <button
            onClick={() => navigate('/games')}
            className="font-body text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back
          </button>
          <h1 className="font-display text-3xl text-purple-700 flex items-center gap-2">
            <Icon size={28} className={iconColor} aria-hidden="true" /> {game.name}
          </h1>
          <span className="w-12" />
        </div>

        {phase === 'instructions' && (
          <div data-testid={`${gameId}-instructions`} className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <h2 className="font-display text-3xl text-purple-700 mb-4">How to play</h2>
              {instructions}
              {user && savedBest !== null && (
                <p data-testid="saved-best" className="font-body font-bold text-orange-600 mb-4">
                  {/* always plural: games-post-office.spec.ts asserts "Your best: 1 parcels" */}
                  Your best: {savedBest} {game.unit.many}
                </p>
              )}
              <button
                onClick={play}
                className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
              >
                <Play size={22} fill="white" /> Start!
              </button>
            </div>
          </div>
        )}

        {phase === 'playing' && <Fragment key={round}>{renderGame({ onComplete: handleComplete })}</Fragment>}
      </div>
    </div>
  );
}
