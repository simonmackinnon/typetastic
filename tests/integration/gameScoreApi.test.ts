// @vitest-environment node
/**
 * Lambda-level integration tests for lambda/handler.js.
 *
 * Each test sends API Gateway HTTP API (payload v2) events through the real
 * handler, which talks to the in-memory DynamoDB fake in ./fakeDynamo.
 *
 * Not covered here: the API Gateway JWT authorizer itself (the handler's own
 * missing-claims 401 is covered) and real DynamoDB.
 */
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import { installFakeDynamo, keyOf, loadHandler } from './fakeDynamo';

const { table, restore } = installFakeDynamo();
const handler = loadHandler();

afterAll(() => restore());

// ── API Gateway event helpers ────────────────────────────────────────────────

function call(method: string, path: string, { userId = 'user-1', body }: { userId?: string | null; body?: unknown } = {}) {
  return handler({
    rawPath: path,
    requestContext: {
      http: { method },
      authorizer: userId ? { jwt: { claims: { sub: userId } } } : undefined,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((res) => ({ status: res.statusCode, json: JSON.parse(res.body) }));
}

const SCORE_PATH = '/me/games/post-office/score';
const round = (score: number, streak = 3, accuracy = 90) => ({ score, streak, accuracy });

beforeEach(() => {
  table.clear();
});

// ── Game score API ───────────────────────────────────────────────────────────

describe('GET/PUT /me/games/:gameId/score', () => {
  it('requires authentication for both methods', async () => {
    expect((await call('GET', SCORE_PATH, { userId: null })).status).toBe(401);
    expect((await call('PUT', SCORE_PATH, { userId: null, body: round(5) })).status).toBe(401);
    expect(table.size).toBe(0);
  });

  it('GET returns 404 when the game has never been played', async () => {
    const res = await call('GET', SCORE_PATH);
    expect(res.status).toBe(404);
  });

  it('first PUT stores the record and GET returns it', async () => {
    const put = await call('PUT', SCORE_PATH, { body: round(12, 7, 91) });
    expect(put.status).toBe(200);
    expect(put.json).toMatchObject({ updated: true, gameId: 'post-office', bestScore: 12, bestStreak: 7, accuracy: 91 });

    const get = await call('GET', SCORE_PATH);
    expect(get.status).toBe(200);
    expect(get.json).toEqual({
      gameId: 'post-office',
      bestScore: 12,
      bestStreak: 7,
      accuracy: 91,
      totalScore: 12,
      totalParcelsRouted: 12,
      updatedAt: expect.any(String),
    });
    expect(table.has(keyOf('user-1', 'game#post-office#best'))).toBe(true);
  });

  it('a lower score does not overwrite the stored best', async () => {
    await call('PUT', SCORE_PATH, { body: round(12, 7, 91) });
    const res = await call('PUT', SCORE_PATH, { body: round(5, 9, 100) });
    expect(res.status).toBe(200);
    expect(res.json).toMatchObject({ updated: false, bestScore: 12, bestStreak: 7, accuracy: 91 });
    expect((await call('GET', SCORE_PATH)).json.bestScore).toBe(12);
  });

  it('an equal score does not overwrite the stored best', async () => {
    await call('PUT', SCORE_PATH, { body: round(12, 7, 91) });
    const res = await call('PUT', SCORE_PATH, { body: round(12, 9, 99) });
    expect(res.json).toMatchObject({ updated: false, bestStreak: 7 });
  });

  it('a higher score replaces the stored best', async () => {
    await call('PUT', SCORE_PATH, { body: round(12, 7, 91) });
    const res = await call('PUT', SCORE_PATH, { body: round(20, 4, 88) });
    expect(res.json).toMatchObject({ updated: true, bestScore: 20, bestStreak: 4, accuracy: 88 });
    expect((await call('GET', SCORE_PATH)).json).toMatchObject({ bestScore: 20, bestStreak: 4, accuracy: 88 });
  });

  it('rejects an unrecognised gameId without writing anything', async () => {
    const put = await call('PUT', '/me/games/cars/score', { body: round(5) });
    expect(put.status).toBe(400);
    expect((await call('GET', '/me/games/cars/score')).status).toBe(400);
    // dataKey-injection style ids are rejected the same way
    expect((await call('PUT', '/me/games/post-office%23best/score', { body: round(5) })).status).toBe(400);
    expect(table.size).toBe(0);
  });

  it.each([
    ['missing score', { streak: 1, accuracy: 50 }],
    ['negative score', { score: -1, streak: 1, accuracy: 50 }],
    ['fractional score', { score: 1.5, streak: 1, accuracy: 50 }],
    ['string score', { score: '10', streak: 1, accuracy: 50 }],
    ['missing streak', { score: 1, accuracy: 50 }],
    ['accuracy over 100', { score: 1, streak: 1, accuracy: 101 }],
    ['missing accuracy', { score: 1, streak: 1 }],
  ])('rejects an invalid body (%s) without writing', async (_label, body) => {
    const res = await call('PUT', SCORE_PATH, { body });
    expect(res.status).toBe(400);
    expect(table.size).toBe(0);
  });

  it('every round adds to the running total, even when it does not beat the best', async () => {
    await call('PUT', SCORE_PATH, { body: round(12) });
    const lower = await call('PUT', SCORE_PATH, { body: round(5) });
    expect(lower.json).toMatchObject({ updated: false, bestScore: 12, totalParcelsRouted: 17 });
    const higher = await call('PUT', SCORE_PATH, { body: round(20) });
    expect(higher.json).toMatchObject({ updated: true, bestScore: 20, totalParcelsRouted: 37 });
    expect((await call('GET', SCORE_PATH)).json).toMatchObject({ bestScore: 20, totalParcelsRouted: 37 });
  });

  it('a first round scoring 0 still creates a record', async () => {
    const res = await call('PUT', SCORE_PATH, { body: round(0, 0, 0) });
    expect(res.json).toMatchObject({ updated: true, bestScore: 0, totalParcelsRouted: 0 });
    expect((await call('GET', SCORE_PATH)).status).toBe(200);
  });

  it("keeps each user's scores separate", async () => {
    await call('PUT', SCORE_PATH, { userId: 'user-1', body: round(12) });
    expect((await call('GET', SCORE_PATH, { userId: 'user-2' })).status).toBe(404);
    await call('PUT', SCORE_PATH, { userId: 'user-2', body: round(3) });
    expect((await call('GET', SCORE_PATH, { userId: 'user-1' })).json.bestScore).toBe(12);
  });

  it('other methods on the score path are not routed', async () => {
    expect((await call('POST', SCORE_PATH, { body: round(5) })).status).toBe(404);
  });
});

// ── TYP-16: games platform ───────────────────────────────────────────────────

describe('games platform (TYP-16)', () => {
  const path = (gameId: string) => `/me/games/${gameId}/score`;

  it('accepts rockets and factories', async () => {
    expect((await call('PUT', path('rockets'), { body: round(300) })).status).toBe(200);
    expect((await call('PUT', path('factories'), { body: round(8) })).status).toBe(200);
    expect((await call('GET', path('rockets'))).json).toMatchObject({ gameId: 'rockets', bestScore: 300 });
  });

  it.each([
    ['post-office', 100],
    ['rockets', 1000],
    ['factories', 100],
  ])('%s: a score at the maximum (%i) is accepted, one above is rejected without writing', async (gameId, max) => {
    expect((await call('PUT', path(gameId), { body: round(max + 1) })).status).toBe(400);
    expect(table.has(keyOf('user-1', `game#${gameId}#best`))).toBe(false);
    const ok = await call('PUT', path(gameId), { body: round(max) });
    expect(ok.status).toBe(200);
    expect(ok.json).toMatchObject({ bestScore: max, totalScore: max });
  });

  it('keeps a separate running total per game', async () => {
    await call('PUT', path('post-office'), { body: round(10) });
    await call('PUT', path('post-office'), { body: round(5) });
    await call('PUT', path('rockets'), { body: round(250) });
    await call('PUT', path('factories'), { body: round(7) });
    expect((await call('GET', path('post-office'))).json).toMatchObject({ bestScore: 10, totalScore: 15 });
    expect((await call('GET', path('rockets'))).json).toMatchObject({ bestScore: 250, totalScore: 250 });
    expect((await call('GET', path('factories'))).json).toMatchObject({ bestScore: 7, totalScore: 7 });
  });

  it('only Post Office responses carry the legacy totalParcelsRouted field', async () => {
    const po = await call('PUT', path('post-office'), { body: round(10) });
    const rk = await call('PUT', path('rockets'), { body: round(10) });
    expect(po.json).toMatchObject({ totalScore: 10, totalParcelsRouted: 10 });
    expect(rk.json.totalScore).toBe(10);
    expect(rk.json).not.toHaveProperty('totalParcelsRouted');
  });

  describe('legacy Post Office records', () => {
    // A record as TYP-7 wrote it: total stored as totalParcelsRouted.
    const seedLegacy = (total = 40) =>
      table.set(keyOf('user-1', 'game#post-office#best'), {
        userId: 'user-1', dataKey: 'game#post-office#best', gameId: 'post-office',
        bestScore: 15, bestStreak: 6, accuracy: 92, totalParcelsRouted: total, updatedAt: '2026-10-05T00:00:00Z',
      });

    it('GET reads the legacy total as totalScore before any migration', async () => {
      seedLegacy(40);
      expect((await call('GET', path('post-office'))).json).toMatchObject({ totalScore: 40, totalParcelsRouted: 40 });
    });

    it('the next PUT migrates it: 40 + 20 = totalScore 60, legacy attribute removed', async () => {
      seedLegacy(40);
      const res = await call('PUT', path('post-office'), { body: round(20) });
      expect(res.json).toMatchObject({ updated: true, bestScore: 20, totalScore: 60, totalParcelsRouted: 60 });
      const stored = table.get(keyOf('user-1', 'game#post-office#best'))!;
      expect(stored.totalScore).toBe(60);
      expect(stored).not.toHaveProperty('totalParcelsRouted');
    });

    it('migration is idempotent across repeated PUTs and keeps the best', async () => {
      seedLegacy(40);
      await call('PUT', path('post-office'), { body: round(5) });  // migrate + add -> 45
      await call('PUT', path('post-office'), { body: round(5) });  // already migrated -> 50
      const stored = table.get(keyOf('user-1', 'game#post-office#best'))!;
      expect(stored).toMatchObject({ totalScore: 50, bestScore: 15 });
      expect(stored).not.toHaveProperty('totalParcelsRouted');
    });
  });

  describe('GET /me/games', () => {
    it('requires authentication', async () => {
      expect((await call('GET', '/me/games', { userId: null })).status).toBe(401);
    });

    it('returns an empty list when nothing has been played', async () => {
      expect((await call('GET', '/me/games')).json).toEqual([]);
    });

    it("returns every game record for the caller only, never level or badge items", async () => {
      await call('PUT', path('post-office'), { body: round(10) });
      await call('PUT', path('rockets'), { body: round(300) });
      await call('PUT', '/me/progress/01', { body: { stars: 2, bestAccuracy: 95, bestWpm: 20 } });
      await call('POST', '/me/badges/first-keystroke');
      await call('PUT', path('factories'), { userId: 'user-2', body: round(9) });

      const res = await call('GET', '/me/games');
      expect(res.status).toBe(200);
      const byGame = Object.fromEntries((res.json as { gameId: string }[]).map((r) => [r.gameId, r]));
      expect(Object.keys(byGame).sort()).toEqual(['post-office', 'rockets']);
      expect(byGame['post-office']).toMatchObject({ bestScore: 10, totalScore: 10, totalParcelsRouted: 10 });
      expect(byGame.rockets).toMatchObject({ bestScore: 300, totalScore: 300, bestStreak: 3, accuracy: 90 });
      expect(byGame.rockets).not.toHaveProperty('totalParcelsRouted');
    });

    it('includes a not-yet-migrated legacy record with its total', async () => {
      table.set(keyOf('user-1', 'game#post-office#best'), {
        userId: 'user-1', dataKey: 'game#post-office#best', gameId: 'post-office',
        bestScore: 15, bestStreak: 6, accuracy: 92, totalParcelsRouted: 40, updatedAt: '2026-10-05T00:00:00Z',
      });
      expect((await call('GET', '/me/games')).json).toEqual([
        expect.objectContaining({ gameId: 'post-office', bestScore: 15, totalScore: 40 }),
      ]);
    });
  });
});

// ── Regression: existing routes ──────────────────────────────────────────────

describe('existing routes are unaffected', () => {
  it('PUT /me/progress/:levelId then GET /me/progress', async () => {
    const put = await call('PUT', '/me/progress/01', { body: { stars: 2, bestAccuracy: 95, bestWpm: 20 } });
    expect(put.json).toEqual({ updated: true });
    const get = await call('GET', '/me/progress');
    expect(get.json).toEqual([
      expect.objectContaining({ levelId: '01', stars: 2, bestAccuracy: 95, bestWpm: 20 }),
    ]);
  });

  it('game score items do not leak into the progress or badge lists', async () => {
    await call('PUT', SCORE_PATH, { body: round(12) });
    expect((await call('GET', '/me/progress')).json).toEqual([]);
    expect((await call('GET', '/me/badges')).json).toEqual([]);
  });

  it('POST /me/badges/:badgeId is idempotent and listed by GET /me/badges', async () => {
    await call('POST', '/me/badges/first-keystroke');
    await call('POST', '/me/badges/first-keystroke');
    const get = await call('GET', '/me/badges');
    expect(get.json).toEqual([expect.objectContaining({ badgeId: 'first-keystroke' })]);
  });

  it('GET/PUT /me/profile', async () => {
    await call('PUT', '/me/profile', { body: { displayName: 'Sam' } });
    expect((await call('GET', '/me/profile')).json).toMatchObject({ displayName: 'Sam' });
  });

  it('unknown routes still 404', async () => {
    expect((await call('GET', '/me/nope')).status).toBe(404);
  });
});

// ── API Gateway route registration ───────────────────────────────────────────

describe('infra/api_gateway.tf', () => {
  it('registers the game score routes behind the JWT authorizer', () => {
    const tf = readFileSync(new URL('../../infra/api_gateway.tf', import.meta.url), 'utf8');
    const routes = [...tf.matchAll(/"((?:GET|PUT|POST|DELETE) \/[^"]+)"/g)].map((m) => m[1]);
    expect(routes).toContain('GET /me/games/{gameId}/score');
    expect(routes).toContain('PUT /me/games/{gameId}/score');
    expect(routes).toContain('GET /me/games');
    expect(tf).toMatch(/authorization_type\s*=\s*"JWT"/);
  });
});
