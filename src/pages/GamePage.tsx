import { useNavigate, useParams } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { LEVEL_BY_ID } from '../data/levels';
import { useProgress } from '../context/ProgressContext';
import TypingGame from '../components/TypingGame/TypingGame';
import StarRating from '../components/common/StarRating';
import LevelTutorialModal from '../components/LevelTutorial/LevelTutorialModal';
import type { TypingResult } from '../types';

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const navigate = useNavigate();
  const { submitResult, progress } = useProgress();

  const level = levelId ? LEVEL_BY_ID[levelId] : null;
  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [results, setResults] = useState<TypingResult[]>([]);
  const [finished, setFinished] = useState(false);

  const [showTutorial, setShowTutorial] = useState(() => {
    if (!levelId) return false;
    const dismissed: string[] = JSON.parse(localStorage.getItem('tt_dismissed') ?? '[]');
    return !dismissed.includes(levelId);
  });

  const handleTutorialDismiss = (permanent: boolean) => {
    if (permanent && levelId) {
      const dismissed: string[] = JSON.parse(localStorage.getItem('tt_dismissed') ?? '[]');
      if (!dismissed.includes(levelId)) {
        localStorage.setItem('tt_dismissed', JSON.stringify([...dismissed, levelId]));
      }
    }
    setShowTutorial(false);
  };

  const handleExerciseComplete = useCallback(
    async (result: TypingResult) => {
      const newResults = [...results, result];
      setResults(newResults);

      if (!level) return;

      if (exerciseIndex < level.exercises.length - 1) {
        setExerciseIndex((i) => i + 1);
      } else {
        // All exercises done — compute aggregate result
        const avgAccuracy = Math.round(
          newResults.reduce((s, r) => s + r.accuracy, 0) / newResults.length,
        );
        const avgWpm = Math.round(
          newResults.reduce((s, r) => s + r.wpm, 0) / newResults.length,
        );
        const maxStars = (newResults.reduce((m, r) => Math.max(m, r.stars), 0) as unknown) as 0 | 1 | 2 | 3;
        const aggregate: TypingResult = {
          accuracy: avgAccuracy,
          wpm: avgWpm,
          stars: maxStars,
          timeSeconds: newResults.reduce((s, r) => s + r.timeSeconds, 0),
          errorCount: newResults.reduce((s, r) => s + r.errorCount, 0),
        };
        await submitResult(level.id, aggregate);
        setFinished(true);
      }
    },
    [level, exerciseIndex, results, submitResult],
  );

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-3xl text-gray-500">Level not found 😕</p>
          <button
            onClick={() => navigate('/map')}
            className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-xl font-body"
          >
            Back to Map
          </button>
        </div>
      </div>
    );
  }

  const nextLevel = LEVEL_BY_ID[String(level.number + 1).padStart(2, '0')];
  const bestProgress = progress[level.id];
  const finalResult = finished && results.length > 0
    ? {
        accuracy: Math.round(results.reduce((s, r) => s + r.accuracy, 0) / results.length),
        wpm: Math.round(results.reduce((s, r) => s + r.wpm, 0) / results.length),
        stars: (results.reduce((m, r) => Math.max(m, r.stars), 0) as unknown) as 0 | 1 | 2 | 3,
      }
    : null;

  if (finished && finalResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-10 max-w-lg w-full text-center animate-bounce-in">
          <div className="text-7xl mb-4">
            {finalResult.stars === 3 ? '🏆' : finalResult.stars === 2 ? '🥈' : '⭐'}
          </div>
          <h2 className="font-display text-4xl text-purple-700 mb-2">
            {finalResult.stars > 0 ? 'Level Complete!' : 'Keep Practising!'}
          </h2>
          <p className="font-body text-gray-500 mb-4">{level.icon} {level.name}</p>

          <div className="flex justify-center mb-6">
            <StarRating stars={finalResult.stars} size="lg" />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-8">
            <div className="bg-purple-50 rounded-2xl p-4">
              <div className="font-display text-4xl text-purple-600">{finalResult.wpm}</div>
              <div className="font-body text-sm text-gray-500">Words per minute</div>
            </div>
            <div className="bg-green-50 rounded-2xl p-4">
              <div className="font-display text-4xl text-green-600">{finalResult.accuracy}%</div>
              <div className="font-body text-sm text-gray-500">Accuracy</div>
            </div>
          </div>

          {bestProgress && bestProgress.stars > finalResult.stars && (
            <p className="font-body text-sm text-orange-600 mb-4">
              🏅 Your best is {bestProgress.stars} stars — keep going to beat it!
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                setExerciseIndex(0);
                setResults([]);
                setFinished(false);
              }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-xl rounded-2xl hover:scale-105 transition-transform"
            >
              🔄 Try Again
            </button>
            {nextLevel && (
              <button
                onClick={() => navigate(`/play/${nextLevel.id}`)}
                className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-xl rounded-2xl hover:scale-105 transition-transform"
              >
                ➡️ Next Level: {nextLevel.name}
              </button>
            )}
            <button
              onClick={() => navigate('/map')}
              className="w-full py-3 bg-gray-100 text-gray-700 font-body font-bold rounded-2xl hover:bg-gray-200 transition-colors"
            >
              🗺️ Back to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-8">
      {/* Per-level tutorial overlay */}
      {showTutorial && level && (
        <LevelTutorialModal
          level={level}
          onContinue={() => handleTutorialDismiss(false)}
          onDismiss={() => handleTutorialDismiss(true)}
        />
      )}

      {/* Progress bar */}
      <div className="max-w-3xl mx-auto px-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => navigate('/map')}
            className="font-body text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Back
          </button>
          <span className="font-body text-gray-500 text-sm">
            Exercise {exerciseIndex + 1} / {level.exercises.length}
          </span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full ${level.color} transition-all duration-500`}
            style={{ width: `${((exerciseIndex) / level.exercises.length) * 100}%` }}
          />
        </div>
      </div>

      <TypingGame
        key={`${level.id}-${exerciseIndex}`}
        level={level}
        exercise={level.exercises[exerciseIndex]}
        exerciseNumber={exerciseIndex + 1}
        totalExercises={level.exercises.length}
        onComplete={handleExerciseComplete}
      />
    </div>
  );
}
