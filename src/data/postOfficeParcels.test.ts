import { describe, it, expect } from 'vitest';
import { POST_OFFICE_PARCELS, REGIONS, parcelsForTier } from './postOfficeParcels';

describe('POST_OFFICE_PARCELS', () => {
  it('each parcel has a unique id', () => {
    const ids = POST_OFFICE_PARCELS.map((p) => p.id);
    expect(new Set(ids).size).toBe(POST_OFFICE_PARCELS.length);
  });

  it('each parcel code is unique', () => {
    const codes = POST_OFFICE_PARCELS.map((p) => p.code);
    expect(new Set(codes).size).toBe(POST_OFFICE_PARCELS.length);
  });

  it('codes are uppercase letters followed by optional digits', () => {
    POST_OFFICE_PARCELS.forEach((p) => {
      expect(p.code).toMatch(/^[A-Z]{3}\d*$/);
    });
  });

  it('every region is a known bucket', () => {
    const regions = REGIONS.map((r) => r.region);
    POST_OFFICE_PARCELS.forEach((p) => {
      expect(regions).toContain(p.region);
    });
  });

  it('every tier has parcels for every region', () => {
    for (const tier of [1, 2, 3] as const) {
      const pool = parcelsForTier(tier);
      expect(pool.length).toBeGreaterThan(0);
      for (const { region } of REGIONS) {
        expect(pool.some((p) => p.region === region)).toBe(true);
      }
    }
  });

  it('code length increases with tier', () => {
    expect(parcelsForTier(1).every((p) => p.code.length === 3)).toBe(true);
    expect(parcelsForTier(2).every((p) => p.code.length === 5)).toBe(true);
    expect(parcelsForTier(3).every((p) => p.code.length === 8)).toBe(true);
  });

  it('tiers are evenly distributed', () => {
    const counts = [1, 2, 3].map((t) => POST_OFFICE_PARCELS.filter((p) => p.tier === t).length);
    expect(new Set(counts).size).toBe(1);
  });
});
