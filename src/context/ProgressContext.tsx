import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import {
  fetchProgress, saveProgress, fetchBadges, unlockBadge, fetchAllGameScores, saveGameScore,
} from '../services/api';
import { checkNewBadges } from '../data/badges';
import { isGameId, zeroGameStats, type GameId } from '../data/games';
import type { LevelProgress, PlayerStats, TypingResult, Badge, GameScore, GameRoundResult } from '../types';
import { useAuth } from './AuthContext';

interface ProgressState {
  progress: Record<string, LevelProgress>;
  earnedBadges: string[];
  newBadges: Badge[];               // badges unlocked in latest session, shown as toast
  gameScores: Partial<Record<GameId, GameScore>>;
  loaded: boolean;
}

interface ProgressContextValue {
  progress: Record<string, LevelProgress>;
  earnedBadges: string[];
  newBadges: Badge[];
  stats: PlayerStats;
  gameScores: Partial<Record<GameId, GameScore>>;
  submitResult: (levelId: string, result: TypingResult) => Promise<void>;
  submitGameScore: (gameId: GameId, result: GameRoundResult) => Promise<void>;
  dismissNewBadges: () => void;
  reload: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

type Action =
  | { type: 'LOAD'; progress: LevelProgress[]; badges: string[]; gameScores: Partial<Record<GameId, GameScore>> }
  | { type: 'SAVE_PROGRESS'; entry: LevelProgress }
  | { type: 'SAVE_GAME_ROUND'; gameId: GameId; result: GameRoundResult }
  | { type: 'SYNC_GAME_SCORE'; gameId: GameId; score: GameScore }
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
      const progress = applyLevelResult(state.progress, action.entry);
      return progress === state.progress ? state : { ...state, progress };
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

// A level result only replaces the stored one when it earns more stars.
// Returns the same object when nothing changes.
export function applyLevelResult(
  progress: Record<string, LevelProgress>,
  entry: LevelProgress,
): Record<string, LevelProgress> {
  const existing = progress[entry.levelId];
  if (existing && entry.stars <= existing.stars) return progress;
  return { ...progress, [entry.levelId]: entry };
}

// The level-derived part of PlayerStats, shared by the stats memo and the
// badge check in submitResult so the two can't disagree.
export function levelStats(progress: Record<string, LevelProgress>) {
  const entries = Object.values(progress);
  return {
    totalStars: entries.reduce((s, e) => s + e.stars, 0),
    levelsCompleted: entries.filter((e) => e.stars > 0).length,
    highestLevel: entries.reduce((m, e) => Math.max(m, parseInt(e.levelId, 10)), 0),
    bestWpm: entries.reduce((m, e) => Math.max(m, e.bestWpm), 0),
  };
}

// Optimistic local version of the server's rule: every round adds to the
// running total; the best-round fields only change when the score beats them.
export function applyGameRound(existing: GameScore | undefined, result: GameRoundResult): GameScore {
  const totalScore = (existing?.totalScore ?? 0) + result.score;
  if (existing && result.score <= existing.bestScore) return { ...existing, totalScore };
  return {
    bestScore: result.score,
    bestStreak: result.bestStreak,
    accuracy: result.accuracy,
    totalScore,
  };
}

// Only the fields the client relies on, whatever extras the API returns
// (gameId, updatedAt, legacy Post Office fields, …).
function toGameScore(s: GameScore): GameScore {
  return { bestScore: s.bestScore, bestStreak: s.bestStreak, accuracy: s.accuracy, totalScore: s.totalScore ?? 0 };
}

/** The per-game part of PlayerStats: a zero entry for every registered game. */
export function gameStats(gameScores: Partial<Record<GameId, GameScore>>) {
  const games = zeroGameStats();
  for (const [id, score] of Object.entries(gameScores) as [GameId, GameScore][]) {
    games[id] = { best: score.bestScore, total: score.totalScore };
  }
  return { games };
}

const INITIAL: ProgressState = { progress: {}, earnedBadges: [], newBadges: [], gameScores: {}, loaded: false };

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const load = useCallback(async () => {
    if (!user) return;
    const [progress, badges, savedScores] = await Promise.all([
      fetchProgress(),
      fetchBadges(),
      // One request for every game. A failure shouldn't block level progress.
      fetchAllGameScores().catch(() => []),
    ]);
    const gameScores: Partial<Record<GameId, GameScore>> = {};
    for (const saved of savedScores) {
      if (isGameId(saved.gameId)) gameScores[saved.gameId] = toGameScore(saved);
    }
    dispatch({ type: 'LOAD', progress, badges, gameScores });
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const stats: PlayerStats = React.useMemo(() => {
    return {
      ...levelStats(state.progress),
      totalTimeMinutes: 0,
      badgesEarned: state.earnedBadges,
      ...gameStats(state.gameScores),
    };
  }, [state.progress, state.earnedBadges, state.gameScores]);

  async function submitResult(levelId: string, result: TypingResult) {
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

    // Check badges against the stats this submission actually produces: the
    // progress map after SAVE_PROGRESS's only-if-more-stars rule.
    const after = levelStats(applyLevelResult(state.progress, entry));
    const updatedStats: PlayerStats = {
      ...stats,
      ...after,
      // Any completed run's WPM counts toward the speed badges, even when its
      // stars didn't beat the stored result (unchanged from before TYP-9).
      bestWpm: Math.max(after.bestWpm, result.wpm),
    };
    const newlyUnlocked = checkNewBadges(updatedStats, state.earnedBadges);
    if (newlyUnlocked.length > 0) {
      dispatch({ type: 'UNLOCK_BADGES', badges: newlyUnlocked });
      if (user) {
        await Promise.all(newlyUnlocked.map((b) => unlockBadge(b.id)));
      }
    }
  }

  async function submitGameScore(gameId: GameId, result: GameRoundResult) {
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
      const [savedRecord] = await Promise.all([
        saveGameScore(gameId, { score: result.score, streak: result.bestStreak, accuracy: result.accuracy }),
        ...newlyUnlocked.map((b) => unlockBadge(b.id)),
      ]);
      const saved = toGameScore(savedRecord);
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
