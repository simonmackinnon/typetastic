import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ProgressProvider, useProgress, applyGameRound, applyLevelResult, levelStats } from './ProgressContext';
import * as api from '../services/api';
import type { PostOfficeRoundResult } from '../hooks/usePostOfficeGame';

vi.mock('../services/api', () => ({
  fetchProgress: vi.fn(),
  saveProgress: vi.fn(),
  fetchBadges: vi.fn(),
  unlockBadge: vi.fn(),
  fetchGameScore: vi.fn(),
  saveGameScore: vi.fn(),
}));

let mockUser: { sub: string; email: string } | null = null;
vi.mock('./AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));

const mocked = vi.mocked(api);
const round = (score: number, bestStreak = 3, accuracy = 90): PostOfficeRoundResult =>
  ({ score, parcelsMissed: 2, accuracy, bestStreak });

const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider>{children}</ProgressProvider>;

function renderProgress(user: typeof mockUser = null) {
  mockUser = user;
  return renderHook(() => useProgress(), { wrapper });
}

const SIGNED_IN = { sub: 'user-1', email: 'kid@example.com' };

beforeEach(() => {
  vi.clearAllMocks();
  mocked.fetchProgress.mockResolvedValue([]);
  mocked.fetchBadges.mockResolvedValue([]);
  mocked.fetchGameScore.mockResolvedValue(null);
  mocked.saveProgress.mockResolvedValue(undefined);
  mocked.unlockBadge.mockResolvedValue(undefined);
  mocked.saveGameScore.mockImplementation(async (_id, r) => ({
    bestScore: r.score, bestStreak: r.streak, accuracy: r.accuracy, totalParcelsRouted: r.score,
  }));
});

describe('applyGameRound', () => {
  it('first round sets the best and starts the total', () => {
    expect(applyGameRound(undefined, round(12, 7, 91))).toEqual({
      bestScore: 12, bestStreak: 7, accuracy: 91, totalParcelsRouted: 12,
    });
  });

  it('a lower or equal round only adds to the total', () => {
    const best = { bestScore: 12, bestStreak: 7, accuracy: 91, totalParcelsRouted: 12 };
    expect(applyGameRound(best, round(5, 9, 100))).toEqual({ ...best, totalParcelsRouted: 17 });
    expect(applyGameRound(best, round(12, 9, 100))).toEqual({ ...best, totalParcelsRouted: 24 });
  });

  it('a higher round replaces the best', () => {
    const best = { bestScore: 12, bestStreak: 7, accuracy: 91, totalParcelsRouted: 12 };
    expect(applyGameRound(best, round(20, 4, 88))).toEqual({
      bestScore: 20, bestStreak: 4, accuracy: 88, totalParcelsRouted: 32,
    });
  });
});

describe('applyLevelResult / levelStats', () => {
  const entry = (levelId: string, stars: 0 | 1 | 2 | 3, bestWpm = 15) =>
    ({ levelId, stars, bestAccuracy: 90, bestWpm, completedAt: '2026-10-01' });

  it('a first result is stored', () => {
    expect(applyLevelResult({}, entry('01', 2))).toEqual({ '01': entry('01', 2) });
  });

  it('only a result with more stars replaces the stored one', () => {
    const progress = { '01': entry('01', 2) };
    expect(applyLevelResult(progress, entry('01', 1))).toBe(progress);
    expect(applyLevelResult(progress, entry('01', 2, 40))).toBe(progress);
    expect(applyLevelResult(progress, entry('01', 3))['01'].stars).toBe(3);
  });

  it('derives level stats from distinct levels', () => {
    expect(levelStats({ '01': entry('01', 3, 20), '04': entry('04', 1, 25), '05': entry('05', 0, 30) })).toEqual({
      totalStars: 4, levelsCompleted: 2, highestLevel: 5, bestWpm: 30,
    });
    expect(levelStats({})).toEqual({ totalStars: 0, levelsCompleted: 0, highestLevel: 0, bestWpm: 0 });
  });
});

describe('submitGameScore (guest)', () => {
  it('updates in-session stats only if the score beats the cached best', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(12)));
    expect(result.current.stats).toMatchObject({ bestPostOfficeScore: 12, totalParcelsRouted: 12 });

    await act(() => result.current.submitGameScore('post-office', round(5)));
    expect(result.current.stats).toMatchObject({ bestPostOfficeScore: 12, totalParcelsRouted: 17 });

    await act(() => result.current.submitGameScore('post-office', round(15)));
    expect(result.current.stats).toMatchObject({ bestPostOfficeScore: 15, totalParcelsRouted: 32 });
  });

  it('never calls the API', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(25)));
    expect(mocked.fetchGameScore).not.toHaveBeenCalled();
    expect(mocked.saveGameScore).not.toHaveBeenCalled();
    expect(mocked.unlockBadge).not.toHaveBeenCalled();
  });

  it('unlocks Speed Sorter on a 20-parcel round', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(19)));
    expect(result.current.earnedBadges).not.toContain('speed-sorter');
    await act(() => result.current.submitGameScore('post-office', round(20)));
    expect(result.current.newBadges.map((b) => b.id)).toContain('speed-sorter');
    expect(result.current.earnedBadges).toContain('speed-sorter');
  });

  it('unlocks Mail Sorter once the running total crosses 50', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(15)));
    await act(() => result.current.submitGameScore('post-office', round(15)));
    await act(() => result.current.submitGameScore('post-office', round(15)));
    expect(result.current.earnedBadges).not.toContain('mail-sorter');
    await act(() => result.current.submitGameScore('post-office', round(5)));
    expect(result.current.stats.totalParcelsRouted).toBe(50);
    expect(result.current.newBadges.map((b) => b.id)).toEqual(['mail-sorter']);
  });

  it('does not re-unlock a badge already earned', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(20)));
    await act(() => result.current.dismissNewBadges());
    await act(() => result.current.submitGameScore('post-office', round(21)));
    expect(result.current.newBadges).toEqual([]);
    expect(result.current.earnedBadges.filter((b) => b === 'speed-sorter')).toHaveLength(1);
  });
});

