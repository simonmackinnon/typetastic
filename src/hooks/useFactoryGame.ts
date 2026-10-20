import { useCallback, useMemo, useReducer, useRef } from 'react';
import type { GameRoundResult, GameStatus } from '../types';
import { toysForTier, type FactoryTier, type FactoryToy } from '../data/factoryOrders';
import {
  ROUND_MS, TICK_MS, COUNTDOWN_FROM, COUNTDOWN_STEP_MS,
  matchesKey, accuracyPercent, countdownStep, useGameInterval, useGameKeyboard,
} from './gameShared';

export { ROUND_MS, TICK_MS };
export const ARRIVE_START_MS = 6_000;      // a new order every 6 s at the start...
export const ARRIVE_END_MS = 4_000;        // ...speeding up to every 4 s by the end
export const MAX_ORDERS = 3;               // cap on orders on screen at once
export const ORDER_TIME_START_MS = 20_000; // an order's time limit at the start...
export const ORDER_TIME_END_MS = 12_000;   // ...shortening to this by the end
export const COMBO_BONUS_AT = 3;           // perfect orders in a row that earn the bonus
export const COMBO_BONUS_MS = 3_000;       // extra time given to the next order

export interface FactoryRoundResult extends GameRoundResult {
  score: number;         // toys built
  accuracy: number;      // correct keystrokes / total keystrokes, as a 0-100 percentage
  bestStreak: number;    // best combo of perfect orders
  ordersMissed: number;
  partsBuilt: number;
}

interface FactoryOrder {
  uid: number;
  toy: FactoryToy;
  arrivedAt: number;   // round-elapsed ms
  timeLimit: number;   // ms, including any combo bonus
  partsDone: number;
  perfect: boolean;    // no wrong keys while typing this order
}

export interface FactoryOrderView extends FactoryOrder {
  timeLeft: number;    // ms
  active: boolean;     // only the front order can be typed
}

interface FactoryState {
  status: GameStatus;
  countdown: number;
  elapsed: number;
  nextArrivalAt: number;
  nextUid: number;
  orders: FactoryOrder[];  // orders[0] is the active one
  typedIndex: number;      // progress into the active order's current part
  pendingBonus: boolean;   // combo bonus waiting for the next order to arrive
  score: number;
  combo: number;
  bestCombo: number;
  ordersMissed: number;
  partsBuilt: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  lastKeyCorrect: boolean | null;
  lastBuilt: { uid: number; toyId: string } | null;
}

type Rand = [number, number];

type FactoryAction =
  | { type: 'START_COUNTDOWN' }
  | { type: 'COUNTDOWN_TICK'; rand: Rand }
  | { type: 'TICK'; rand: Rand }
  | { type: 'KEY'; char: string }
  | { type: 'RESET' };

function init(): FactoryState {
  return {
    status: 'idle',
    countdown: COUNTDOWN_FROM,
    elapsed: 0,
    nextArrivalAt: 0,
    nextUid: 1,
    orders: [],
    typedIndex: 0,
    pendingBonus: false,
    score: 0,
    combo: 0,
    bestCombo: 0,
    ordersMissed: 0,
    partsBuilt: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    lastKeyCorrect: null,
    lastBuilt: null,
  };
}

function lerpOverRound(elapsed: number, from: number, to: number): number {
  const t = Math.min(elapsed / ROUND_MS, 1);
  return Math.round(from - (from - to) * t);
}

/** Time until the next order arrives, for an order arriving at `elapsed`. */
export function arrivalIntervalAt(elapsed: number): number {
  return lerpOverRound(elapsed, ARRIVE_START_MS, ARRIVE_END_MS);
}

/** Time limit of an order arriving at `elapsed`. */
export function orderTimeAt(elapsed: number): number {
  return lerpOverRound(elapsed, ORDER_TIME_START_MS, ORDER_TIME_END_MS);
}

// First third: 2-part toys only. Then mix in progressively bigger toys.
export function tierAt(elapsed: number, rand: number): FactoryTier {
  if (elapsed < ROUND_MS / 3) return 1;
  if (elapsed < (ROUND_MS * 2) / 3) return rand < 0.5 ? 1 : 2;
  return rand < 0.5 ? 2 : 3;
}

function arrive(state: FactoryState, rand: Rand): FactoryState {
  const pool = toysForTier(tierAt(state.elapsed, rand[0]));
  const toy = pool[Math.floor(rand[1] * pool.length) % pool.length];
  const order: FactoryOrder = {
    uid: state.nextUid,
    toy,
    arrivedAt: state.elapsed,
    timeLimit: orderTimeAt(state.elapsed) + (state.pendingBonus ? COMBO_BONUS_MS : 0),
    partsDone: 0,
    perfect: true,
  };
  return {
    ...state,
    orders: [...state.orders, order],
    nextUid: state.nextUid + 1,
    nextArrivalAt: state.elapsed + arrivalIntervalAt(state.elapsed),
    pendingBonus: false,
  };
}

function tick(state: FactoryState, rand: Rand): FactoryState {
  const elapsed = state.elapsed + TICK_MS;

  // Orders whose timer ran out are missed, and their progress is cleared.
  const remaining = state.orders.filter((o) => elapsed - o.arrivedAt < o.timeLimit);
  const missed = state.orders.length - remaining.length;
  const activeExpired = state.orders.length > 0 && remaining[0]?.uid !== state.orders[0].uid;

  const next: FactoryState = {
    ...state,
    elapsed,
    orders: remaining,
    ordersMissed: state.ordersMissed + missed,
    combo: missed > 0 ? 0 : state.combo,
    typedIndex: activeExpired ? 0 : state.typedIndex,
  };

  // Round over: any order in progress is abandoned, not counted either way.
  if (elapsed >= ROUND_MS) {
    return { ...next, status: 'complete', orders: [], typedIndex: 0 };
  }

  if (elapsed >= state.nextArrivalAt && remaining.length < MAX_ORDERS) return arrive(next, rand);
  return next;
}

