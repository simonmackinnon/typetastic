// @vitest-environment node
/**
 * Lambda-level integration tests for lambda/handler.js.
 *
 * Each test sends API Gateway HTTP API (payload v2) events through the real
 * handler, which talks to an in-memory fake of the DynamoDB document client.
 * The fake keeps state across calls, so multi-request flows (save, then a
 * lower score, then read back) behave like they would against the table.
 *
 * Not covered here: the API Gateway JWT authorizer itself (the handler's own
 * missing-claims 401 is covered) and real DynamoDB.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

const require = createRequire(import.meta.url);

// Load the SDK and handler through CommonJS, exactly as Lambda does, so the
// prototype we stub is the same one handler.js uses.
const { DynamoDBDocumentClient, GetCommand, PutCommand, QueryCommand } = require('@aws-sdk/lib-dynamodb');

process.env.TABLE_NAME = 'tt-user-data-test';
const { handler } = require('../../lambda/handler.js');

// ── In-memory DynamoDB fake ──────────────────────────────────────────────────

type Item = Record<string, unknown> & { userId: string; dataKey: string };
const table = new Map<string, Item>();
const keyOf = (userId: string, dataKey: string) => `${userId}|${dataKey}`;

function conditionalCheckFailed(): Error {
  const e = new Error('The conditional request failed');
  e.name = 'ConditionalCheckFailedException';
  return e;
}

// Supports only the condition expressions handler.js uses; anything else
// throws so a handler change can't silently pass against a too-lenient fake.
function conditionHolds(expr: string, existing: Item | undefined, values: Record<string, unknown> = {}): boolean {
  if (expr === 'attribute_not_exists(dataKey)') return !existing;
  if (expr === 'attribute_not_exists(dataKey) OR bestScore < :score') {
    return !existing || (existing.bestScore as number) < (values[':score'] as number);
  }
  throw new Error(`Fake DynamoDB: unsupported ConditionExpression "${expr}"`);
}

const sendSpy = vi.spyOn(DynamoDBDocumentClient.prototype, 'send').mockImplementation(async (command: unknown) => {
  const { input } = command as { input: Record<string, any> };
  expect(input.TableName).toBe('tt-user-data-test');

  if (command instanceof GetCommand) {
    return { Item: table.get(keyOf(input.Key.userId, input.Key.dataKey)) };
  }
  if (command instanceof PutCommand) {
    const item = input.Item as Item;
    const existing = table.get(keyOf(item.userId, item.dataKey));
    if (input.ConditionExpression && !conditionHolds(input.ConditionExpression, existing, input.ExpressionAttributeValues)) {
      throw conditionalCheckFailed();
    }
    table.set(keyOf(item.userId, item.dataKey), { ...item });
    return {};
  }
  if (command instanceof QueryCommand) {
    const { ':u': userId, ':prefix': prefix } = input.ExpressionAttributeValues;
    const Items = [...table.values()].filter((i) => i.userId === userId && i.dataKey.startsWith(prefix));
    return { Items };
  }
  throw new Error(`Fake DynamoDB: unsupported command ${(command as object).constructor.name}`);
});

afterAll(() => sendSpy.mockRestore());

// ── API Gateway event helpers ────────────────────────────────────────────────

function call(method: string, path: string, { userId = 'user-1', body }: { userId?: string | null; body?: unknown } = {}) {
  return handler({
    rawPath: path,
    requestContext: {
      http: { method },
      authorizer: userId ? { jwt: { claims: { sub: userId } } } : undefined,
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }).then((res: { statusCode: number; body: string }) => ({ status: res.statusCode, json: JSON.parse(res.body) }));
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
