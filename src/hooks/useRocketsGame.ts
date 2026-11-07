import { useCallback, useReducer, useRef } from 'react';
import type { GameRoundResult, GameStatus } from '../types';
import { wordsForTier, type RocketWord, type RocketWordTier } from '../data/rocketWords';
import {
  ROUND_MS, TICK_MS, COUNTDOWN_FROM, COUNTDOWN_STEP_MS,
  matchesKey, accuracyPercent, countdownStep, useGameInterval, useGameKeyboard,
} from './gameShared';

export { ROUND_MS, TICK_MS };
// Each completed word fires a thrust; drag slows the rocket between words (TYP-26).
export const THRUST_PER_LETTER = 1.1;  // km/s added per letter of a completed word
export const MAX_SPEED = 15;           // km/s; caps a round at ~800 km, under the API's 1,000 km limit
export const DRAG_PER_S = 0.25;        // fraction of its speed the rocket loses per second
export const LAUNCH_SPEED = 5;         // km/s at the start of the round
export const STALL_SPEED = 1;          // below this the rocket is stalling...
export const STALL_LIMIT_MS = 5_000;   // ...and this long stalling ends the round

// Altitude thresholds, in km. The stage index is what the hook reports.
export const STAGES = [
  { name: 'Sky', km: 0 },
  { name: 'Clouds', km: 50 },
  { name: 'Space', km: 150 },
  { name: 'Satellites', km: 300 },
  { name: 'Moon', km: 500 },
] as const;

// Word tiers on offer at each stage; one is picked at random. Longer words
// appear as the rocket climbs (and give bigger thrusts).
export const TIER_MIX: readonly (readonly RocketWordTier[])[] = [
  [1],
  [1, 2],
  [1, 2, 3],
  [2, 3],
  [2, 3, 3],
];

export type RocketsEndReason = 'time' | 'stall';

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
  speed: number;           // km/s
  altitude: number;
  stage: number;
  stallFor: number;        // ms continuously below STALL_SPEED
  activeWord: RocketWord | null;
  nextWord: RocketWord | null;
  typedIndex: number;      // progress into the active word
  wordHadMistake: boolean;
  streak: number;
  bestStreak: number;
  wordsTyped: number;
  lastThrust: number;      // km/s added by the last completed word (0 before any)
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
    speed: LAUNCH_SPEED,
    altitude: 0,
    stage: 0,
    stallFor: 0,
    activeWord: null,
    nextWord: null,
    typedIndex: 0,
    wordHadMistake: false,
    streak: 0,
    bestStreak: 0,
    wordsTyped: 0,
    lastThrust: 0,
    correctKeystrokes: 0,
    totalKeystrokes: 0,
    lastKeyCorrect: null,
    endedBy: null,
  };
}

/** Speed added by completing a word: bigger words give bigger kicks. */
export function thrustFor(word: string): number {
  return THRUST_PER_LETTER * word.length;
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
  const speed = state.speed * (1 - DRAG_PER_S * seconds);
  const altitude = state.altitude + speed * seconds;
  const stallFor = speed < STALL_SPEED ? state.stallFor + TICK_MS : 0;
  const next = { ...state, elapsed, speed, altitude, stage: stageForAltitude(altitude), stallFor };

  if (stallFor >= STALL_LIMIT_MS) return { ...next, status: 'complete', endedBy: 'stall' };
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
    correctKeystrokes: state.correctKeystrokes + 1,
    totalKeystrokes: state.totalKeystrokes + 1,
    lastKeyCorrect: true,
  };
  if (typedIndex < active.word.length) return { ...base, typedIndex };

  // Word finished: thrust! The preview moves in and a new preview is picked.
  const thrust = thrustFor(active.word);
  const speed = Math.min(MAX_SPEED, state.speed + thrust);
  const streak = state.wordHadMistake ? 0 : state.streak + 1;
  const activeWord = state.nextWord ?? pickWord(state.stage, rand, active);
  return {
    ...base,
    speed,
    stallFor: speed < STALL_SPEED ? state.stallFor : 0,
    lastThrust: thrust,
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
  speed: number;         // km/s
  altitude: number;      // km
  stage: number;         // index into STAGES
  activeWord: RocketWord | null;
  nextWord: RocketWord | null;
  typedIndex: number;
  lastKeyCorrect: boolean | null;
  streak: number;
  bestStreak: number;
  wordsTyped: number;    // also counts thrusts: each completed word fires one
  lastThrust: number;    // km/s added by the last thrust
  accuracy: number;
  stallFor: number;      // ms continuously below STALL_SPEED
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
    speed: state.speed,
    altitude: state.altitude,
    stage: state.stage,
    activeWord: state.activeWord,
    nextWord: state.nextWord,
    typedIndex: state.typedIndex,
    lastKeyCorrect: state.lastKeyCorrect,
    streak: state.streak,
    bestStreak: state.bestStreak,
    wordsTyped: state.wordsTyped,
    lastThrust: state.lastThrust,
    accuracy,
    stallFor: state.stallFor,
    start,
    reset,
    recordKeystroke,
    result,
  };
}
