import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  usePostOfficeGame,
  spawnIntervalAt,
  tierAt,
  BELT_MS,
  MAX_PARCELS,
  ROUND_MS,
  SPAWN_END_MS,
  SPAWN_START_MS,
  TICK_MS,
} from './usePostOfficeGame';

// random() === 0 always picks the lowest tier on offer and the first entry in
// the pool, so every parcel in the first third of the round is "BOS".
const render = () => renderHook(() => usePostOfficeGame({ random: () => 0 }));

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

function type(text: string) {
  for (const ch of text) press(ch);
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

function startPlaying(result: ReturnType<typeof render>['result']) {
  act(() => result.current.start());
  advance(3000); // 3-2-1 countdown
}

describe('usePostOfficeGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle with a full 60s on the clock', () => {
    const { result } = render();
    expect(result.current.status).toBe('idle');
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.activeParcel).toBeNull();
    expect(result.current.result).toBeNull();
  });

  it('runs a 3-2-1 countdown before playing', () => {
    const { result } = render();
    act(() => result.current.start());
    expect(result.current.status).toBe('countdown');
    expect(result.current.countdown).toBe(3);
    advance(1000);
    expect(result.current.countdown).toBe(2);
    advance(2000);
    expect(result.current.status).toBe('playing');
  });

  it('spawns the first parcel on the first tick of play', () => {
    const { result } = render();
    startPlaying(result);
    expect(result.current.activeParcel).toBeNull();
    advance(TICK_MS);
    expect(result.current.activeParcel?.entry.code).toBe('BOS');
    expect(result.current.queue).toHaveLength(0);
  });

  it('queues upcoming parcels behind the active one', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS + SPAWN_START_MS);
    expect(result.current.activeParcel).not.toBeNull();
    expect(result.current.queue).toHaveLength(1);
    expect(result.current.activeParcel!.progress).toBeGreaterThan(result.current.queue[0].progress);
  });

  it('counts the round timer down', () => {
    const { result } = render();
    startPlaying(result);
    advance(15_000);
    expect(result.current.timeRemaining).toBe(45);
  });

  it('typing the full code routes the parcel: score and streak +1', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    type('BOS');
    expect(result.current.score).toBe(1);
    expect(result.current.streak).toBe(1);
    expect(result.current.activeParcel).toBeNull();
    expect(result.current.lastRouted?.region).toBe('NE');
  });

  it('matches letters case-insensitively', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    type('bos');
    expect(result.current.score).toBe(1);
  });

  it('a wrong key does not advance or fail the parcel', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    press('B');
    press('Z');
    expect(result.current.typedIndex).toBe(1);
    expect(result.current.lastKeyCorrect).toBe(false);
    expect(result.current.activeParcel?.entry.code).toBe('BOS');
    type('OS'); // player corrects and finishes
    expect(result.current.score).toBe(1);
  });

  it('ignores keystrokes when the belt is empty', () => {
    const { result } = render();
    startPlaying(result);
    press('B');
    expect(result.current.accuracy).toBe(0);
    expect(result.current.typedIndex).toBe(0);
  });

  it('ignores keystrokes before the round starts', () => {
    const { result } = render();
    press('B');
    act(() => result.current.recordKeystroke('B'));
    expect(result.current.typedIndex).toBe(0);
  });

  it('a parcel reaching the end of the belt resets streak without touching score', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    type('BOS'); // parcel 1 routed: score 1, streak 1
    // parcel 2 spawns at 3.1s and drops off the belt BELT_MS later
    advance(SPAWN_START_MS);
    expect(result.current.activeParcel).not.toBeNull();
    advance(BELT_MS);
    expect(result.current.parcelsMissed).toBe(1);
    expect(result.current.streak).toBe(0);
    expect(result.current.score).toBe(1);
  });

  it('partial progress resets when the active parcel drops', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    press('B');
    expect(result.current.typedIndex).toBe(1);
    advance(BELT_MS);
    expect(result.current.typedIndex).toBe(0);
  });

  it('never has more than MAX_PARCELS on the belt', () => {
    const { result } = render();
    startPlaying(result);
    for (let t = 0; t < ROUND_MS - 1000; t += 1000) {
      advance(1000);
      const onBelt = (result.current.activeParcel ? 1 : 0) + result.current.queue.length;
      expect(onBelt).toBeLessThanOrEqual(MAX_PARCELS);
    }
  });

  it('ends the round at 0:00 and returns the final result', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    type('BXOS'); // 3 correct + 1 wrong -> 75%
    advance(ROUND_MS);
    expect(result.current.status).toBe('complete');
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.activeParcel).toBeNull();
    expect(result.current.result).toEqual({
      score: 1,
      parcelsMissed: expect.any(Number),
      accuracy: 75,
      bestStreak: 1,
    });
    expect(result.current.result!.parcelsMissed).toBeGreaterThan(0);
  });

  it('keeps bestStreak after the streak resets', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    type('BOS');
    advance(SPAWN_START_MS);
    type('BOS'); // streak 2
    advance(SPAWN_START_MS + BELT_MS); // next parcel drops
    expect(result.current.streak).toBe(0);
    expect(result.current.bestStreak).toBe(2);
  });

  it('stops accepting input once complete', () => {
    const { result } = render();
    startPlaying(result);
    advance(ROUND_MS);
    const score = result.current.score;
    type('BOS');
    expect(result.current.score).toBe(score);
  });

  it('resets to idle after reset()', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    type('BOS');
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.score).toBe(0);
    expect(result.current.timeRemaining).toBe(60);
  });
});

describe('difficulty ramp', () => {
  it('spawn interval shortens as the round progresses', () => {
    expect(spawnIntervalAt(0)).toBe(SPAWN_START_MS);
    expect(spawnIntervalAt(ROUND_MS)).toBe(SPAWN_END_MS);
    expect(spawnIntervalAt(ROUND_MS / 2)).toBeLessThan(spawnIntervalAt(ROUND_MS / 4));
  });

  it('code tier increases as the round progresses', () => {
    expect(tierAt(0, 0.99)).toBe(1);
    expect(tierAt(ROUND_MS / 2, 0)).toBe(1);
    expect(tierAt(ROUND_MS / 2, 0.99)).toBe(2);
    expect(tierAt(ROUND_MS - 1, 0)).toBe(2);
    expect(tierAt(ROUND_MS - 1, 0.99)).toBe(3);
  });
});
