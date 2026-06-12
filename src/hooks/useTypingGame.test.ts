import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useTypingGame } from './useTypingGame';

describe('useTypingGame', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it('starts in idle status', () => {
    const { result } = renderHook(() => useTypingGame('hello', 80));
    expect(result.current.status).toBe('idle');
  });

  it('moves to countdown after start()', () => {
    const { result } = renderHook(() => useTypingGame('hello', 80));
    act(() => result.current.start());
    expect(result.current.status).toBe('countdown');
  });

  it('moves to playing after countdown', () => {
    const { result } = renderHook(() => useTypingGame('hi', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    expect(result.current.status).toBe('playing');
  });

  it('tracks currentIndex after correct key', () => {
    const { result } = renderHook(() => useTypingGame('ab', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    expect(result.current.currentIndex).toBe(1);
  });

  it('does not advance on wrong key', () => {
    const { result } = renderHook(() => useTypingGame('ab', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'z' }));
    });

    expect(result.current.currentIndex).toBe(0);
  });

  it('completes when all characters typed', () => {
    const { result } = renderHook(() => useTypingGame('hi', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'h' })); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'i' })); });

    expect(result.current.status).toBe('complete');
  });

  it('resets to idle after reset()', () => {
    const { result } = renderHook(() => useTypingGame('hi', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));
    act(() => result.current.reset());
    expect(result.current.status).toBe('idle');
    expect(result.current.currentIndex).toBe(0);
  });

  it('computes result after completion', () => {
    const { result } = renderHook(() => useTypingGame('a', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    });

    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.accuracy).toBeGreaterThan(0);
  });

  it('100% accuracy when no errors', () => {
    const { result } = renderHook(() => useTypingGame('abc', 80));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3000));

    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' })); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' })); });
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'c' })); });

    expect(result.current.result?.accuracy).toBe(100);
  });
});
