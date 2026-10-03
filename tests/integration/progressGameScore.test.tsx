/**
 * Round-trip integration test for Post Office score persistence:
 *
 *   ProgressContext.submitGameScore → services/api.ts (real axios calls)
 *     → lambda/handler.js → in-memory DynamoDB fake → back into ProgressContext
 *
 * axios's adapter is swapped for one that turns each request into an API
 * Gateway HTTP API event and invokes the real handler, acting as the JWT
 * authorizer: requests without a token get 401, and the token decides which
 * user's claims the handler sees. Re-mounting the provider stands in for a
 * page reload, so "persists across reload" is exercised against stored data.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';
import axios, { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios';
import type { ReactNode } from 'react';
import { installFakeDynamo, keyOf, loadHandler } from './fakeDynamo';
import { ProgressProvider, useProgress } from '../../src/context/ProgressContext';
import type { PostOfficeRoundResult } from '../../src/hooks/usePostOfficeGame';

const { table, restore } = installFakeDynamo();
const handler = loadHandler();

// ── Signed-in user + token ───────────────────────────────────────────────────

let mockUser: { sub: string; email: string } | null = null;
vi.mock('../../src/context/AuthContext', () => ({ useAuth: () => ({ user: mockUser }) }));
vi.mock('../../src/services/auth', () => ({
  getIdToken: async () => (mockUser ? `token-for-${mockUser.sub}` : null),
}));

// ── axios → API Gateway → handler ────────────────────────────────────────────

const requests: string[] = [];

const apiGatewayAdapter: AxiosAdapter = async (config: InternalAxiosRequestConfig) => {
  const method = (config.method ?? 'get').toUpperCase();
  const rawPath = new URL(config.url ?? '', 'http://api.test').pathname;
  requests.push(`${method} ${rawPath}`);

  const auth = config.headers?.Authorization as string | undefined;
  const sub = auth?.match(/^Bearer token-for-(.+)$/)?.[1];

  const res = sub
    ? await handler({
        rawPath,
        requestContext: { http: { method }, authorizer: { jwt: { claims: { sub } } } },
        body: typeof config.data === 'string' ? config.data : config.data ? JSON.stringify(config.data) : undefined,
      })
    : { statusCode: 401, body: JSON.stringify({ message: 'Unauthorized' }) }; // JWT authorizer rejects

  const response = {
    data: JSON.parse(res.body),
    status: res.statusCode,
    statusText: String(res.statusCode),
    headers: {},
    config,
  };
  if (res.statusCode >= 400) {
    throw new AxiosError(`Request failed with status code ${res.statusCode}`, 'ERR_BAD_RESPONSE', config, null, response);
  }
  return response;
};

const originalAdapter = axios.defaults.adapter;
axios.defaults.adapter = apiGatewayAdapter;
afterAll(() => {
  axios.defaults.adapter = originalAdapter;
  restore();
});

// ── Helpers ──────────────────────────────────────────────────────────────────

const wrapper = ({ children }: { children: ReactNode }) => <ProgressProvider>{children}</ProgressProvider>;
const round = (score: number, bestStreak = 3, accuracy = 90): PostOfficeRoundResult =>
  ({ score, parcelsMissed: 2, accuracy, bestStreak });

/** Mounts a fresh provider (a "page load") and waits for its initial fetch. */
async function loadPage(user: typeof mockUser) {
  mockUser = user;
  requests.length = 0;
  const view = renderHook(() => useProgress(), { wrapper });
  if (user) await waitFor(() => expect(requests).toContain('GET /me/games/post-office/score'));
  await act(async () => {}); // let LOAD dispatch
  return view;
}

const KID = { sub: 'kid-1', email: 'kid@example.com' };

beforeEach(() => {
  table.clear();
});

