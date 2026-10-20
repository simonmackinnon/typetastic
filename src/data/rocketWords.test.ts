import { describe, it, expect } from 'vitest';
import { ROCKET_WORDS, wordsForTier } from './rocketWords';

describe('ROCKET_WORDS', () => {
  it('each word has a unique id', () => {
    const ids = ROCKET_WORDS.map((w) => w.id);
    expect(new Set(ids).size).toBe(ROCKET_WORDS.length);
  });

  it('each word is unique', () => {
    const words = ROCKET_WORDS.map((w) => w.word);
    expect(new Set(words).size).toBe(ROCKET_WORDS.length);
  });

  it('words are uppercase letters only', () => {
    ROCKET_WORDS.forEach((w) => {
      expect(w.word).toMatch(/^[A-Z]+$/);
    });
  });

  it('every tier has at least 15 words', () => {
    for (const tier of [1, 2, 3] as const) {
      expect(wordsForTier(tier).length).toBeGreaterThanOrEqual(15);
    }
  });

  it('word length matches the tier', () => {
    expect(wordsForTier(1).every((w) => w.word.length >= 3 && w.word.length <= 4)).toBe(true);
    expect(wordsForTier(2).every((w) => w.word.length >= 5 && w.word.length <= 6)).toBe(true);
    expect(wordsForTier(3).every((w) => w.word.length >= 7)).toBe(true);
  });
});