describe('submitGameScore (signed in)', () => {
  it('loads the saved score into stats on sign-in', async () => {
    mocked.fetchGameScore.mockResolvedValue({ bestScore: 14, bestStreak: 6, accuracy: 93, totalParcelsRouted: 40 });
    const { result } = renderProgress(SIGNED_IN);
    await waitFor(() => expect(result.current.stats.bestPostOfficeScore).toBe(14));
    expect(result.current.stats.totalParcelsRouted).toBe(40);
    expect(result.current.gameScores['post-office']).toMatchObject({ bestScore: 14 });
    expect(mocked.fetchGameScore).toHaveBeenCalledWith('post-office');
  });

  it('a failed score fetch does not block level progress from loading', async () => {
    mocked.fetchGameScore.mockRejectedValue(new Error('network'));
    mocked.fetchProgress.mockResolvedValue([
      { levelId: '01', stars: 2, bestAccuracy: 95, bestWpm: 20, completedAt: '2026-01-01' },
    ]);
    const { result } = renderProgress(SIGNED_IN);
    await waitFor(() => expect(result.current.stats.levelsCompleted).toBe(1));
    expect(result.current.stats.bestPostOfficeScore).toBe(0);
  });

  it('persists the round and syncs to the server record', async () => {
    mocked.saveGameScore.mockResolvedValue({ bestScore: 12, bestStreak: 7, accuracy: 91, totalParcelsRouted: 33 });
    const { result } = renderProgress(SIGNED_IN);
    await waitFor(() => expect(mocked.fetchGameScore).toHaveBeenCalled());

    await act(() => result.current.submitGameScore('post-office', round(12, 7, 91)));
    expect(mocked.saveGameScore).toHaveBeenCalledWith('post-office', { score: 12, streak: 7, accuracy: 91 });
    // Server total (33) wins over the optimistic local total (12)
    expect(result.current.stats.totalParcelsRouted).toBe(33);
  });

  it('persists newly unlocked badges', async () => {
    const { result } = renderProgress(SIGNED_IN);
    await waitFor(() => expect(mocked.fetchGameScore).toHaveBeenCalled());
    await act(() => result.current.submitGameScore('post-office', round(20)));
    expect(mocked.unlockBadge).toHaveBeenCalledWith('speed-sorter');
  });

  it('unlocks Mail Sorter when the server total crosses 50 even if the local total did not', async () => {
    mocked.saveGameScore.mockResolvedValue({ bestScore: 12, bestStreak: 3, accuracy: 90, totalParcelsRouted: 52 });
    const { result } = renderProgress(SIGNED_IN);
    await waitFor(() => expect(mocked.fetchGameScore).toHaveBeenCalled());
    await act(() => result.current.submitGameScore('post-office', round(12)));
    expect(result.current.earnedBadges).toContain('mail-sorter');
    expect(mocked.unlockBadge).toHaveBeenCalledWith('mail-sorter');
  });

  it('keeps the optimistic result if saving fails', async () => {
    mocked.saveGameScore.mockRejectedValue(new Error('network'));
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderProgress(SIGNED_IN);
    await waitFor(() => expect(mocked.fetchGameScore).toHaveBeenCalled());
    await act(() => result.current.submitGameScore('post-office', round(12)));
    expect(result.current.stats.bestPostOfficeScore).toBe(12);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe('regression: level progress', () => {
  it('new game stats default to 0 alongside existing stats', () => {
    const { result } = renderProgress();
    expect(result.current.stats).toEqual({
      totalStars: 0,
      levelsCompleted: 0,
      highestLevel: 0,
      bestWpm: 0,
      totalTimeMinutes: 0,
      badgesEarned: [],
      bestPostOfficeScore: 0,
      totalParcelsRouted: 0,
    });
  });

  it('submitResult still derives level stats and unlocks level badges', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitResult('01', { accuracy: 96, wpm: 18, stars: 3, timeSeconds: 30, errorCount: 1 }));
    expect(result.current.stats).toMatchObject({ levelsCompleted: 1, highestLevel: 1, bestWpm: 18, totalStars: 3 });
    expect(result.current.earnedBadges).toEqual(['first-keystroke', 'perfect-typist']);
  });

  it('a Post Office round does not change level stats', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(30)));
    expect(result.current.stats).toMatchObject({ levelsCompleted: 0, highestLevel: 0, bestWpm: 0, totalStars: 0 });
    expect(result.current.earnedBadges).not.toContain('first-keystroke');
  });
});

