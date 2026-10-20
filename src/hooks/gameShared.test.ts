import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import {
  matchesKey, accuracyPercent, countdownStep, gameKeyFromEvent, useGameInterval, useGameKeyboard, COUNTDOWN_FROM,
} from './gameShared';

function keydown(key: string, mods: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey'>> = {}) {
  return new KeyboardEvent('keydown', { key, cancelable: true, ...mods });
}

describe('matchesKey', () => {
  it('matches letters regardless of case', () => {
    expect(matchesKey('A', 'a')).toBe(true);
    expect(matchesKey('A', 'A')).toBe(true);
    expect(matchesKey('a', 'A')).toBe(true);
  });

  it('rejects a different character', () => {
    expect(matchesKey('A', 'b')).toBe(false);
    expect(matchesKey('1', '2')).toBe(false);
  });

  it('rejects anything when nothing is expected', () => {
    expect(matchesKey(undefined, 'a')).toBe(false);
  });
});

describe('accuracyPercent', () => {
  it('is 0 before any keystrokes', () => expect(accuracyPercent(0, 0)).toBe(0));
  it('rounds to a whole percentage', () => expect(accuracyPercent(2, 3)).toBe(67));
});

describe('countdownStep', () => {
  it('counts 3 -> 2 -> 1 -> done', () => {
    expect(COUNTDOWN_FROM).toBe(3);
    expect(countdownStep(3)).toBe(2);
    expect(countdownStep(2)).toBe(1);
    expect(countdownStep(1)).toBeNull();
  });
});

describe('gameKeyFromEvent', () => {
  it('passes printable characters through and prevents their default', () => {
    const e = keydown('a');
    expect(gameKeyFromEvent(e)).toBe('a');
    expect(e.defaultPrevented).toBe(true);

    const space = keydown(' ');
    expect(gameKeyFromEvent(space)).toBe(' ');
    expect(space.defaultPrevented).toBe(true);
  });

  it('ignores modifier chords without preventing them', () => {
    for (const mod of ['ctrlKey', 'metaKey', 'altKey'] as const) {
      const e = keydown('c', { [mod]: true });
      expect(gameKeyFromEvent(e)).toBeNull();
      expect(e.defaultPrevented).toBe(false);
    }
  });

  it('swallows Tab so focus stays in the game', () => {
    const e = keydown('Tab');
    expect(gameKeyFromEvent(e)).toBeNull();
    expect(e.defaultPrevented).toBe(true);
  });

  it('ignores non-character keys', () => {
    for (const key of ['Shift', 'Enter', 'Backspace', 'ArrowLeft']) {
      expect(gameKeyFromEvent(keydown(key))).toBeNull();
    }
  });
});

describe('useGameKeyboard', () => {
  it('feeds filtered keys only while active', () => {
    const onChar = vi.fn();
    const { rerender, unmount } = renderHook(({ active }) => useGameKeyboard(active, onChar), {
      initialProps: { active: false },
    });
    window.dispatchEvent(keydown('a'));
    expect(onChar).not.toHaveBeenCalled();

    rerender({ active: true });
    window.dispatchEvent(keydown('b'));
    window.dispatchEvent(keydown('Shift'));
    window.dispatchEvent(keydown('c', { ctrlKey: true }));
    expect(onChar.mock.calls).toEqual([['b']]);

    unmount();
    window.dispatchEvent(keydown('d'));
    expect(onChar).toHaveBeenCalledTimes(1);
  });
});

describe('useGameInterval', () => {
  afterEach(() => vi.useRealTimers());

  it('ticks only while active', () => {
    vi.useFakeTimers();
    const tick = vi.fn();
    const { rerender } = renderHook(({ active }) => useGameInterval(active, tick, 100), {
      initialProps: { active: true },
    });
    vi.advanceTimersByTime(350);
    expect(tick).toHaveBeenCalledTimes(3);

    rerender({ active: false });
    vi.advanceTimersByTime(500);
    expect(tick).toHaveBeenCalledTimes(3);
  });
});
