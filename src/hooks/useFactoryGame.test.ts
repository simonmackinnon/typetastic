import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  useFactoryGame,
  arrivalIntervalAt,
  orderTimeAt,
  tierAt,
  ARRIVE_END_MS,
  ARRIVE_START_MS,
  COMBO_BONUS_MS,
  MAX_ORDERS,
  ORDER_TIME_END_MS,
  ORDER_TIME_START_MS,
  ROUND_MS,
  TICK_MS,
} from './useFactoryGame';

// random() === 0 picks the smallest tier on offer and the first toy in its
// pool, so every order in the first two thirds is a kite: SAIL, TAIL.
const render = () => renderHook(() => useFactoryGame({ random: () => 0 }));
type Hook = ReturnType<typeof render>['result'];

function press(key: string) {
  act(() => {
    window.dispatchEvent(new KeyboardEvent('keydown', { key }));
  });
}

function type(text: string) {
  for (const ch of text) press(ch);
}

/** Types the rest of the active order (from the start of its current part). */
function finishOrder(result: Hook) {
  const active = result.current.orders[0];
  type(active.toy.parts.slice(active.partsDone).join(''));
}

function advance(ms: number) {
  act(() => vi.advanceTimersByTime(ms));
}

function startPlaying(result: Hook) {
  act(() => result.current.start());
  advance(3000); // 3-2-1 countdown
}

describe('factory schedule', () => {
  it('orders arrive every 6s at the start, speeding up to every 4s', () => {
    expect(arrivalIntervalAt(0)).toBe(ARRIVE_START_MS);
    expect(arrivalIntervalAt(ROUND_MS / 2)).toBe(5_000);
    expect(arrivalIntervalAt(ROUND_MS)).toBe(ARRIVE_END_MS);
  });

  it("each order's time limit shortens from 20s to 12s", () => {
    expect(orderTimeAt(0)).toBe(ORDER_TIME_START_MS);
    expect(orderTimeAt(ROUND_MS / 2)).toBe(16_000);
    expect(orderTimeAt(ROUND_MS)).toBe(ORDER_TIME_END_MS);
  });

  it('moves up the tier mix through the round', () => {
    expect(tierAt(0, 0.99)).toBe(1);
    expect([0, 0.99].map((r) => tierAt(ROUND_MS / 2, r))).toEqual([1, 2]);
    expect([0, 0.99].map((r) => tierAt(ROUND_MS - 1, r))).toEqual([2, 3]);
  });
});

