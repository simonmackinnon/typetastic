import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Play, RotateCcw, Gamepad2, Trophy, PackageX, Target, Flame, Timer, Inbox } from 'lucide-react';
import PostOfficeGame from '../components/PostOffice/PostOfficeGame';
import { REGIONS } from '../data/postOfficeParcels';
import type { PostOfficeRoundResult } from '../hooks/usePostOfficeGame';
import { useProgress } from '../context/ProgressContext';
import { useAuth } from '../context/AuthContext';

const GAME_ID = 'post-office';

type Phase = 'instructions' | 'playing' | 'results';

function resultsHeadline(score: number): string {
  if (score >= 20) return 'Super Sorter!';
  if (score >= 10) return 'Great sorting!';
  if (score > 0) return 'Nice work!';
  return 'Keep practising!';
}

export default function PostOfficeGamePage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>('instructions');
  const [round, setRound] = useState(0); // re-keys the game so each round starts fresh
  const [result, setResult] = useState<PostOfficeRoundResult | null>(null);
  const [previousBest, setPreviousBest] = useState<number | null>(null);
  const { gameScores, submitGameScore } = useProgress();
  const { user } = useAuth();
  const savedBest = gameScores[GAME_ID]?.bestScore ?? null;

  const play = () => {
    setResult(null);
    setRound((r) => r + 1);
    setPhase('playing');
  };

  const handleComplete = (r: PostOfficeRoundResult) => {
    setPreviousBest(savedBest); // captured before this round updates it
    setResult(r);
    setPhase('results');
    submitGameScore(GAME_ID, r);
  };

  // ── Results screen ───────────────────────────────────────────────────────
  if (phase === 'results' && result) {
    const stats = [
      { label: 'Parcels sorted', value: result.score, Icon: Trophy, color: 'text-green-600', bg: 'bg-green-50', id: 'score' },
      { label: 'Parcels missed', value: result.parcelsMissed, Icon: PackageX, color: 'text-red-500', bg: 'bg-red-50', id: 'missed' },
      { label: 'Accuracy', value: `${result.accuracy}%`, Icon: Target, color: 'text-purple-600', bg: 'bg-purple-50', id: 'accuracy' },
      { label: 'Best streak', value: result.bestStreak, Icon: Flame, color: 'text-orange-500', bg: 'bg-orange-50', id: 'streak' },
    ];
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center animate-bounce-in">
          <Package size={64} className="text-amber-500 mx-auto mb-4" aria-hidden="true" />
          <h2 className="font-display text-4xl text-purple-700 mb-1">{resultsHeadline(result.score)}</h2>
          <p className="font-body text-gray-500 mb-4">Post Office round complete</p>

          {user && (
            <p data-testid="personal-best" className="font-body font-bold text-orange-600 mb-6">
              {previousBest === null
                ? `First score saved: ${result.score}!`
                : result.score > previousBest
                ? `New personal best! (was ${previousBest})`
                : `Your best is ${previousBest}. Keep going to beat it!`}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 mb-8">
            {stats.map(({ label, value, Icon, color, bg, id }) => (
              <div key={id} className={`${bg} rounded-2xl p-4`}>
                <div data-testid={`result-${id}`} className={`flex items-center justify-center gap-2 font-display text-4xl ${color}`}>
                  <Icon size={24} aria-hidden="true" /> {value}
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
            <Package size={28} className="text-amber-500" aria-hidden="true" /> Post Office
          </h1>
          <span className="w-12" />
        </div>

        {phase === 'instructions' && (
          <div data-testid="post-office-instructions" className="max-w-2xl mx-auto px-4">
            <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
              <h2 className="font-display text-3xl text-purple-700 mb-4">How to play</h2>
              <ul className="font-body text-gray-600 text-left space-y-3 mb-6">
                <li className="flex gap-3">
                  <Package size={20} className="shrink-0 text-amber-500 mt-0.5" aria-hidden="true" />
                  Parcels ride along the belt, each with a city code like <strong className="font-display text-purple-700">BOS</strong>.
                </li>
                <li className="flex gap-3">
                  <Inbox size={20} className="shrink-0 text-blue-500 mt-0.5" aria-hidden="true" />
                  Type the front parcel&apos;s code before it reaches the end of the belt to sort it into its bucket.
                </li>
                <li className="flex gap-3">
                  <Timer size={20} className="shrink-0 text-purple-500 mt-0.5" aria-hidden="true" />
                  You have 60 seconds. Parcels come faster and codes get longer as time runs down!
                </li>
              </ul>
              {user && savedBest !== null && (
                <p data-testid="saved-best" className="font-body font-bold text-orange-600 mb-4">
                  Your best: {savedBest} parcels
                </p>
              )}
              <div className="flex flex-wrap justify-center gap-2 mb-8">
                {REGIONS.map(({ region, name }) => (
                  <span key={region} className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 font-body text-sm text-blue-700">
                    <strong>{region}</strong> {name}
                  </span>
                ))}
              </div>
              <button
                onClick={play}
                className="inline-flex items-center gap-2 px-10 py-4 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-2xl rounded-2xl shadow-lg hover:scale-105 transition-transform active:scale-95"
              >
                <Play size={22} fill="white" /> Start!
              </button>
            </div>
          </div>
        )}

        {phase === 'playing' && (
          <PostOfficeGame key={round} autoStart onComplete={handleComplete} />
        )}
      </div>
    </div>
  );
}
