import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useReducer,
} from 'react';
import { fetchProgress, saveProgress, fetchBadges, unlockBadge } from '../services/api';
import { checkNewBadges } from '../data/badges';
import type { LevelProgress, PlayerStats, TypingResult, Badge } from '../types';
import { useAuth } from './AuthContext';

interface ProgressState {
  progress: Record<string, LevelProgress>;
  earnedBadges: string[];
  newBadges: Badge[];               // badges unlocked in latest session, shown as toast
  loaded: boolean;
}

interface ProgressContextValue {
  progress: Record<string, LevelProgress>;
  earnedBadges: string[];
  newBadges: Badge[];
  stats: PlayerStats;
  submitResult: (levelId: string, result: TypingResult) => Promise<void>;
  dismissNewBadges: () => void;
  reload: () => void;
}

export const ProgressContext = createContext<ProgressContextValue | null>(null);

type Action =
  | { type: 'LOAD'; progress: LevelProgress[]; badges: string[] }
  | { type: 'SAVE_PROGRESS'; entry: LevelProgress }
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
      };
    case 'SAVE_PROGRESS': {
      const existing = state.progress[action.entry.levelId];
      const better =
        !existing || action.entry.stars > existing.stars;
      return better
        ? { ...state, progress: { ...state.progress, [action.entry.levelId]: action.entry } }
        : state;
    }
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

const INITIAL: ProgressState = { progress: {}, earnedBadges: [], newBadges: [], loaded: false };

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const load = useCallback(async () => {
    if (!user) return;
    const [progress, badges] = await Promise.all([fetchProgress(), fetchBadges()]);
    dispatch({ type: 'LOAD', progress, badges });
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
    };
  }, [state.progress, state.earnedBadges]);

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

  return (
    <ProgressContext.Provider
      value={{
        progress: state.progress,
        earnedBadges: state.earnedBadges,
        newBadges: state.newBadges,
        stats,
        submitResult,
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
