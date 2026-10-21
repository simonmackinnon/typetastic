import { describe, it, expect } from 'vitest';
import { FACTORY_TOYS, toysForTier } from './factoryOrders';

describe('FACTORY_TOYS', () => {
  it('each toy has a unique id', () => {
    const ids = FACTORY_TOYS.map((t) => t.id);
    expect(new Set(ids).size).toBe(FACTORY_TOYS.length);
  });

  it('parts are uppercase letters only', () => {
    FACTORY_TOYS.forEach((t) => {
      t.parts.forEach((p) => expect(p).toMatch(/^[A-Z]+$/));
    });
  });

  it('every toy has a name and an icon', () => {
    FACTORY_TOYS.forEach((t) => {
      expect(t.name.length).toBeGreaterThan(0);
      expect(t.icon.length).toBeGreaterThan(0);
    });
  });

  it('every tier has at least 6 toys', () => {
    for (const tier of [1, 2, 3] as const) {
      expect(toysForTier(tier).length).toBeGreaterThanOrEqual(6);
    }
  });

  it('tier 1 toys have 2 parts of 3-4 letters', () => {
    toysForTier(1).forEach((t) => {
      expect(t.parts).toHaveLength(2);
      t.parts.forEach((p) => expect(p.length).toBeGreaterThanOrEqual(3));
      t.parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(4));
    });
  });

  it('tier 2 toys have 3 parts', () => {
    toysForTier(2).forEach((t) => expect(t.parts).toHaveLength(3));
  });

  it('tier 3 toys have 4 parts of up to 6 letters', () => {
    toysForTier(3).forEach((t) => {
      expect(t.parts).toHaveLength(4);
      t.parts.forEach((p) => expect(p.length).toBeLessThanOrEqual(6));
    });
  });
});
