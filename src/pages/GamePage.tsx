import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useCallback, useState } from 'react';
import { RotateCcw, ArrowRight, Map, Play, Zap, CheckCircle, XCircle } from 'lucide-react';
import { LEVEL_BY_ID } from '../data/levels';
import { useProgress } from '../context/ProgressContext';
import TypingGame from '../components/TypingGame/TypingGame';
import StarRating from '../components/common/StarRating';
import LevelTutorialModal from '../components/LevelTutorial/LevelTutorialModal';
import type { TypingResult } from '../types';

function saveAssessmentPassed(levelId: string) {
  try {
    const assessed: string[] = JSON.parse(localStorage.getItem('ts_assessments') ?? '[]');
    if (!assessed.includes(levelId)) {
      localStorage.setItem('ts_assessments', JSON.stringify([...assessed, levelId]));
    }
  } catch { /* ignore */ }
}

export default function GamePage() {
  const { levelId } = useParams<{ levelId: string }>();
  const [searchParams] = useSearchParams();
  const isAssessment = searchParams.get('mode') === 'assessment';
  const navigate = useNavigate();
  const { submitResult, progress } = useProgress();

  const level = levelId ? LEVEL_BY_ID[levelId] : null;

  // In assessment mode: use only the last exercise as the test
  const exercises = isAssessment && level
    ? [level.exercises[level.exercises.length - 1]]
    : (level?.exercises ?? []);

  const [exerciseIndex, setExerciseIndex] = useState(0);
  const [results, setResults] = useState<TypingResult[]>([]);
  const [finished, setFinished] = useState(false);

  const [showTutorial, setShowTutorial] = useState(() => {
    if (isAssessment || !levelId) return false;
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

      if (exerciseIndex < exercises.length - 1) {
        setExerciseIndex((i) => i + 1);
      } else {
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

        if (!isAssessment) {
          await submitResult(level.id, aggregate);
        } else {
          // Save assessment pass to localStorage (no stars awarded)
          if (avgAccuracy >= level.requiredAccuracy && levelId) {
            saveAssessmentPassed(levelId);
          }
        }
        setFinished(true);
      }
    },
    [level, levelId, exerciseIndex, exercises.length, results, submitResult, isAssessment],
  );

  if (!level) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="font-display text-3xl text-gray-500">Level not found</p>
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

  // ── Assessment results screen ────────────────────────────────────────────
  if (isAssessment && finished && finalResult) {
    const passed = finalResult.accuracy >= level.requiredAccuracy;
    return (
      <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-md w-full text-center animate-bounce-in">
          {passed ? (
            <CheckCircle size={64} className="text-green-500 mx-auto mb-4" />
          ) : (
            <XCircle size={64} className="text-red-400 mx-auto mb-4" />
          )}

          <h2 className="font-display text-3xl text-purple-700 mb-1">
            {passed ? 'Assessment Passed!' : 'Not Quite Yet'}
          </h2>
          <p className="font-body text-gray-500 mb-6">
            {passed
              ? nextLevel
                ? `Level ${nextLevel.number} (${nextLevel.name}) is now unlocked!`
                : "You've mastered this level!"
              : `You need ${level.requiredAccuracy}% accuracy to pass. Keep practising!`}
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className={`rounded-2xl p-4 ${passed ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className={`font-display text-3xl ${passed ? 'text-green-600' : 'text-red-500'}`}>
                {finalResult.accuracy}%
              </div>
              <div className="font-body text-xs text-gray-500">Accuracy</div>
              <div className="font-body text-xs text-gray-400 mt-0.5">
                Need {level.requiredAccuracy}%
              </div>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4">
              <div className="font-display text-3xl text-purple-600">{finalResult.wpm}</div>
              <div className="font-body text-xs text-gray-500">WPM</div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {passed && nextLevel && (
              <button
                onClick={() => navigate(`/play/${nextLevel.id}`)}
                className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-lg rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <ArrowRight size={18} /> Play {nextLevel.name}
              </button>
            )}
            {passed && (
              <button
                onClick={() => navigate(`/play/${level.id}`)}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-lg rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <Play size={18} fill="white" /> Play Level {level.number} for Stars
              </button>
            )}
            {!passed && (
              <button
                onClick={() => { setResults([]); setExerciseIndex(0); setFinished(false); }}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-lg rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <RotateCcw size={18} /> Try Again
              </button>
            )}
            <button
              onClick={() => navigate('/map')}
              className="w-full py-2.5 bg-gray-100 text-gray-700 font-body font-bold rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Map size={16} /> Back to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Regular results screen ───────────────────────────────────────────────
  if (finished && finalResult) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-yellow-50 to-green-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full text-center animate-bounce-in">
          <div className="flex justify-center mb-4">
            {finalResult.stars === 3
              ? <CheckCircle size={72} className="text-yellow-400" />
              : finalResult.stars === 2
              ? <CheckCircle size={72} className="text-gray-400" />
              : <Play size={72} className="text-purple-300" />}
          </div>
          <h2 className="font-display text-4xl text-purple-700 mb-2">
            {finalResult.stars > 0 ? 'Level Complete!' : 'Keep Practising!'}
          </h2>
          <p className="font-body text-gray-500 mb-4">{level.name}</p>

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
              Your best is {bestProgress.stars} stars — keep going to beat it!
            </p>
          )}

          <div className="flex flex-col gap-3">
            <button
              onClick={() => { setExerciseIndex(0); setResults([]); setFinished(false); }}
              className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-xl rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
            >
              <RotateCcw size={18} /> Try Again
            </button>
            {nextLevel && (
              <button
                onClick={() => navigate(`/play/${nextLevel.id}`)}
                className="w-full py-3 bg-gradient-to-r from-green-400 to-emerald-500 text-white font-display text-xl rounded-2xl hover:scale-105 transition-transform flex items-center justify-center gap-2"
              >
                <ArrowRight size={18} /> Next Level: {nextLevel.name}
              </button>
            )}
            {nextLevel && (
              <button
                onClick={() => navigate(`/play/${nextLevel.id}?mode=assessment`)}
                className="w-full py-2.5 border-2 border-purple-200 text-purple-600 font-display text-base rounded-2xl hover:bg-purple-50 transition-colors flex items-center justify-center gap-2"
              >
                <Zap size={16} /> Quick-assess Level {nextLevel.number}
              </button>
            )}
            <button
              onClick={() => navigate('/map')}
              className="w-full py-2.5 bg-gray-100 text-gray-700 font-body font-bold rounded-2xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
            >
              <Map size={16} /> Back to Map
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Game screen ──────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-pink-50 py-8">
      {/* Per-level tutorial overlay — works on mobile too */}
      {showTutorial && level && (
        <LevelTutorialModal
          level={level}
          onContinue={() => handleTutorialDismiss(false)}
          onDismiss={() => handleTutorialDismiss(true)}
        />
      )}

      {/* Mobile: can't play without a physical keyboard */}
      <div className="md:hidden flex flex-col items-center justify-center min-h-[60vh] text-center px-8 gap-6">
        <div className="text-6xl">⌨️</div>
        <h2 className="font-display text-3xl text-purple-700">Need a keyboard to play!</h2>
        <p className="font-body text-gray-500 max-w-xs leading-relaxed">
          This level needs a physical keyboard. Come back on a desktop or laptop to play.
        </p>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => navigate('/tutorials')}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-display text-lg rounded-2xl hover:scale-105 transition-transform"
          >
            Browse Tutorials
          </button>
          <button
            onClick={() => navigate('/map')}
            className="w-full py-3 bg-gray-100 text-gray-700 font-body font-bold rounded-2xl hover:bg-gray-200 transition-colors"
          >
            Back to Map
          </button>
        </div>
      </div>

      {/* Desktop: full game */}
      <div className="hidden md:block">
        {isAssessment && (
          <div className="max-w-3xl mx-auto px-4 mb-4">
            <div className="bg-purple-100 text-purple-700 rounded-2xl px-5 py-3 flex items-center gap-3 font-body text-sm font-bold">
              <Zap size={16} />
              Assessment Mode — score {level.requiredAccuracy}%+ accuracy to unlock the next level
            </div>
          </div>
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
              {isAssessment
                ? 'Assessment'
                : `Exercise ${exerciseIndex + 1} / ${exercises.length}`}
            </span>
          </div>
          <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
            <div
              className={`h-full ${level.color} transition-all duration-500`}
              style={{ width: `${(exerciseIndex / exercises.length) * 100}%` }}
            />
          </div>
        </div>

        <TypingGame
          key={`${level.id}-${exerciseIndex}-${isAssessment ? 'assess' : 'play'}`}
          level={level}
          exercise={exercises[exerciseIndex]}
          exerciseNumber={exerciseIndex + 1}
          totalExercises={exercises.length}
          onComplete={handleExerciseComplete}
        />
      </div>
    </div>
  );
}
