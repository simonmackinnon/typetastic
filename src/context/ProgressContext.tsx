import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {
  fetchProgress, saveProgress, fetchBadges, unlockBadge, fetchGameScore, saveGameScore,
} from '../services/api';
import { checkNewBadges } from '../data/badges';
import type { LevelProgress, PlayerStats, TypingResult, Badge, GameScore } from '../types';
import type { PostOfficeRoundResult } from '../hooks/usePostOfficeGame';
import { useAuth } from './AuthContext';

interface ProgressState {
  progress: Record<string, LevelProgress>;
  earnedBadges: string[];
  newBadges: Badge[];               // badges unlocked in latest session, shown as toast
  gameScores: Record<string, GameScore>;
  loaded: boolean;
}

// Games whose score is fetched on load. Mirrors the Lambda's GAME_IDS allowlist.
const GAME_IDS = ['post-office'] as const;

interface ProgressContextValue {
  progress: Record<string, LevelProgress>;
  earnedBadges: string[];
  newBadges: Badge[];
  stats: PlayerStats;
  gameScores: Record<string, GameScore>;
  submitResult: (levelId: string, result: TypingResult) => Promise<void>;
  submitGameScore: (gameId: string, result: PostOfficeRoundResult) => Promise<void>;
  dismissNewBadges: () => void;
  reload: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

type Action =
  | { type: 'LOAD'; progress: LevelProgress[]; badges: string[]; gameScores: Record<string, GameScore> }
  | { type: 'SAVE_PROGRESS'; entry: LevelProgress }
  | { type: 'SAVE_GAME_ROUND'; gameId: string; result: PostOfficeRoundResult }
  | { type: 'SYNC_GAME_SCORE'; gameId: string; score: GameScore }
  | { type: 'UNLOCK_BADGES'; badges: Badge[] }
  | { type: 'DISMISS_BADGES' };

function reducer(state: ProgressState, action: Action): ProgressState {
  switch (action.type) {
    case 'LOAD':
      return {
        ...state,
        loaded: true,
        progress: Object.fromEntries(action.progress.map((p) => [p.levelId, p])),
        earnedBadges: action.badges,
        gameScores: action.gameScores,
      };
    case 'SAVE_PROGRESS': {
      const existing = state.progress[action.entry.levelId];
      const better =
        !existing || action.entry.stars > existing.stars;
      return better
        ? { ...state, progress: { ...state.progress, [action.entry.levelId]: action.entry } }
        : state;
    }
    case 'SAVE_GAME_ROUND':
      return {
        ...state,
        gameScores: {
          ...state.gameScores,
          [action.gameId]: applyGameRound(state.gameScores[action.gameId], action.result),
        },
      };
    case 'SYNC_GAME_SCORE':
      return { ...state, gameScores: { ...state.gameScores, [action.gameId]: action.score } };
    case 'UNLOCK_BADGES':
      return {
        ...state,
        earnedBadges: [...state.earnedBadges, ...action.badges.map((b) => b.id)],
        newBadges: action.badges,
      };
    case 'DISMISS_BADGES':
      return { ...state, newBadges: [] };
    default:
      return state;
  }
}

// Optimistic local version of the server's rule: every round adds to the
// running total; the best-round fields only change when the score beats them.
export function applyGameRound(existing: GameScore | undefined, result: PostOfficeRoundResult): GameScore {
  const totalParcelsRouted = (existing?.totalParcelsRouted ?? 0) + result.score;
  if (existing && result.score <= existing.bestScore) return { ...existing, totalParcelsRouted };
  return {
    bestScore: result.score,
    bestStreak: result.bestStreak,
    accuracy: result.accuracy,
    totalParcelsRouted,
  };
}

function gameStats(gameScores: Record<string, GameScore>) {
  return {
    bestPostOfficeScore: gameScores['post-office']?.bestScore ?? 0,
    totalParcelsRouted: gameScores['post-office']?.totalParcelsRouted ?? 0,
  };
}

const INITIAL: ProgressState = { progress: {}, earnedBadges: [], newBadges: [], gameScores: {}, loaded: false };

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const load = useCallback(async () => {
    if (!user) return;
    const [progress, badges, ...scores] = await Promise.all([
      fetchProgress(),
      fetchBadges(),
      // A failed game-score fetch shouldn't block level progress from loading.
      ...GAME_IDS.map((id) => fetchGameScore(id).catch(() => null)),
    ]);
    const gameScores = Object.fromEntries(
      GAME_IDS.flatMap((id, i) => (scores[i] ? [[id, scores[i]]] : [])),
    ) as Record<string, GameScore>;
    dispatch({ type: 'LOAD', progress, badges, gameScores });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats: PlayerStats = React.useMemo(() => {
    const entries = Object.values(state.progress);
    return {
      totalStars: entries.reduce((s, e) => s + e.stars, 0),
      levelsCompleted: entries.filter((e) => e.stars > 0).length,
      highestLevel: entries.reduce((m, e) => Math.max(m, parseInt(e.levelId, 10)), 0),
      bestWpm: entries.reduce((m, e) => Math.max(m, e.bestWpm), 0),
      totalTimeMinutes: 0,
      badgesEarned: state.earnedBadges,
      ...gameStats(state.gameScores),
    };
  }, [state.progress, state.earnedBadges, state.gameScores]);

  async function submitResult(levelId: string, result: TypingResult) {
    const level = parseInt(levelId, 10);
    const entry: LevelProgress = {
      levelId,
      stars: result.stars,
      bestAccuracy: result.accuracy,
      bestWpm: result.wpm,
      completedAt: new Date().toISOString(),
    };
    dispatch({ type: 'SAVE_PROGRESS', entry });

    if (user) {
      await saveProgress(levelId, entry);
    }

    // After saving, recompute stats and check for new badges
    const updatedStats: PlayerStats = {
      ...stats,
      highestLevel: Math.max(stats.highestLevel, level),
      bestWpm: Math.max(stats.bestWpm, result.wpm),
      levelsCompleted: stats.levelsCompleted + (entry.stars > 0 ? 1 : 0),
    };
    const newlyUnlocked = checkNewBadges(updatedStats, state.earnedBadges);
    if (newlyUnlocked.length > 0) {
      dispatch({ type: 'UNLOCK_BADGES', badges: newlyUnlocked });
      if (user) {
        await Promise.all(newlyUnlocked.map((b) => unlockBadge(b.id)));
      }
    }
  }

  async function submitGameScore(gameId: string, result: PostOfficeRoundResult) {
    // Optimistic local update first, so stats and badges respond immediately.
    dispatch({ type: 'SAVE_GAME_ROUND', gameId, result });

    const updatedStats: PlayerStats = {
      ...stats,
      ...gameStats({ ...state.gameScores, [gameId]: applyGameRound(state.gameScores[gameId], result) }),
    };
    const newlyUnlocked = checkNewBadges(updatedStats, state.earnedBadges);
    if (newlyUnlocked.length > 0) {
      dispatch({ type: 'UNLOCK_BADGES', badges: newlyUnlocked });
    }

    // Guests stay local-only: nothing is persisted and a reload loses it,
    // matching level progress.
    if (!user) return;
    try {
      const [saved] = await Promise.all([
        saveGameScore(gameId, { score: result.score, streak: result.bestStreak, accuracy: result.accuracy }),
        ...newlyUnlocked.map((b) => unlockBadge(b.id)),
      ]);
      dispatch({ type: 'SYNC_GAME_SCORE', gameId, score: saved });

      // The server's running total is authoritative (e.g. if this round was
      // played before the saved total finished loading), so re-check badges.
      const earned = [...state.earnedBadges, ...newlyUnlocked.map((b) => b.id)];
      const lateUnlocks = checkNewBadges(
        { ...updatedStats, ...gameStats({ ...state.gameScores, [gameId]: saved }) },
        earned,
      );
      if (lateUnlocks.length > 0) {
        dispatch({ type: 'UNLOCK_BADGES', badges: lateUnlocks });
        await Promise.all(lateUnlocks.map((b) => unlockBadge(b.id)));
      }
    } catch (e) {
      // Keep the optimistic result on screen; the round just isn't persisted.
      console.warn('Failed to save game score', e);
    }
  }

  return (
    <ProgressContext.Provider
      value={{
        progress: state.progress,
        earnedBadges: state.earnedBadges,
        newBadges: state.newBadges,
        stats,
        gameScores: state.gameScores,
        submitResult,
        submitGameScore,
        dismissNewBadges: () => dispatch({ type: 'DISMISS_BADGES' }),
        reload: load,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used inside ProgressProvider');
  return ctx;
}
