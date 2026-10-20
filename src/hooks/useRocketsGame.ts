import { useCallback, useReducer, useRef } from 'react';
import type { GameRoundResult, GameStatus } from '../types';
import { wordsForTier, type RocketWord, type RocketWordTier } from '../data/rocketWords';
import {
  ROUND_MS, TICK_MS, COUNTDOWN_FROM, COUNTDOWN_STEP_MS,
  matchesKey, accuracyPercent, countdownStep, useGameInterval, useGameKeyboard,
} from './gameShared';

export { ROUND_MS, TICK_MS };
export const FUEL_START = 40;           // % in the tank when the round starts
export const FUEL_MAX = 100;
export const FUEL_PER_LETTER = 4;       // % added per correct letter
export const DRAIN_PER_S = 6;           // % drained per second at the first stage...
export const DRAIN_STAGE_STEP = 0.1;    // ...plus 10% of that for every stage reached
export const CLIMB_KM_PER_S = 10;       // climb speed with a full tank; scales with fuel
export const EMPTY_LIMIT_MS = 5_000;    // continuous time at 0 fuel that ends the round

// Altitude thresholds, in km. The stage index is what the hook reports.
export const STAGES = [
  { name: 'Sky', km: 0 },
  { name: 'Clouds', km: 50 },
  { name: 'Space', km: 150 },
  { name: 'Satellites', km: 300 },
  { name: 'Moon', km: 500 },
] as const;

// Word tiers on offer at each stage; one is picked at random. Longer words
// appear as the rocket climbs.
export const TIER_MIX: readonly (readonly RocketWordTier[])[] = [
  [1],
  [1, 2],
  [1, 2, 3],
  [2, 3],
  [2, 3, 3],
];

export type RocketsEndReason = 'time' | 'fuel';

export interface RocketsRoundResult extends GameRoundResult {
  score: number;        // altitude reached, whole km
  accuracy: number;     // correct keystrokes / total keystrokes, as a 0-100 percentage
  bestStreak: number;   // most words in a row typed without a mistake
  wordsTyped: number;
  stage: number;        // index into STAGES
  endedBy: RocketsEndReason;
}

interface RocketsState {
  status: GameStatus;
  countdown: number;
  elapsed: number;
  fuel: number;
  altitude: number;
  stage: number;
  emptyFor: number;        // ms continuously at 0 fuel
  activeWord: RocketWord | null;
  nextWord: RocketWord | null;
  typedIndex: number;      // progress into the active word
  wordHadMistake: boolean;
  streak: number;
  bestStreak: number;
  wordsTyped: number;
  correctKeystrokes: number;
  totalKeystrokes: number;
  lastKeyCorrect: boolean | null;
  endedBy: RocketsEndReason | null;
}

type Rand = [number, number];

type RocketsAction =
  | { type: 'START_COUNTDOWN'; rand: [number, number, number, number] }
  | { type: 'COUNTDOWN_TICK' }
  | { type: 'TICK' }
  | { type: 'KEY'; char: string; rand: Rand }
  | { type: 'RESET' };

function init(): RocketsState {
  return {
    status: 'idle',
    countdown: COUNTDOWN_FROM,
    elapsed: 0,
    fuel: FUEL_START,
    altitude: 0,
    stage: 0,
    emptyFor: 0,
    activeWord: null,
    nextWord: null,
    typedIndex: 0,
    wordHadMistake: false,
    streak: 0,
    bestStreak: 0,
    wordsTyped: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    lastKeyCorrect: null,
    endedBy: null,
  };
}

/** Fuel drained per second at a stage. */
export function drainRate(stage: number): number {
  return DRAIN_PER_S * (1 + DRAIN_STAGE_STEP * stage);
}

/** The highest stage whose threshold the altitude has reached. */
export function stageForAltitude(km: number): number {
  let stage = 0;
  STAGES.forEach((s, i) => { if (km >= s.km) stage = i; });
  return stage;
}

export function tierForStage(stage: number, rand: number): RocketWordTier {
  const mix = TIER_MIX[Math.min(stage, TIER_MIX.length - 1)];
  return mix[Math.floor(rand * mix.length) % mix.length];
}

/** A random word for the stage, never the same word as `avoid`. */
export function pickWord(stage: number, [tierRand, wordRand]: Rand, avoid?: RocketWord | null): RocketWord {
  const pool = wordsForTier(tierForStage(stage, tierRand));
  let i = Math.floor(wordRand * pool.length) % pool.length;
  if (pool[i].id === avoid?.id) i = (i + 1) % pool.length;
  return pool[i];
}

function tick(state: RocketsState): RocketsState {
  const elapsed = state.elapsed + TICK_MS;
  const seconds = TICK_MS / 1000;
  const fuel = Math.max(0, state.fuel - drainRate(state.stage) * seconds);
  const altitude = state.altitude + CLIMB_KM_PER_S * (fuel / FUEL_MAX) * seconds;
  const emptyFor = fuel === 0 ? state.emptyFor + TICK_MS : 0;
  const next = { ...state, elapsed, fuel, altitude, stage: stageForAltitude(altitude), emptyFor };

  if (emptyFor >= EMPTY_LIMIT_MS) return { ...next, status: 'complete', endedBy: 'fuel' };
  if (elapsed >= ROUND_MS) return { ...next, status: 'complete', endedBy: 'time' };
  return next;
}

