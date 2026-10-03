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
    const put = await call('PUT', '/me/games/rockets/score', { body: round(5) });
    expect(put.status).toBe(400);
    expect((await call('GET', '/me/games/rockets/score')).status).toBe(400);
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
    expect(tf).toMatch(/authorization_type\s*=\s*"JWT"/);
  });
});