describe('useFactoryGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('starts idle with a full 60s on the clock and no orders', () => {
    const { result } = render();
    expect(result.current.status).toBe('idle');
    expect(result.current.timeRemaining).toBe(60);
    expect(result.current.orders).toEqual([]);
    expect(result.current.result).toBeNull();
  });

  it('runs a 3-2-1 countdown, then the first order arrives at once', () => {
    const { result } = render();
    act(() => result.current.start());
    expect(result.current.status).toBe('countdown');
    expect(result.current.countdown).toBe(3);
    advance(1000);
    expect(result.current.countdown).toBe(2);
    expect(result.current.orders).toEqual([]);
    advance(2000);
    expect(result.current.status).toBe('playing');
    expect(result.current.orders).toHaveLength(1);
    expect(result.current.orders[0]).toMatchObject({ active: true, timeLimit: ORDER_TIME_START_MS, partsDone: 0 });
    expect(result.current.orders[0].toy.id).toBe('kite');
  });

  it('ignores keys before the round starts', () => {
    const { result } = render();
    press('s');
    act(() => result.current.start());
    press('s');
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.accuracy).toBe(0);
  });

  it('orders arrive on a speeding-up schedule', () => {
    const { result } = render();
    startPlaying(result);
    const arrivals = [0];
    let lastUid = result.current.orders[0].uid;
    for (let t = TICK_MS; t < ROUND_MS; t += TICK_MS) {
      advance(TICK_MS);
      const newest = result.current.orders[result.current.orders.length - 1];
      if (newest && newest.uid !== lastUid) {
        arrivals.push(t);
        lastUid = newest.uid;
      }
      while (result.current.orders.length > 0) finishOrder(result); // keep the line clear
    }
    const gaps = arrivals.slice(1).map((t, i) => t - arrivals[i]);
    expect(gaps[0]).toBe(ARRIVE_START_MS);
    gaps.slice(1).forEach((gap, i) => expect(gap).toBeLessThanOrEqual(gaps[i]));
    expect(gaps[gaps.length - 1]).toBeLessThanOrEqual(ARRIVE_END_MS + 300);
  });

  it('never has more than 3 orders waiting', () => {
    const { result } = render();
    startPlaying(result);
    advance(11_800); // arrivals at 0, 6s and 11.8s
    expect(result.current.orders).toHaveLength(MAX_ORDERS);
    advance(19_900 - 11_800); // the 4th order is due at 17.5s but there's no room
    expect(result.current.orders).toHaveLength(MAX_ORDERS);
    expect(result.current.ordersMissed).toBe(0);
  });

  it("gives later orders a shorter timer, and counts each order's time down", () => {
    const { result } = render();
    startPlaying(result);
    advance(6_000);
    const [first, second] = result.current.orders;
    expect(first.timeLimit).toBe(ORDER_TIME_START_MS);
    expect(first.timeLeft).toBe(ORDER_TIME_START_MS - 6_000);
    expect(second.timeLimit).toBe(orderTimeAt(6_000));
    expect(second.timeLimit).toBeLessThan(first.timeLimit);
    expect(second.timeLeft).toBe(second.timeLimit);
  });

  it('parts must be typed in order, advancing automatically', () => {
    const { result } = render();
    startPlaying(result);
    press('t'); // first letter of TAIL, the second part
    expect(result.current.lastKeyCorrect).toBe(false);
    expect(result.current.activePartIndex).toBe(0);
    expect(result.current.typedIndex).toBe(0);

    type('sai');
    expect(result.current.typedIndex).toBe(3);
    press('L');
    expect(result.current.activePartIndex).toBe(1);
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.partsBuilt).toBe(1);
    expect(result.current.orders[0].partsDone).toBe(1);
  });

  it('finishing an order adds 1 to the score and removes it', () => {
    const { result } = render();
    startPlaying(result);
    const { uid } = result.current.orders[0];
    type('SAILTAIL');
    expect(result.current.score).toBe(1);
    expect(result.current.combo).toBe(1);
    expect(result.current.partsBuilt).toBe(2);
    expect(result.current.orders).toEqual([]);
    expect(result.current.lastBuilt).toEqual({ uid, toyId: 'kite' });
    expect(result.current.activePartIndex).toBe(0);
  });

  it('a wrong key marks the letter wrong but the order can still be finished, without combo', () => {
    const { result } = render();
    startPlaying(result);
    type('SAx');
    expect(result.current.lastKeyCorrect).toBe(false);
    expect(result.current.typedIndex).toBe(2);
    type('ILTAIL');
    expect(result.current.score).toBe(1);
    expect(result.current.combo).toBe(0);
    expect(result.current.accuracy).toBe(89); // 8 of 9
  });

  it('a missed order resets the combo and clears its progress, but keeps the score', () => {
    const { result } = render();
    startPlaying(result);
    finishOrder(result);
    expect(result.current.combo).toBe(1);

    advance(6_000); // order 2 arrives, with a 19.2s timer
    const missedUid = result.current.orders[0].uid;
    type('SA');
    advance(orderTimeAt(6_000) - TICK_MS);
    expect(result.current.orders[0].uid).toBe(missedUid);
    advance(TICK_MS);

    expect(result.current.orders.some((o) => o.uid === missedUid)).toBe(false);
    expect(result.current.ordersMissed).toBe(1);
    expect(result.current.combo).toBe(0);
    expect(result.current.score).toBe(1);
    expect(result.current.typedIndex).toBe(0);
    expect(result.current.activePartIndex).toBe(0);
  });

  it('a third perfect order in a row gives the next order exactly +3s', () => {
    const { result } = render();
    startPlaying(result);
    finishOrder(result);  // order 1 at 0s
    advance(6_000);
    finishOrder(result);  // order 2 at 6s
    advance(11_500);      // order 3 arrives at 11.8s, order 4 at 17.5s
    expect(result.current.orders).toHaveLength(2);
    const fourth = result.current.orders[1];
    expect(fourth.timeLimit).toBe(orderTimeAt(17_500));

    finishOrder(result);  // order 3: combo 3
    expect(result.current.combo).toBe(3);
    expect(result.current.orders[0].uid).toBe(fourth.uid);
    expect(result.current.orders[0].timeLimit).toBe(orderTimeAt(17_500) + COMBO_BONUS_MS);
  });

  it('a mistake in the run breaks the combo bonus', () => {
    const { result } = render();
    startPlaying(result);
    finishOrder(result);
    advance(6_000);
    press('x');           // mistake in order 2
    finishOrder(result);
    advance(11_500);
    finishOrder(result);  // order 3: combo is only 1
    expect(result.current.combo).toBe(1);
    expect(result.current.orders[0].timeLimit).toBe(orderTimeAt(17_500));
  });

  it('with no order waiting, the bonus goes to the next order to arrive', () => {
    const { result } = render();
    startPlaying(result);
    finishOrder(result);  // 0s
    advance(6_000);
    finishOrder(result);  // 6s
    advance(5_800);
    finishOrder(result);  // 11.8s: combo 3, nothing waiting
    expect(result.current.orders).toEqual([]);
    advance(17_500 - 11_800);
    expect(result.current.orders[0].timeLimit).toBe(orderTimeAt(17_500) + COMBO_BONUS_MS);
  });

  it('ends at 60s with the round result, abandoning the order in progress and ignoring later keys', () => {
    const { result } = render();
    startPlaying(result);
    for (let t = 0; t < ROUND_MS - TICK_MS; t += TICK_MS) {
      // Build everything until the last 4.5s; orders arrive at least every
      // ~4.3s by then, so one is still on the line at the bell.
      if (t < ROUND_MS - 4_500) while (result.current.orders.length > 0) finishOrder(result);
      advance(TICK_MS);
    }
    // One order left half-built at the bell.
    const { score, partsBuilt } = result.current;
    const last = result.current.orders[0];
    expect(last).toBeDefined();
    type(last.toy.parts[0]);
    advance(TICK_MS);

    expect(result.current.status).toBe('complete');
    expect(result.current.timeRemaining).toBe(0);
    expect(result.current.orders).toEqual([]);
    const final = result.current.result!;
    expect(final).toEqual({
      score,
      accuracy: 100,
      bestStreak: score,
      ordersMissed: 0,
      partsBuilt: partsBuilt + 1,
    });
    expect(score).toBeGreaterThan(10);

    press('s');
    expect(result.current.result).toEqual(final);
  });

  it('reset() returns to idle', () => {
    const { result } = render();
    startPlaying(result);
    finishOrder(result);
    advance(1000);
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.score).toBe(0);
    expect(result.current.orders).toEqual([]);
    advance(10_000);
    expect(result.current.orders).toEqual([]); // no arrivals while idle
  });
});