// ── TYP-9: badge checks must use the stats the submission actually produces ──

const level = (n: number, stars: 0 | 1 | 2 | 3, bestWpm = 15) => ({
  levelId: String(n).padStart(2, '0'), stars, bestAccuracy: 90, bestWpm, completedAt: '2026-10-01',
});
const typing = (stars: 0 | 1 | 2 | 3, wpm = 15) => ({ accuracy: 95, wpm, stars, timeSeconds: 30, errorCount: 1 });

async function signedInWith(progress: ReturnType<typeof level>[]) {
  mocked.fetchProgress.mockResolvedValue(progress);
  const view = renderProgress(SIGNED_IN);
  await waitFor(() => expect(Object.keys(view.result.current.progress)).toHaveLength(progress.length));
  return view;
}

describe('regression: level badge stats (TYP-9)', () => {
  it('3 stars on a first-ever level unlocks Perfect Typist on that submission', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitResult('01', typing(3)));
    expect(result.current.earnedBadges).toContain('perfect-typist');
  });

  it('crossing 30 stars unlocks Star Collector on the submission that crosses it', async () => {
    const nine = Array.from({ length: 9 }, (_, i) => level(i + 1, 3)); // 27 stars
    const { result } = await signedInWith(nine);
    await act(() => result.current.submitResult('10', typing(3)));
    expect(result.current.stats.totalStars).toBe(30);
    expect(result.current.earnedBadges).toContain('star-collector');
    expect(mocked.unlockBadge).toHaveBeenCalledWith('star-collector');
  });

  it('replaying a completed level does not count as a new completion', async () => {
    const nineteen = Array.from({ length: 19 }, (_, i) => level(i + 1, 1)); // 19 completed, 19 stars
    const { result } = await signedInWith(nineteen);
    await act(() => result.current.submitResult('01', typing(1)));
    expect(result.current.stats.levelsCompleted).toBe(19);
    expect(result.current.earnedBadges).not.toContain('touch-type-master');
    expect(mocked.unlockBadge).not.toHaveBeenCalledWith('touch-type-master');
  });

  it('a better replay of a completed level still does not add a completion', async () => {
    const nineteen = Array.from({ length: 19 }, (_, i) => level(i + 1, 1));
    const { result } = await signedInWith(nineteen);
    await act(() => result.current.submitResult('05', typing(3)));
    expect(result.current.stats).toMatchObject({ levelsCompleted: 19, totalStars: 21 });
    expect(result.current.earnedBadges).not.toContain('touch-type-master');
  });

  it('the 20th distinct level still unlocks Touch Type Master', async () => {
    const nineteen = Array.from({ length: 19 }, (_, i) => level(i + 1, 1));
    const { result } = await signedInWith(nineteen);
    await act(() => result.current.submitResult('20', typing(1)));
    expect(result.current.earnedBadges).toContain('touch-type-master');
  });

  it('a worse replay does not lower the stars used for badges', async () => {
    const { result } = await signedInWith([level(1, 3), level(2, 3), level(3, 3)]); // 9 stars
    await act(() => result.current.submitResult('01', typing(1)));
    expect(result.current.stats.totalStars).toBe(9);
    expect(result.current.earnedBadges).toContain('perfect-typist');
  });
});
