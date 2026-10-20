import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useRocketsGame,
  drainRate,
  stageForAltitude,
  tierForStage,
  pickWord,
  STAGES,
  CLIMB_KM_PER_S,
  DRAIN_PER_S,
  EMPTY_LIMIT_MS,
  FUEL_MAX,
  FUEL_PER_LETTER,
  FUEL_START,
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

function fillTank(result: Hook) {
  while (result.current.fuel < FUEL_MAX) typeWord(result);
}

/** Ticks one at a time (no typing) until the tank is empty. */
function drainToEmpty(result: Hook) {
  for (let i = 0; i < 200 && result.current.fuel > 0; i++) advance(TICK_MS);
  expect(result.current.fuel).toBe(0);
}

/** Types two words a second so the tank stays full while the rocket climbs. */
function climbTo(result: Hook, stage: number) {
  for (let s = 0; s < 58 && result.current.stage < stage; s++) {
    typeWord(result);
    typeWord(result);
    advance(1000);
  }
  expect(result.current.stage).toBe(stage);
}

describe('rocket rules', () => {
  it('drains 6/s, plus 10% of that per stage reached', () => {
    expect(drainRate(0)).toBe(DRAIN_PER_S);
    expect(drainRate(1)).toBeCloseTo(6.6);
    expect(drainRate(4)).toBeCloseTo(8.4);
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

  it('starts idle with a full 60s, the starting fuel and no words', () => {
    const { result } = render();
    expect(result.current.status).toBe('idle');
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.fuel).toBe(FUEL_START);
    expect(result.current.altitude).toBe(0);
    expect(result.current.stage).toBe(0);
    expect(result.current.activeWord).toBeNull();
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
    press('s');
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.fuel).toBe(FUEL_START);
    expect(result.current.accuracy).toBe(0);
  });

  it('adds exactly 4 fuel per correct letter, case-insensitively', () => {
    const { result } = render();
    startPlaying(result);
    press('s');
    expect(result.current.fuel).toBe(FUEL_START + FUEL_PER_LETTER);
    expect(result.current.typedIndex).toBe(1);
    expect(result.current.lastKeyCorrect).toBe(true);
    press('U');
    expect(result.current.fuel).toBe(FUEL_START + 2 * FUEL_PER_LETTER);
  });

  it('caps fuel at 100', () => {
    const { result } = render();
    startPlaying(result);
    for (let i = 0; i < 6; i++) typeWord(result); // ~21 letters, well over the 15 needed
    expect(result.current.fuel).toBe(FUEL_MAX);
  });

  it('drains at the first-stage rate each tick and climbs in proportion to fuel', () => {
    const { result } = render();
    startPlaying(result);
    advance(TICK_MS);
    const fuelAfter = FUEL_START - DRAIN_PER_S * 0.1;
    expect(result.current.fuel).toBeCloseTo(fuelAfter);
    expect(result.current.altitude).toBeCloseTo(CLIMB_KM_PER_S * (fuelAfter / 100) * 0.1);

    // A fuller tank climbs faster.
    fillTank(result);
    const before = result.current.altitude;
    advance(TICK_MS);
    expect(result.current.altitude - before).toBeCloseTo(CLIMB_KM_PER_S * ((FUEL_MAX - DRAIN_PER_S * 0.1) / 100) * 0.1);
  });

  it('never lets fuel go negative, and an empty tank does not climb', () => {
    const { result } = render();
    startPlaying(result);
    drainToEmpty(result);
    const altitude = result.current.altitude;
    advance(1000);
    expect(result.current.fuel).toBe(0);
    expect(result.current.altitude).toBe(altitude);
  });

  it('drains faster at higher stages', () => {
    const { result } = render();
    startPlaying(result);
    climbTo(result, 1);
    const before = result.current.fuel;
    advance(TICK_MS);
    expect(before - result.current.fuel).toBeCloseTo(drainRate(1) * 0.1);
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

  it('a wrong key adds no fuel, marks the letter wrong and resets the streak without failing the word', () => {
    const { result } = render();
    startPlaying(result);
    type('SUN');
    expect(result.current.streak).toBe(1);
    const fuel = result.current.fuel;

    press('x'); // MOON expects M
    expect(result.current.lastKeyCorrect).toBe(false);
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.fuel).toBe(fuel);
    expect(result.current.streak).toBe(0);
    expect(result.current.activeWord?.word).toBe('MOON');

    type('MOON'); // the word still completes, but it had a mistake
    expect(result.current.wordsTyped).toBe(2);
    expect(result.current.streak).toBe(0);
    expect(result.current.bestStreak).toBe(1);
    expect(result.current.accuracy).toBe(88); // 7 of 8
  });

  it('ends the round after 5 continuous seconds at 0 fuel', () => {
    const { result } = render();
    startPlaying(result);
    drainToEmpty(result);
    expect(result.current.emptyFor).toBe(TICK_MS);

    advance(EMPTY_LIMIT_MS - 2 * TICK_MS);
    expect(result.current.emptyFor).toBe(EMPTY_LIMIT_MS - TICK_MS);
    expect(result.current.status).toBe('playing');

    advance(TICK_MS);
    expect(result.current.status).toBe('complete');
    expect(result.current.result).toEqual({
      score: Math.floor(result.current.altitude),
      accuracy: 0,
      bestStreak: 0,
      wordsTyped: 0,
      stage: 0,
      endedBy: 'fuel',
    });
  });

  it('a correct letter at 4.9s empty refuels and resets the empty-tank countdown', () => {
    const { result } = render();
    startPlaying(result);
    drainToEmpty(result);
    advance(EMPTY_LIMIT_MS - 2 * TICK_MS);
    expect(result.current.emptyFor).toBe(4900);

    press('s');
    expect(result.current.fuel).toBe(FUEL_PER_LETTER);
    expect(result.current.emptyFor).toBe(0);

    // 4 fuel lasts 7 ticks, then a fresh 5s countdown starts from zero.
    advance(4000);
    expect(result.current.status).toBe('playing');
    expect(result.current.emptyFor).toBe(4000 - 6 * TICK_MS);
    advance(EMPTY_LIMIT_MS - result.current.emptyFor);
    expect(result.current.status).toBe('complete');
    expect(result.current.result?.endedBy).toBe('fuel');
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
    expect(result.current.fuel).toBe(FUEL_START);
    expect(result.current.altitude).toBe(0);
    expect(result.current.wordsTyped).toBe(0);
    expect(result.current.activeWord).toBeNull();
    advance(1000);
    expect(result.current.altitude).toBe(0); // no ticks while idle
  });
});
