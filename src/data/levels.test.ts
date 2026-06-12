import { describe, it, expect } from 'vitest';
import { LEVELS, LEVEL_BY_ID, ZONES, starsForAccuracy } from './levels';

describe('LEVELS data', () => {
  it('has exactly 20 levels', () => {
    expect(LEVELS).toHaveLength(20);
  });

  it('levels are numbered 1-20 sequentially', () => {
    LEVELS.forEach((level, i) => {
      expect(level.number).toBe(i + 1);
    });
  });

  it('each level has a unique id', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(20);
  });

  it('each level has at least one exercise', () => {
    LEVELS.forEach((level) => {
      expect(level.exercises.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('each exercise has a non-empty target string', () => {
    LEVELS.forEach((level) => {
      level.exercises.forEach((ex) => {
        expect(ex.target.length).toBeGreaterThan(0);
      });
    });
  });

  it('zone numbers are 1-6', () => {
    LEVELS.forEach((level) => {
      expect(level.zone).toBeGreaterThanOrEqual(1);
      expect(level.zone).toBeLessThanOrEqual(6);
    });
  });

  it('requiredAccuracy is between 50 and 100', () => {
    LEVELS.forEach((level) => {
      expect(level.requiredAccuracy).toBeGreaterThanOrEqual(50);
      expect(level.requiredAccuracy).toBeLessThanOrEqual(100);
    });
  });
});

describe('LEVEL_BY_ID', () => {
  it('returns level by string id', () => {
    expect(LEVEL_BY_ID['01'].number).toBe(1);
    expect(LEVEL_BY_ID['10'].number).toBe(10);
    expect(LEVEL_BY_ID['20'].number).toBe(20);
  });

  it('has 20 entries', () => {
    expect(Object.keys(LEVEL_BY_ID)).toHaveLength(20);
  });
});

describe('ZONES', () => {
  it('has 6 zones', () => {
    expect(ZONES).toHaveLength(6);
  });

  it('zone numbers are 1-6', () => {
    ZONES.forEach((z, i) => {
      expect(z.zone).toBe(i + 1);
    });
  });
});

describe('starsForAccuracy', () => {
  it('returns 0 if below required accuracy', () => {
    expect(starsForAccuracy(60, 70)).toBe(0);
    expect(starsForAccuracy(69, 70)).toBe(0);
  });

  it('returns 1 star for accuracy between required and 85%', () => {
    expect(starsForAccuracy(70, 70)).toBe(1);
    expect(starsForAccuracy(80, 70)).toBe(1);
    expect(starsForAccuracy(84, 70)).toBe(1);
  });

  it('returns 2 stars for accuracy between 85% and 94%', () => {
    expect(starsForAccuracy(85, 70)).toBe(2);
    expect(starsForAccuracy(90, 70)).toBe(2);
    expect(starsForAccuracy(94, 70)).toBe(2);
  });

  it('returns 3 stars for 95% and above', () => {
    expect(starsForAccuracy(95, 70)).toBe(3);
    expect(starsForAccuracy(100, 70)).toBe(3);
  });
});
