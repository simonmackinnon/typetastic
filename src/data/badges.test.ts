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
  bestPostOfficeScore: 0,
  totalParcelsRouted: 0,
};

describe('BADGES', () => {
  it('has 14 badges', () => {
    expect(BADGES).toHaveLength(14);
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

describe('Post Office badges', () => {
  const ids = (stats: PlayerStats) => checkNewBadges(stats, []).map((b) => b.id);

  it('Mail Sorter unlocks at 50 total parcels routed', () => {
    expect(ids({ ...emptyStats, totalParcelsRouted: 49 })).not.toContain('mail-sorter');
    expect(ids({ ...emptyStats, totalParcelsRouted: 50 })).toContain('mail-sorter');
  });

  it('Speed Sorter unlocks at a best single-round score of 20', () => {
    expect(ids({ ...emptyStats, bestPostOfficeScore: 19 })).not.toContain('speed-sorter');
    expect(ids({ ...emptyStats, bestPostOfficeScore: 20 })).toContain('speed-sorter');
  });

  it('a big Post Office round does not unlock level badges', () => {
    expect(ids({ ...emptyStats, totalParcelsRouted: 100, bestPostOfficeScore: 30 })).toEqual([
      'mail-sorter',
      'speed-sorter',
    ]);
  });
});
