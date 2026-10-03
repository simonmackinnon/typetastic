import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import type { GameStatus } from '../types';
import { parcelsForTier, type CityCodeEntry, type ParcelRegion, type ParcelTier } from '../data/postOfficeParcels';

export const ROUND_MS = 60_000;
export const TICK_MS = 100;
export const BELT_MS = 10_000;          // time for a parcel to travel the full belt
export const SPAWN_START_MS = 3_000;    // spawn interval at the start of the round...
export const SPAWN_END_MS = 1_200;      // ...ramping linearly down to this by the end
export const MAX_PARCELS = 5;           // cap on concurrently-rendered parcels

export interface PostOfficeRoundResult {
  score: number;         // parcels routed correctly
  parcelsMissed: number;
  accuracy: number;      // correct keystrokes / total keystrokes, as a 0-100 percentage
  bestStreak: number;
}

export interface BeltParcel {
  uid: number;
  entry: CityCodeEntry;
  spawnedAt: number; // round-elapsed ms
}

export interface BeltParcelView extends BeltParcel {
  progress: number; // 0 (just spawned) -> 1 (end of belt)
}

interface PostOfficeState {
  status: GameStatus;
  countdown: number;
  elapsed: number;
  nextSpawnAt: number;
  nextUid: number;
  parcels: BeltParcel[];   // in belt order; parcels[0] is the active one
  typedIndex: number;      // progress into the active parcel's code
  score: number;
  streak: number;
  bestStreak: number;
  parcelsMissed: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  lastKeyCorrect: boolean | null;
  lastRouted: { uid: number; region: ParcelRegion } | null;
}

type PostOfficeAction =
  | { type: 'START_COUNTDOWN' }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'BELT_TICK'; rand: [number, number] }
  | { type: 'KEY'; char: string }
  | { type: 'RESET' };

function init(): PostOfficeState {
  return {
    status: 'idle',
    countdown: 3,
    elapsed: 0,
    nextSpawnAt: 0,
    nextUid: 1,
    parcels: [],
    typedIndex: 0,
    score: 0,
    streak: 0,
    bestStreak: 0,
    parcelsMissed: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    lastKeyCorrect: null,
    lastRouted: null,
  };
}

export function spawnIntervalAt(elapsed: number): number {
  const t = Math.min(elapsed / ROUND_MS, 1);
  return Math.round(SPAWN_START_MS - (SPAWN_START_MS - SPAWN_END_MS) * t);
}

// First third: short codes only. Then mix in progressively longer codes.
export function tierAt(elapsed: number, rand: number): ParcelTier {
  if (elapsed < ROUND_MS / 3) return 1;
  if (elapsed < (ROUND_MS * 2) / 3) return rand < 0.5 ? 1 : 2;
  return rand < 0.5 ? 2 : 3;
}

function beltTick(state: PostOfficeState, rand: [number, number]): PostOfficeState {
  const elapsed = state.elapsed + TICK_MS;

  // Parcels that reached the end of the belt un-typed are misrouted.
  const remaining = state.parcels.filter((p) => elapsed - p.spawnedAt < BELT_MS);
  const missed = state.parcels.length - remaining.length;
  const activeDropped = missed > 0;

  const next: PostOfficeState = {
    ...state,
    elapsed,
    parcels: remaining,
    parcelsMissed: state.parcelsMissed + missed,
    streak: missed > 0 ? 0 : state.streak,
    typedIndex: activeDropped ? 0 : state.typedIndex,
  };

  // Round over: any in-flight parcel is abandoned, not counted either way.
  if (elapsed >= ROUND_MS) {
    return { ...next, status: 'complete', parcels: [], typedIndex: 0 };
  }

  if (elapsed >= state.nextSpawnAt && remaining.length < MAX_PARCELS) {
    const pool = parcelsForTier(tierAt(elapsed, rand[0]));
    const entry = pool[Math.floor(rand[1] * pool.length) % pool.length];
    return {
      ...next,
      parcels: [...remaining, { uid: state.nextUid, entry, spawnedAt: elapsed }],
      nextUid: state.nextUid + 1,
      nextSpawnAt: elapsed + spawnIntervalAt(elapsed),
    };
  }

  return next;
}

