import { describe, it, expect } from 'vitest';
import { GAMES, GAME_IDS, GAMES_BY_ID, isGameId, zeroGameStats } from './games';

describe('games registry', () => {
  it('lists the five games in hub order with unique ids', () => {
    expect(GAME_IDS).toEqual(['post-office', 'rockets', 'cars', 'trains', 'factories']);
    expect(new Set(GAME_IDS).size).toBe(GAMES.length);
  });

  it('every game has a route under /games/ named after its id and a score unit', () => {
    for (const g of GAMES) {
      expect(g.route).toBe(`/games/${g.id}`);
      expect(g.unit.one).not.toBe('');
      expect(g.unit.many).not.toBe('');
    }
  });

  it('only Post Office is playable so far', () => {
    expect(GAMES.filter((g) => g.playable).map((g) => g.id)).toEqual(['post-office']);
  });

  it('playable games are ones the API saves (have a maxScore)', () => {
    for (const g of GAMES.filter((g) => g.playable)) {
      expect(GAMES_BY_ID[g.id].maxScore).toBeGreaterThan(0);
    }
  });

  it('GAMES_BY_ID looks up each definition', () => {
    expect(GAMES_BY_ID.rockets.unit).toEqual({ one: 'km', many: 'km' });
    expect(GAMES_BY_ID.factories.unit.many).toBe('toys');
  });

  it('isGameId accepts registered ids only', () => {
    expect(isGameId('rockets')).toBe(true);
    expect(isGameId('chess')).toBe(false);
    expect(isGameId('')).toBe(false);
  });

  it('zeroGameStats has a fresh zero entry for every game', () => {
    const a = zeroGameStats();
    expect(Object.keys(a)).toEqual([...GAME_IDS]);
    expect(Object.values(a).every((s) => s.best === 0 && s.total === 0)).toBe(true);
    a.rockets.best = 5;
    expect(zeroGameStats().rockets.best).toBe(0);
  });
});
