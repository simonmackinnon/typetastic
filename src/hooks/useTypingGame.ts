import { useCallback, useEffect, useReducer, useRef } from 'react';
import type { GameStatus, TypingResult } from '../types';
import { starsForAccuracy } from '../data/levels';

interface TypingState {
  status: GameStatus;
  target: string;
  typed: string;
  currentIndex: number;
  errorCount: number;
  totalKeystrokes: number;
  startTime: number | null;
  endTime: number | null;
  countdown: number;
  lastKeyCorrect: boolean | null;
}

type TypingAction =
  | { type: 'SET_TARGET'; target: string }
  | { type: 'START_COUNTDOWN' }
  | { type: 'TICK' }
  | { type: 'KEY_CORRECT'; char: string }
  | { type: 'KEY_WRONG' }
  | { type: 'COMPLETE' }
  | { type: 'RESET' };

function init(target: string): TypingState {
  return {
    status: 'idle',
    target,
    typed: '',
    currentIndex: 0,
    errorCount: 0,
    totalKeystrokes: 0,
    startTime: null,
    endTime: null,
    countdown: 3,
    lastKeyCorrect: null,
  };
}

function reducer(state: TypingState, action: TypingAction): TypingState {
  switch (action.type) {
    case 'SET_TARGET':
      return init(action.target);

    case 'START_COUNTDOWN':
      return { ...state, status: 'countdown', countdown: 3 };

    case 'TICK':
      if (state.countdown > 1) return { ...state, countdown: state.countdown - 1 };
      return { ...state, status: 'playing', startTime: Date.now() };

    case 'KEY_CORRECT': {
      const nextIndex = state.currentIndex + 1;
      const done = nextIndex >= state.target.length;
      return {
        ...state,
        typed: state.typed + action.char,
        currentIndex: nextIndex,
        totalKeystrokes: state.totalKeystrokes + 1,
        lastKeyCorrect: true,
        status: done ? 'complete' : 'playing',
        endTime: done ? Date.now() : null,
      };
    }

    case 'KEY_WRONG':
      return {
        ...state,
        errorCount: state.errorCount + 1,
        totalKeystrokes: state.totalKeystrokes + 1,
        lastKeyCorrect: false,
      };

    case 'COMPLETE':
      return { ...state, status: 'complete', endTime: Date.now() };

    case 'RESET':
      return init(state.target);

    default:
      return state;
  }
}

export interface UseTypingGame {
  status: GameStatus;
  target: string;
  typed: string;
  currentIndex: number;
  lastKeyCorrect: boolean | null;
  countdown: number;
  currentChar: string;
  wpm: number;
  accuracy: number;
  start: () => void;
  reset: () => void;
  result: TypingResult | null;
}

export function useTypingGame(target: string, requiredAccuracy: number): UseTypingGame {
  const [state, dispatch] = useReducer(reducer, target, init);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    dispatch({ type: 'SET_TARGET', target });
  }, [target]);

  useEffect(() => {
    if (state.status !== 'countdown') return;
    countdownRef.current = setInterval(() => dispatch({ type: 'TICK' }), 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [state.status]);

  useEffect(() => {
    if (state.status !== 'playing') return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'Tab') { e.preventDefault(); return; }

      const expected = state.target[state.currentIndex];
      if (e.key === expected) {
        dispatch({ type: 'KEY_CORRECT', char: e.key });
      } else if (e.key.length === 1) {
        dispatch({ type: 'KEY_WRONG' });
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.status, state.target, state.currentIndex]);

  const start = useCallback(() => {
    dispatch({ type: 'START_COUNTDOWN' });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const elapsedSeconds =
    state.startTime && state.endTime
      ? (state.endTime - state.startTime) / 1000
      : state.startTime
      ? (Date.now() - state.startTime) / 1000
      : 0;

  const wpm =
    elapsedSeconds > 0
      ? Math.round((state.currentIndex / 5) / (elapsedSeconds / 60))
      : 0;

  const accuracy =
    state.totalKeystrokes > 0
      ? Math.round(((state.totalKeystrokes - state.errorCount) / state.totalKeystrokes) * 100)
      : 100;

  const result: TypingResult | null =
    state.status === 'complete'
      ? {
          accuracy,
          wpm,
          stars: starsForAccuracy(accuracy, requiredAccuracy),
          timeSeconds: Math.round(elapsedSeconds),
          errorCount: state.errorCount,
        }
      : null;

  return {
    status: state.status,
    target: state.target,
    typed: state.typed,
    currentIndex: state.currentIndex,
    lastKeyCorrect: state.lastKeyCorrect,
    countdown: state.countdown,
    currentChar: state.target[state.currentIndex] ?? '',
    wpm,
    accuracy,
    start,
    reset,
    result,
  };
}
