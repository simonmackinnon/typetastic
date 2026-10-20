import { useEffect, useRef } from 'react';

// Building blocks shared by the arcade game hooks (Post Office, Rockets,
// Factories). Each hook keeps its own reducer; these are the parts that
// should behave identically in every game.

export const ROUND_MS = 60_000;     // length of a timed round
export const TICK_MS = 100;         // game-loop interval
export const COUNTDOWN_FROM = 3;    // the 3-2-1 before a round starts
export const COUNTDOWN_STEP_MS = 1000;

/** Whether a typed character matches the expected one, ignoring letter case. */
export function matchesKey(expected: string | undefined, typed: string): boolean {
  return expected !== undefined && typed.toUpperCase() === expected.toUpperCase();
}

/** Correct keystrokes as a whole 0-100 percentage; 0 before any are typed. */
export function accuracyPercent(correct: number, total: number): number {
  return total > 0 ? Math.round((correct / total) * 100) : 0;
}

/**
 * The next countdown value after one step, or null when the countdown is over
 * and the round should start.
 */
export function countdownStep(countdown: number): number | null {
  return countdown > 1 ? countdown - 1 : null;
}

/**
 * The character a keydown should feed into a game, or null to ignore it.
 * Modifier chords and non-character keys are ignored; Tab is swallowed so it
 * can't move focus out of the game. Keys that are used are prevented from
 * doing their default (e.g. space scrolling the page).
 */
export function gameKeyFromEvent(e: KeyboardEvent): string | null {
  if (e.ctrlKey || e.metaKey || e.altKey) return null;
  if (e.key === 'Tab') { e.preventDefault(); return null; }
  if (e.key.length !== 1) return null;
  e.preventDefault();
  return e.key;
}

/** Runs `callback` every `ms` while `active`; always calls the latest callback. */
export function useGameInterval(active: boolean, callback: () => void, ms: number) {
  const ref = useRef(callback);
  ref.current = callback;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => ref.current(), ms);
    return () => clearInterval(id);
  }, [active, ms]);
}

/** Feeds window keydowns, filtered by gameKeyFromEvent, to `onChar` while `active`. */
export function useGameKeyboard(active: boolean, onChar: (char: string) => void) {
  const ref = useRef(onChar);
  ref.current = onChar;
  useEffect(() => {
    if (!active) return;
    function handleKeyDown(e: KeyboardEvent) {
      const char = gameKeyFromEvent(e);
      if (char !== null) ref.current(char);
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active]);
}
