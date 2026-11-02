import { describe, it, expect } from 'vitest';
import { BADGES, checkNewBadges } from './badges';
import { zeroGameStats } from './games';
import type { PlayerStats } from '../types';

const emptyStats: PlayerStats = {
  totalStars: 0,
  levelsCompleted: 0,
  highestLevel: 0,
  bestWpm: 0,
  totalTimeMinutes: 0,
  badgesEarned: [],
  games: zeroGameStats(),
};

describe('BADGES', () => {
  it('has 16 badges', () => {
    expect(BADGES).toHaveLength(16);
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
  const po = (best: number, total: number): PlayerStats => ({
    ...emptyStats,
    games: { ...zeroGameStats(), 'post-office': { best, total } },
  });

  it('Mail Sorter unlocks at 50 total parcels routed', () => {
    expect(ids(po(0, 49))).not.toContain('mail-sorter');
    expect(ids(po(0, 50))).toContain('mail-sorter');
  });

  it('Speed Sorter unlocks at a best single-round score of 20', () => {
    expect(ids(po(19, 0))).not.toContain('speed-sorter');
    expect(ids(po(20, 0))).toContain('speed-sorter');
  });

  it('a big Post Office round does not unlock level badges', () => {
    expect(ids(po(30, 100))).toEqual([
      'mail-sorter',
      'speed-sorter',
    ]);
  });
});

describe('Rockets badges', () => {
  const ids = (stats: PlayerStats) => checkNewBadges(stats, []).map((b) => b.id);
  const rk = (best: number, total: number): PlayerStats => ({
    ...emptyStats,
    games: { ...zeroGameStats(), rockets: { best, total } },
  });

  it('Moonshot unlocks at a best single-round altitude of 500 km', () => {
    expect(ids(rk(499, 0))).not.toContain('moonshot');
    expect(ids(rk(500, 0))).toContain('moonshot');
  });

  it('Star Pilot unlocks at 2,000 km flown in total', () => {
    expect(ids(rk(0, 1999))).not.toContain('star-pilot');
    expect(ids(rk(0, 2000))).toContain('star-pilot');
  });

  it('a big Rockets round unlocks only Rockets badges', () => {
    expect(ids(rk(600, 5000))).toEqual(['moonshot', 'star-pilot']);
  });

  it('Post Office scores do not unlock Rockets badges', () => {
    const po: PlayerStats = { ...emptyStats, games: { ...zeroGameStats(), 'post-office': { best: 600, total: 5000 } } };
    expect(ids(po)).not.toContain('moonshot');
    expect(ids(po)).not.toContain('star-pilot');
  });
});
