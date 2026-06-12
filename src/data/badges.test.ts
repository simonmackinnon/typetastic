import { describe, it, expect } from 'vitest';
import { BADGES, checkNewBadges } from './badges';
import type { PlayerStats } from '../types';

const emptyStats: PlayerStats = {
  totalStars: 0,
  levelsCompleted: 0,
  highestLevel: 0,
  bestWpm: 0,
  totalTimeMinutes: 0,
  badgesEarned: [],
};

describe('BADGES', () => {
  it('has 12 badges', () => {
    expect(BADGES).toHaveLength(12);
  });

  it('each badge has unique id', () => {
    const ids = BADGES.map((b) => b.id);
    expect(new Set(ids).size).toBe(BADGES.length);
  });

  it('each badge has icon, name, description', () => {
    BADGES.forEach((badge) => {
      expect(badge.icon.length).toBeGreaterThan(0);
      expect(badge.name.length).toBeGreaterThan(0);
      expect(badge.description.length).toBeGreaterThan(0);
    });
  });
});

describe('checkNewBadges', () => {
  it('returns no badges for empty stats', () => {
    const result = checkNewBadges(emptyStats, []);
    expect(result).toHaveLength(0);
  });

  it('awards first-keystroke badge when level 1 is completed', () => {
    const stats = { ...emptyStats, levelsCompleted: 1 };
    const result = checkNewBadges(stats, []);
    expect(result.some((b) => b.id === 'first-keystroke')).toBe(true);
  });

  it('awards home-row-hero badge at level 4', () => {
    const stats = { ...emptyStats, levelsCompleted: 4, highestLevel: 4 };
    const result = checkNewBadges(stats, []);
    expect(result.some((b) => b.id === 'home-row-hero')).toBe(true);
  });

  it('awards speed-star at 25 WPM', () => {
    const stats = { ...emptyStats, bestWpm: 25 };
    const result = checkNewBadges(stats, []);
    expect(result.some((b) => b.id === 'speed-star')).toBe(true);
  });

  it('does not re-award already earned badges', () => {
    const stats = { ...emptyStats, levelsCompleted: 1 };
    const result = checkNewBadges(stats, ['first-keystroke']);
    expect(result.some((b) => b.id === 'first-keystroke')).toBe(false);
  });

  it('awards touch-type-master when all 20 levels completed', () => {
    const stats = { ...emptyStats, levelsCompleted: 20 };
    const result = checkNewBadges(stats, []);
    expect(result.some((b) => b.id === 'touch-type-master')).toBe(true);
  });
});