function keystroke(state: RocketsState, char: string, rand: Rand): RocketsState {
  const active = state.activeWord;
  if (!active) return state;

  if (!matchesKey(active.word[state.typedIndex], char)) {
    return {
      ...state,
      totalKeystrokes: state.totalKeystrokes + 1,
      lastKeyCorrect: false,
      wordHadMistake: true,
      streak: 0,
    };
  }

  const typedIndex = state.typedIndex + 1;
  const base = {
    ...state,
    fuel: Math.min(FUEL_MAX, state.fuel + FUEL_PER_LETTER),
    emptyFor: 0,
    correctKeystrokes: state.correctKeystrokes + 1,
    totalKeystrokes: state.totalKeystrokes + 1,
    lastKeyCorrect: true,
  };
  if (typedIndex < active.word.length) return { ...base, typedIndex };

  // Word finished: the preview moves in and a new preview is picked.
  const streak = state.wordHadMistake ? 0 : state.streak + 1;
  const activeWord = state.nextWord ?? pickWord(state.stage, rand, active);
  return {
    ...base,
    activeWord,
    nextWord: pickWord(state.stage, rand, activeWord),
    typedIndex: 0,
    wordHadMistake: false,
    wordsTyped: state.wordsTyped + 1,
    streak,
    bestStreak: Math.max(state.bestStreak, streak),
  };
}

function reducer(state: RocketsState, action: RocketsAction): RocketsState {
  switch (action.type) {
    case 'START_COUNTDOWN': {
      const [a, b, c, d] = action.rand;
      const activeWord = pickWord(0, [a, b]);
      return { ...init(), status: 'countdown', activeWord, nextWord: pickWord(0, [c, d], activeWord) };
    }

    case 'COUNTDOWN_TICK': {
      if (state.status !== 'countdown') return state;
      const countdown = countdownStep(state.countdown);
      return countdown === null ? { ...state, status: 'playing' } : { ...state, countdown };
    }

    case 'TICK':
      return state.status === 'playing' ? tick(state) : state;

    case 'KEY':
      return state.status === 'playing' ? keystroke(state, action.char, action.rand) : state;

    case 'RESET':
      return init();

    default:
      return state;
  }
}

export interface UseRocketsGameOptions {
  random?: () => number;
}

export interface UseRocketsGame {
  status: GameStatus;
  countdown: number;
  timeRemaining: number; // whole seconds
  fuel: number;          // 0-100
  altitude: number;      // km
  stage: number;         // index into STAGES
  activeWord: RocketWord | null;
  nextWord: RocketWord | null;
  typedIndex: number;
  lastKeyCorrect: boolean | null;
  streak: number;
  bestStreak: number;
  wordsTyped: number;
  accuracy: number;
  emptyFor: number;      // ms continuously at 0 fuel
  start: () => void;
  reset: () => void;
  recordKeystroke: (char: string) => void;
  result: RocketsRoundResult | null;
}

export function useRocketsGame({ random = Math.random }: UseRocketsGameOptions = {}): UseRocketsGame {
  const [state, dispatch] = useReducer(reducer, undefined, init);
  const randomRef = useRef(random);
  randomRef.current = random;

  useGameInterval(state.status === 'countdown', () => dispatch({ type: 'COUNTDOWN_TICK' }), COUNTDOWN_STEP_MS);
  useGameInterval(state.status === 'playing', () => dispatch({ type: 'TICK' }), TICK_MS);

  const recordKeystroke = useCallback((char: string) => {
    const r = randomRef.current;
    dispatch({ type: 'KEY', char, rand: [r(), r()] });
  }, []);

  useGameKeyboard(state.status === 'playing', recordKeystroke);

  const start = useCallback(() => {
    const r = randomRef.current;
    dispatch({ type: 'START_COUNTDOWN', rand: [r(), r(), r(), r()] });
  }, []);
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  const accuracy = accuracyPercent(state.correctKeystrokes, state.totalKeystrokes);

  const result: RocketsRoundResult | null =
    state.status === 'complete' && state.endedBy
      ? {
          score: Math.floor(state.altitude),
          accuracy,
          bestStreak: state.bestStreak,
          wordsTyped: state.wordsTyped,
          stage: state.stage,
          endedBy: state.endedBy,
        }
      : null;

  return {
    status: state.status,
    countdown: state.countdown,
    timeRemaining: Math.max(0, Math.ceil((ROUND_MS - state.elapsed) / 1000)),
    fuel: state.fuel,
    altitude: state.altitude,
    stage: state.stage,
    activeWord: state.activeWord,
    nextWord: state.nextWord,
    typedIndex: state.typedIndex,
    lastKeyCorrect: state.lastKeyCorrect,
    streak: state.streak,
    bestStreak: state.bestStreak,
    wordsTyped: state.wordsTyped,
    accuracy,
    emptyFor: state.emptyFor,
    start,
    reset,
    recordKeystroke,
    result,
  };
}
