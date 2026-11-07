import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useRocketsGame,
  thrustFor,
  stageForAltitude,
  tierForStage,
  pickWord,
  STAGES,
  DRAG_PER_S,
  LAUNCH_SPEED,
  MAX_SPEED,
  STALL_LIMIT_MS,
  STALL_SPEED,
  THRUST_PER_LETTER,
  TICK_MS,
} from './useRocketsGame';

// random() === 0 picks the lowest tier on offer and the first word in its
// pool, so the round opens with SUN, previewing MOON (never the same word twice).
const render = (random: () => number = () => 0) => renderHook(() => useRocketsGame({ random }));
type Hook = ReturnType<typeof render>['result'];

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

function type(text: string) {
  for (const ch of text) press(ch);
}

function typeWord(result: Hook) {
  type(result.current.activeWord!.word);
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

function startPlaying(result: Hook) {
  act(() => result.current.start());
  advance(3000); // 3-2-1 countdown
}

/** Ticks one at a time (no typing) until the rocket starts stalling. */
function coastToStall(result: Hook) {
  for (let i = 0; i < 200 && result.current.speed >= STALL_SPEED; i++) advance(TICK_MS);
  expect(result.current.speed).toBeLessThan(STALL_SPEED);
}

const DRAG_PER_TICK = 1 - DRAG_PER_S * (TICK_MS / 1000);

describe('rocket rules', () => {
  it('a completed word thrusts in proportion to its length', () => {
    expect(thrustFor('SUN')).toBeCloseTo(3 * THRUST_PER_LETTER);
    expect(thrustFor('ASTEROID')).toBeCloseTo(8 * THRUST_PER_LETTER);
  });

  it('maps altitude to the highest stage threshold reached', () => {
    expect(STAGES.map((s) => s.name)).toEqual(['Sky', 'Clouds', 'Space', 'Satellites', 'Moon']);
    expect(stageForAltitude(0)).toBe(0);
    expect(stageForAltitude(49.9)).toBe(0);
    expect(stageForAltitude(50)).toBe(1);
    expect(stageForAltitude(150)).toBe(2);
    expect(stageForAltitude(300)).toBe(3);
    expect(stageForAltitude(499.9)).toBe(3);
    expect(stageForAltitude(500)).toBe(4);
    expect(stageForAltitude(900)).toBe(4);
  });

  it('moves the word tier mix up with the stage', () => {
    expect([0, 0.5, 0.99].map((r) => tierForStage(0, r))).toEqual([1, 1, 1]);
    expect([0, 0.99].map((r) => tierForStage(1, r))).toEqual([1, 2]);
    expect([0, 0.4, 0.99].map((r) => tierForStage(2, r))).toEqual([1, 2, 3]);
    expect([0, 0.99].map((r) => tierForStage(3, r))).toEqual([2, 3]);
    expect([0, 0.5, 0.99].map((r) => tierForStage(4, r))).toEqual([2, 3, 3]);
  });

  it('never picks the word it is told to avoid', () => {
    const sun = pickWord(0, [0, 0]);
    expect(sun.word).toBe('SUN');
    expect(pickWord(0, [0, 0], sun).word).toBe('MOON');
  });
});

describe('useRocketsGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle at launch speed with a full 60s and no words', () => {
    const { result } = render();
    expect(result.current.status).toBe('idle');
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.speed).toBe(LAUNCH_SPEED);
    expect(result.current.altitude).toBe(0);
    expect(result.current.stage).toBe(0);
    expect(result.current.activeWord).toBeNull();
    expect(result.current.lastThrust).toBe(0);
    expect(result.current.result).toBeNull();
  });

  it('runs a 3-2-1 countdown, showing the first word and its preview', () => {
    const { result } = render();
    act(() => result.current.start());
    expect(result.current.status).toBe('countdown');
    expect(result.current.countdown).toBe(3);
    expect(result.current.activeWord?.word).toBe('SUN');
    expect(result.current.nextWord?.word).toBe('MOON');
    advance(1000);
    expect(result.current.countdown).toBe(2);
    advance(2000);
    expect(result.current.status).toBe('playing');
  });

  it('ignores keys before the round starts', () => {
    const { result } = render();
    press('s');
    act(() => result.current.start());
    type('sun');
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.wordsTyped).toBe(0);
    expect(result.current.speed).toBe(LAUNCH_SPEED);
  });

  it('letters alone give no thrust; completing the word does', () => {
    const { result } = render();
    startPlaying(result);
    type('su');
    expect(result.current.typedIndex).toBe(2);
    expect(result.current.speed).toBe(LAUNCH_SPEED);
    press('N');
    expect(result.current.speed).toBeCloseTo(LAUNCH_SPEED + thrustFor('SUN'));
    expect(result.current.lastThrust).toBeCloseTo(thrustFor('SUN'));
    expect(result.current.wordsTyped).toBe(1);
  });

  it('caps speed at MAX_SPEED', () => {
    const { result } = render();
    startPlaying(result);
    for (let i = 0; i < 8; i++) typeWord(result); // ~28 letters, ~31 km/s of thrust
    expect(result.current.speed).toBe(MAX_SPEED);
  });

  it('drag slows the rocket between words, and altitude grows by speed x time', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    const speed = LAUNCH_SPEED * DRAG_PER_TICK;
    expect(result.current.speed).toBeCloseTo(speed);
    expect(result.current.altitude).toBeCloseTo(speed * 0.1);

    // Faster rocket, faster climb.
    typeWord(result);
    typeWord(result);
    const before = { speed: result.current.speed, altitude: result.current.altitude };
    advance(TICK_MS);
    expect(result.current.speed).toBeCloseTo(before.speed * DRAG_PER_TICK);
    expect(result.current.altitude - before.altitude).toBeCloseTo(before.speed * DRAG_PER_TICK * 0.1);
  });

  it('passes each stage exactly once on the way to the Moon, with longer words higher up', () => {
    const { result } = render();
    startPlaying(result);
    const seen: number[] = [result.current.stage];
    for (let s = 0; s < 58 && result.current.stage < 4; s++) {
      typeWord(result);
      typeWord(result);
      for (let t = 0; t < 10; t++) {
        advance(TICK_MS);
        if (result.current.stage !== seen[seen.length - 1]) seen.push(result.current.stage);
      }
    }
    expect(seen).toEqual([0, 1, 2, 3, 4]);
    expect(result.current.altitude).toBeGreaterThanOrEqual(STAGES[4].km);

    // At the Moon the tier mix is [2, 3, 3]: with random() = 0, new words are tier 2.
    typeWord(result);
    typeWord(result);
    expect(result.current.activeWord!.tier).toBeGreaterThanOrEqual(2);
    expect(result.current.nextWord!.tier).toBeGreaterThanOrEqual(2);
  });

  it('finishing a word moves the preview in and picks a new preview', () => {
    const { result } = render();
    startPlaying(result);
    type('SUN');
    expect(result.current.activeWord?.word).toBe('MOON');
    expect(result.current.nextWord?.word).toBe('SUN');
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.wordsTyped).toBe(1);
    expect(result.current.streak).toBe(1);
  });

  it('a wrong key gives no thrust, marks the letter wrong and resets the streak without failing the word', () => {
    const { result } = render();
    startPlaying(result);
    type('SUN');
    expect(result.current.streak).toBe(1);
    const speed = result.current.speed;

    press('x'); // MOON expects M
    expect(result.current.lastKeyCorrect).toBe(false);
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.speed).toBe(speed);
    expect(result.current.streak).toBe(0);
    expect(result.current.activeWord?.word).toBe('MOON');

    type('MOON'); // the word still completes and thrusts, but it had a mistake
    expect(result.current.speed).toBeCloseTo(speed + thrustFor('MOON'));
    expect(result.current.wordsTyped).toBe(2);
    expect(result.current.streak).toBe(0);
    expect(result.current.bestStreak).toBe(1);
    expect(result.current.accuracy).toBe(88); // 7 of 8
  });

  it('ends the round after 5 continuous seconds below stall speed', () => {
    const { result } = render();
    startPlaying(result);
    coastToStall(result);
    expect(result.current.stallFor).toBe(TICK_MS);

    advance(STALL_LIMIT_MS - 2 * TICK_MS);
    expect(result.current.stallFor).toBe(STALL_LIMIT_MS - TICK_MS);
    expect(result.current.status).toBe('playing');

    advance(TICK_MS);
    expect(result.current.status).toBe('complete');
    expect(result.current.result).toEqual({
      score: Math.floor(result.current.altitude),
      accuracy: 0,
      bestStreak: 0,
      wordsTyped: 0,
      stage: 0,
      endedBy: 'stall',
    });
  });

  it('a word completed at 4.9s of stalling thrusts and resets the stall timer', () => {
    const { result } = render();
    startPlaying(result);
    coastToStall(result);
    advance(STALL_LIMIT_MS - 2 * TICK_MS);
    expect(result.current.stallFor).toBe(4900);

    type('SUN');
    expect(result.current.speed).toBeGreaterThanOrEqual(STALL_SPEED);
    expect(result.current.stallFor).toBe(0);

    // It coasts for a while, then a fresh 5s stall countdown starts from zero.
    advance(STALL_LIMIT_MS);
    expect(result.current.status).toBe('playing');
    coastToStall(result);
    advance(STALL_LIMIT_MS - TICK_MS);
    expect(result.current.status).toBe('complete');
    expect(result.current.result?.endedBy).toBe('stall');
  });

  it('otherwise ends at 60s with the round result, and ignores keys afterwards', () => {
    const { result } = render();
    startPlaying(result);
    for (let s = 0; s < 60; s++) {
      typeWord(result);
      advance(1000);
    }
    expect(result.current.status).toBe('complete');
    expect(result.current.timeRemaining).toBe(0);
    const final = result.current.result!;
    expect(final).toEqual({
      score: Math.floor(result.current.altitude),
      accuracy: 100,
      bestStreak: 60,
      wordsTyped: 60,
      stage: result.current.stage,
      endedBy: 'time',
    });
    expect(final.score).toBeGreaterThan(0);

    press(result.current.activeWord!.word[0]);
    expect(result.current.result).toEqual(final);
  });

  it('reset() returns to idle', () => {
    const { result } = render();
    startPlaying(result);
    type('SUN');
    advance(1000);
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.speed).toBe(LAUNCH_SPEED);
    expect(result.current.altitude).toBe(0);
    expect(result.current.wordsTyped).toBe(0);
    expect(result.current.activeWord).toBeNull();
    advance(1000);
    expect(result.current.altitude).toBe(0); // no ticks while idle
  });
});