function keystroke(state: PostOfficeState, char: string): PostOfficeState {
  const active = state.parcels[0];
  if (!active) return state; // nothing on the belt to type at

  const expected = active.entry.code[state.typedIndex];
  if (char.toUpperCase() !== expected) {
    return {
      ...state,
      totalKeystrokes: state.totalKeystrokes + 1,
      lastKeyCorrect: false,
    };
  }

  const typedIndex = state.typedIndex + 1;
  const base = {
    ...state,
    correctKeystrokes: state.correctKeystrokes + 1,
    totalKeystrokes: state.totalKeystrokes + 1,
    lastKeyCorrect: true,
  };
  if (typedIndex < active.entry.code.length) return { ...base, typedIndex };

  const streak = state.streak + 1;
  return {
    ...base,
    parcels: state.parcels.slice(1),
    typedIndex: 0,
    score: state.score + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
    lastRouted: { uid: active.uid, region: active.entry.region },
  };
}

function reducer(state: PostOfficeState, action: PostOfficeAction): PostOfficeState {
  switch (action.type) {
    case 'START_COUNTDOWN':
      return { ...init(), status: 'countdown' };

    case 'COUNTDOWN_TICK':
      if (state.status !== 'countdown') return state;
      if (state.countdown > 1) return { ...state, countdown: state.countdown - 1 };
      return { ...state, status: 'playing' };

    case 'BELT_TICK':
      return state.status === 'playing' ? beltTick(state, action.rand) : state;

    case 'KEY':
      return state.status === 'playing' ? keystroke(state, action.char) : state;

    case 'RESET':
      return init();

    default:
      return state;
  }
}

export interface UsePostOfficeGameOptions {
  random?: () => number;
}

export interface UsePostOfficeGame {
  status: GameStatus;
  countdown: number;
  timeRemaining: number; // whole seconds
  activeParcel: BeltParcelView | null;
  queue: BeltParcelView[];
  typedIndex: number;
  score: number;
  streak: number;
  bestStreak: number;
  parcelsMissed: number;
  accuracy: number;
  lastKeyCorrect: boolean | null;
  lastRouted: { uid: number; region: ParcelRegion } | null;
  start: () => void;
  reset: () => void;
  recordKeystroke: (char: string) => void;
  result: PostOfficeRoundResult | null;
}

export function usePostOfficeGame({ random = Math.random }: UsePostOfficeGameOptions = {}): UsePostOfficeGame {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const randomRef = useRef(random);
  randomRef.current = random;

  useEffect(() => {
    if (state.status !== 'countdown') return;
    const id = setInterval(() => dispatch({ type: 'COUNTDOWN_TICK' }), 1000);
    return () => clearInterval(id);
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'playing') return;
    const id = setInterval(
      () => dispatch({ type: 'BELT_TICK', rand: [randomRef.current(), randomRef.current()] }),
      TICK_MS,
    );
    return () => clearInterval(id);
  }, [state.status]);

  const recordKeystroke = useCallback((char: string) => {
    dispatch({ type: 'KEY', char });
  }, []);

  useEffect(() => {
    if (state.status !== 'playing') return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Tab') { e.preventDefault(); return; }
      if (e.key.length !== 1) return;
      e.preventDefault(); // stop space/other keys scrolling the page
      recordKeystroke(e.key);
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, recordKeystroke]);

  const start = useCallback(() => dispatch({ type: 'START_COUNTDOWN' }), []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const views = useMemo(
    () =>
      state.parcels.map((p) => ({
        ...p,
        progress: Math.min((state.elapsed - p.spawnedAt) / BELT_MS, 1),
      })),
    [state.parcels, state.elapsed],
  );

  const accuracy =
    state.totalKeystrokes > 0
      ? Math.round((state.correctKeystrokes / state.totalKeystrokes) * 100)
      : 0;

  const result: PostOfficeRoundResult | null =
    state.status === 'complete'
      ? {
          score: state.score,
          parcelsMissed: state.parcelsMissed,
          accuracy,
          bestStreak: state.bestStreak,
        }
      : null;

  return {
    status: state.status,
    countdown: state.countdown,
    timeRemaining: Math.ceil((ROUND_MS - state.elapsed) / 1000),
    activeParcel: views[0] ?? null,
    queue: views.slice(1),
    typedIndex: state.typedIndex,
    score: state.score,
    streak: state.streak,
    bestStreak: state.bestStreak,
    parcelsMissed: state.parcelsMissed,
    accuracy,
    lastKeyCorrect: state.lastKeyCorrect,
    lastRouted: state.lastRouted,
    start,
    reset,
    recordKeystroke,
    result,
  };
}
