import { useNavigate } from 'react-router-dom';
import { X, Play, Zap } from 'lucide-react';
import type { Level } from '../../types';
import ZoneIcon from '../icons/ZoneIcon';
import StarRating from '../common/StarRating';
import { useProgress } from '../../context/ProgressContext';

interface Props {
  level: Level;
  unlocked: boolean;
  onClose: () => void;
}

const zoneGradients: Record<number, string> = {
  1: 'from-pink-500 to-rose-400',
  2: 'from-blue-500 to-indigo-400',
  3: 'from-teal-500 to-cyan-400',
  4: 'from-purple-500 to-violet-400',
  5: 'from-amber-500 to-orange-400',
  6: 'from-sky-500 to-blue-400',
};

export default function LevelInfoModal({ level, unlocked, onClose }: Props) {
  const navigate = useNavigate();
  const { progress } = useProgress();
  const lp = progress[level.id];
  const stars = (lp?.stars ?? 0) as 0 | 1 | 2 | 3;

  const goPlay = () => { onClose(); navigate(`/play/${level.id}`); };
  const goAssess = () => { onClose(); navigate(`/play/${level.id}?mode=assessment`); };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl animate-bounce-in overflow-hidden">
        {/* Coloured header */}
        <div className={`bg-gradient-to-r ${zoneGradients[level.zone] ?? 'from-purple-500 to-pink-400'} p-5 flex items-center gap-4`}>
          <ZoneIcon zone={level.zone as 1|2|3|4|5|6} size={56} />
          <div className="text-white flex-1 min-w-0">
            <p className="font-body text-xs text-white/70 uppercase tracking-wide">
              Zone {level.zone} · {level.zoneName}
            </p>
            <h2 className="font-display text-2xl leading-tight">
              Level {level.number}: {level.name}
            </h2>
            {stars > 0 && <StarRating stars={stars} size="sm" />}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-colors"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Description */}
          <p className="font-body text-gray-600 leading-relaxed">{level.description}</p>

          {/* What you'll learn */}
          {level.highlightKeys.length > 0 && (
            <div>
              <p className="font-body text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                Keys you'll practise
              </p>
              <div className="flex flex-wrap gap-2">
                {level.highlightKeys.map((k) => (
                  <span
                    key={k}
                    className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-purple-100 text-purple-700 font-display text-lg font-bold uppercase shadow-sm"
                  >
                    {k}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-3">
            <div className="flex-1 bg-purple-50 rounded-2xl p-3 text-center">
              <div className="font-display text-2xl text-purple-600">{level.requiredAccuracy}%</div>
              <div className="font-body text-xs text-gray-500">Min accuracy</div>
            </div>
            {level.speedTarget && (
              <div className="flex-1 bg-amber-50 rounded-2xl p-3 text-center">
                <div className="font-display text-2xl text-amber-600">{level.speedTarget}</div>
                <div className="font-body text-xs text-gray-500">WPM target</div>
              </div>
            )}
            <div className="flex-1 bg-green-50 rounded-2xl p-3 text-center">
              <div className="font-display text-2xl text-green-600">{level.exercises.length}</div>
              <div className="font-body text-xs text-gray-500">Exercises</div>
            </div>
          </div>

          {/* Best performance */}
          {lp && (
            <div className="bg-gray-50 rounded-2xl p-3 flex items-center justify-between">
              <span className="font-body text-sm text-gray-500">Your best</span>
              <div className="flex items-center gap-3 font-body text-sm font-bold text-gray-700">
                <span>{lp.bestAccuracy}% accuracy</span>
                <span>{lp.bestWpm} WPM</span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-2 pt-1">
            {unlocked && (
              <button
                onClick={goPlay}
                className={`w-full py-3 rounded-2xl font-display text-lg text-white flex items-center justify-center gap-2 bg-gradient-to-r ${zoneGradients[level.zone]} hover:scale-105 transition-transform shadow`}
              >
                <Play size={18} fill="white" />
                {stars > 0 ? 'Play Again' : 'Start Level'}
              </button>
            )}
            <button
              onClick={goAssess}
              className="w-full py-3 rounded-2xl font-display text-lg border-2 border-purple-300 text-purple-600 flex items-center justify-center gap-2 hover:bg-purple-50 transition-colors"
            >
              <Zap size={18} />
              {unlocked ? 'Quick Assessment' : 'Unlock Early — Take Assessment'}
            </button>
            {!unlocked && (
              <p className="font-body text-xs text-gray-400 text-center">
                Pass the assessment ({level.requiredAccuracy}% accuracy) to unlock this level
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