describe('Post Office score persistence round trip', () => {
  it('a signed-in round is written to the table and reloads as the saved best', async () => {
    const first = await loadPage(KID);
    expect(first.result.current.stats.bestPostOfficeScore).toBe(0); // GET -> 404 -> none yet

    await act(() => first.result.current.submitGameScore('post-office', round(12, 7, 91)));
    expect(requests).toContain('PUT /me/games/post-office/score');
    expect(table.get(keyOf('kid-1', 'game#post-office#best'))).toMatchObject({
      bestScore: 12, bestStreak: 7, accuracy: 91, totalParcelsRouted: 12,
    });
    first.unmount();

    const reloaded = await loadPage(KID);
    expect(reloaded.result.current.stats).toMatchObject({ bestPostOfficeScore: 12, totalParcelsRouted: 12 });
    expect(reloaded.result.current.gameScores['post-office']).toMatchObject({ bestStreak: 7, accuracy: 91 });
  });

  it('a lower round keeps the saved best but still adds to the saved total', async () => {
    const first = await loadPage(KID);
    await act(() => first.result.current.submitGameScore('post-office', round(12)));
    first.unmount();

    const second = await loadPage(KID);
    await act(() => second.result.current.submitGameScore('post-office', round(5)));
    expect(second.result.current.stats).toMatchObject({ bestPostOfficeScore: 12, totalParcelsRouted: 17 });
    second.unmount();

    const third = await loadPage(KID);
    expect(third.result.current.stats).toMatchObject({ bestPostOfficeScore: 12, totalParcelsRouted: 17 });
  });

  it('Mail Sorter unlocks from parcels accumulated across sessions and stays earned', async () => {
    for (const score of [18, 19]) {
      const session = await loadPage(KID);
      await act(() => session.result.current.submitGameScore('post-office', round(score)));
      expect(session.result.current.earnedBadges).not.toContain('mail-sorter');
      session.unmount();
    }

    const third = await loadPage(KID);
    expect(third.result.current.stats.totalParcelsRouted).toBe(37);
    await act(() => third.result.current.submitGameScore('post-office', round(15)));
    expect(third.result.current.newBadges.map((b) => b.id)).toContain('mail-sorter');
    expect(requests).toContain('POST /me/badges/mail-sorter');
    third.unmount();

    const fourth = await loadPage(KID);
    await waitFor(() => expect(fourth.result.current.earnedBadges).toContain('mail-sorter'));
    expect(fourth.result.current.stats.totalParcelsRouted).toBe(52);
  });

  it('Speed Sorter unlocks on a 20-parcel round and is persisted', async () => {
    const page = await loadPage(KID);
    await act(() => page.result.current.submitGameScore('post-office', round(20)));
    expect(page.result.current.earnedBadges).toContain('speed-sorter');
    expect(table.has(keyOf('kid-1', 'badge#speed-sorter'))).toBe(true);
  });

  it('guest play is never sent to the API or persisted', async () => {
    const page = await loadPage(null);
    await act(() => page.result.current.submitGameScore('post-office', round(25)));
    expect(page.result.current.stats).toMatchObject({ bestPostOfficeScore: 25, totalParcelsRouted: 25 });
    expect(page.result.current.earnedBadges).toContain('speed-sorter');
    expect(requests).toEqual([]);
    expect(table.size).toBe(0);
    page.unmount();

    const reloaded = await loadPage(null);
    expect(reloaded.result.current.stats).toMatchObject({ bestPostOfficeScore: 0, totalParcelsRouted: 0 });
  });

  it("players' saved scores stay separate", async () => {
    const kid = await loadPage(KID);
    await act(() => kid.result.current.submitGameScore('post-office', round(12)));
    kid.unmount();

    const sibling = await loadPage({ sub: 'kid-2', email: 'sibling@example.com' });
    expect(sibling.result.current.stats.bestPostOfficeScore).toBe(0);
  });

  it('level progress still round-trips alongside game scores', async () => {
    const page = await loadPage(KID);
    await act(() => page.result.current.submitResult('01', { accuracy: 96, wpm: 18, stars: 2, timeSeconds: 30, errorCount: 1 }));
    await act(() => page.result.current.submitGameScore('post-office', round(8)));
    page.unmount();

    const reloaded = await loadPage(KID);
    await waitFor(() => expect(reloaded.result.current.stats.levelsCompleted).toBe(1));
    expect(reloaded.result.current.stats).toMatchObject({ bestPostOfficeScore: 8, highestLevel: 1 });
  });
});
