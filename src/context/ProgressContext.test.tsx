import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { ReactNode } from 'react';
import { ProgressProvider, useProgress, applyGameRound } from './ProgressContext';
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
    // Existing behaviour: the badge check uses levelsCompleted/highestLevel/bestWpm
    // but not the new stars, so star badges unlock on the following submission.
    expect(result.current.earnedBadges).toEqual(['first-keystroke']);
  });

  it('a Post Office round does not change level stats', async () => {
    const { result } = renderProgress();
    await act(() => result.current.submitGameScore('post-office', round(30)));
    expect(result.current.stats).toMatchObject({ levelsCompleted: 0, highestLevel: 0, bestWpm: 0, totalStars: 0 });
    expect(result.current.earnedBadges).not.toContain('first-keystroke');
  });
});