function keystroke(state: FactoryState, char: string): FactoryState {
  const [active, ...waiting] = state.orders;
  if (!active) return state; // nothing to build yet

  const part = active.toy.parts[active.partsDone];
  if (!matchesKey(part[state.typedIndex], char)) {
    return {
      ...state,
      orders: [{ ...active, perfect: false }, ...waiting],
      totalKeystrokes: state.totalKeystrokes + 1,
      lastKeyCorrect: false,
    };
  }

  const base = {
    ...state,
    correctKeystrokes: state.correctKeystrokes + 1,
    totalKeystrokes: state.totalKeystrokes + 1,
    lastKeyCorrect: true,
  };
  const typedIndex = state.typedIndex + 1;
  if (typedIndex < part.length) return { ...base, typedIndex };

  // Part finished: it snaps onto the toy and the next part becomes active.
  const partsDone = active.partsDone + 1;
  const partsBuilt = state.partsBuilt + 1;
  if (partsDone < active.toy.parts.length) {
    return { ...base, typedIndex: 0, partsBuilt, orders: [{ ...active, partsDone }, ...waiting] };
  }

  // Toy finished. A run of perfect orders gives the next order extra time.
  const combo = active.perfect ? state.combo + 1 : 0;
  const bonus = combo >= COMBO_BONUS_AT;
  const [nextOrder, ...rest] = waiting;
  return {
    ...base,
    typedIndex: 0,
    partsBuilt,
    score: state.score + 1,
    combo,
    bestCombo: Math.max(state.bestCombo, combo),
    orders: bonus && nextOrder ? [{ ...nextOrder, timeLimit: nextOrder.timeLimit + COMBO_BONUS_MS }, ...rest] : waiting,
    pendingBonus: bonus && !nextOrder,
    lastBuilt: { uid: active.uid, toyId: active.toy.id },
  };
}

function reducer(state: FactoryState, action: FactoryAction): FactoryState {
  switch (action.type) {
    case 'START_COUNTDOWN':
      return { ...init(), status: 'countdown' };

    case 'COUNTDOWN_TICK': {
      if (state.status !== 'countdown') return state;
      const countdown = countdownStep(state.countdown);
      if (countdown !== null) return { ...state, countdown };
      return arrive({ ...state, status: 'playing' }, action.rand); // first order arrives at once
    }

    case 'TICK':
      return state.status === 'playing' ? tick(state, action.rand) : state;

    case 'KEY':
      return state.status === 'playing' ? keystroke(state, action.char) : state;

    case 'RESET':
      return init();

    default:
      return state;
  }
}

export interface UseFactoryGameOptions {
  random?: () => number;
}

export interface UseFactoryGame {
  status: GameStatus;
  countdown: number;
  timeRemaining: number; // whole seconds
  orders: FactoryOrderView[];
  activePartIndex: number;
  typedIndex: number;
  lastKeyCorrect: boolean | null;
  score: number;
  combo: number;
  bestCombo: number;
  ordersMissed: number;
  partsBuilt: number;
  accuracy: number;
  lastBuilt: { uid: number; toyId: string } | null;
  start: () => void;
  reset: () => void;
  recordKeystroke: (char: string) => void;
  result: FactoryRoundResult | null;
}

export function useFactoryGame({ random = Math.random }: UseFactoryGameOptions = {}): UseFactoryGame {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const randomRef = useRef(random);
  randomRef.current = random;
  const rand = (): Rand => [randomRef.current(), randomRef.current()];

  useGameInterval(state.status === 'countdown', () => dispatch({ type: 'COUNTDOWN_TICK', rand: rand() }), COUNTDOWN_STEP_MS);
  useGameInterval(state.status === 'playing', () => dispatch({ type: 'TICK', rand: rand() }), TICK_MS);

  const recordKeystroke = useCallback((char: string) => {
    dispatch({ type: 'KEY', char });
  }, []);

  useGameKeyboard(state.status === 'playing', recordKeystroke);

  const start = useCallback(() => dispatch({ type: 'START_COUNTDOWN' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const orders = useMemo(
    () =>
      state.orders.map((o, i) => ({
        ...o,
        timeLeft: Math.max(0, o.timeLimit - (state.elapsed - o.arrivedAt)),
        active: i === 0,
      })),
    [state.orders, state.elapsed],
  );

  const accuracy = accuracyPercent(state.correctKeystrokes, state.totalKeystrokes);

  const result: FactoryRoundResult | null =
    state.status === 'complete'
      ? {
          score: state.score,
          accuracy,
          bestStreak: state.bestCombo,
          ordersMissed: state.ordersMissed,
          partsBuilt: state.partsBuilt,
        }
      : null;

  return {
    status: state.status,
    countdown: state.countdown,
    timeRemaining: Math.max(0, Math.ceil((ROUND_MS - state.elapsed) / 1000)),
    orders,
    activePartIndex: state.orders[0]?.partsDone ?? 0,
    typedIndex: state.typedIndex,
    lastKeyCorrect: state.lastKeyCorrect,
    score: state.score,
    combo: state.combo,
    bestCombo: state.bestCombo,
    ordersMissed: state.ordersMissed,
    partsBuilt: state.partsBuilt,
    accuracy,
    lastBuilt: state.lastBuilt,
    start,
    reset,
    recordKeystroke,
    result,
  };
}
