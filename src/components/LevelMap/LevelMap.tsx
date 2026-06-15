import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Info } from 'lucide-react';
import { LEVELS, ZONES } from '../../data/levels';
import { useProgress } from '../../context/ProgressContext';
import StarRating from '../common/StarRating';
import ZoneIcon from '../icons/ZoneIcon';
import LevelInfoModal from './LevelInfoModal';
import type { Level } from '../../types';

function getAssessedLevels(): string[] {
  try { return JSON.parse(localStorage.getItem('ts_assessments') ?? '[]'); } catch { return []; }
}

export default function LevelMap() {
  const { progress } = useProgress();
  const [assessedLevels] = useState<string[]>(getAssessedLevels);
  const [infoLevel, setInfoLevel] = useState<Level | null>(null);

  function isUnlocked(levelNumber: number): boolean {
    if (levelNumber === 1) return true;
    const prev = LEVELS.find((l) => l.number === levelNumber - 1);
    if (!prev) return false;
    return (progress[prev.id]?.stars ?? 0) > 0 || assessedLevels.includes(prev.id);
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-10">
        <h1 className="font-display text-5xl text-purple-700 mb-2">Level Map</h1>
        <p className="font-body text-gray-500 text-lg">
          Complete each level — or pass a quick assessment — to unlock the next!
        </p>
      </div>

      {ZONES.map(({ zone, name, color }) => {
        const zoneLevels = LEVELS.filter((l) => l.zone === zone);
        return (
          <div key={zone} className={`mb-8 rounded-3xl border-2 p-6 ${color}`}>
            <h2 className="font-display text-3xl text-gray-700 mb-4 flex items-center gap-3">
              <ZoneIcon zone={zone as 1|2|3|4|5|6} size={44} />
              Zone {zone}: {name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {zoneLevels.map((level) => {
                const levelProgress = progress[level.id];
                const unlocked = isUnlocked(level.number);
                const stars = (levelProgress?.stars ?? 0) as 0 | 1 | 2 | 3;
                const assessed = assessedLevels.includes(level.id);

                return (
                  <div key={level.id} className="relative">
                    {/* Info button — always interactive, even on locked cards */}
                    <button
                      onClick={() => setInfoLevel(level)}
                      aria-label={`Info about ${level.name}`}
                      className="absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full bg-white/30 hover:bg-white/60 flex items-center justify-center transition-colors"
                    >
                      <Info size={12} className="text-white drop-shadow" />
                    </button>

                    <Link
                      to={unlocked ? `/play/${level.id}` : '#'}
                      className={`
                        relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2
                        transition-all duration-200 text-center
                        ${unlocked
                          ? `${level.color} border-white/40 shadow-md hover:scale-105 hover:shadow-xl cursor-pointer`
                          : 'bg-gray-100 border-gray-200 opacity-60 cursor-not-allowed grayscale'}
                      `}
                      aria-disabled={!unlocked}
                      tabIndex={unlocked ? 0 : -1}
                      data-testid={`level-${level.id}`}
                      onClick={!unlocked ? (e) => e.preventDefault() : undefined}
                    >
                      {/* Lock icon */}
                      {!unlocked && (
                        <div className="absolute top-2 right-2 text-gray-400"
                             role="img" aria-label="Locked">
                          <Lock size={16} aria-hidden="true" />
                        </div>
                      )}

                      {/* Assessment-passed badge */}
                      {assessed && !levelProgress && (
                        <div className="absolute top-2 right-2">
                          <span className="text-[10px] font-body font-bold text-white bg-green-500 rounded-full px-1.5 py-0.5">
                            Tested
                          </span>
                        </div>
                      )}

                      <ZoneIcon zone={level.zone as 1|2|3|4|5|6} size={44} />
                      <div className="font-display text-sm text-white/90 drop-shadow">
                        Lvl {level.number}
                      </div>
                      <div className="font-body font-bold text-white text-xs leading-tight">
                        {level.name}
                      </div>

                      {stars > 0 && <StarRating stars={stars} size="sm" />}
                      {stars === 0 && unlocked && (
                        <span className="font-body text-xs text-white/70">Not started</span>
                      )}
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      {infoLevel && (
        <LevelInfoModal
          level={infoLevel}
          unlocked={isUnlocked(infoLevel.number)}
          onClose={() => setInfoLevel(null)}
        />
      )}
    </div>
  );
}
