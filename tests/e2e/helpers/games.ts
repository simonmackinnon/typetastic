import { expect, type Page, type Route } from '@playwright/test';

// Shared helpers for the arcade game specs (Post Office, Rockets, Factories).
//
// CI builds against stub Cognito/API values, so there's no real login or
// backend. signIn() seeds a fake signed-in Google session (the app reads
// ts_oauth_tokens before touching Cognito) and mockApi() answers /me/* with a
// stateful mock that applies the Lambda's rules and survives page reloads. The
// real handler round trip is covered by tests/integration/progressGameScore.test.tsx.

/** Opens a game's page, e.g. gotoGame(page, 'post-office') -> /games/post-office. */
export async function gotoGame(page: Page, gameId: string) {
  await page.goto(`/games/${gameId}`);
}

/**
 * Presses Start and fast-forwards Playwright's fake clock through the 3-2-1
 * countdown and the first game tick, then waits for `readyTestId` (the element
 * a player types at first) to appear. Needs page.clock.install() beforehand.
 */
export async function startRound(page: Page, readyTestId: string) {
  await page.getByRole('button', { name: /start/i }).click();
  await page.clock.runFor(3_200); // 3-2-1 countdown + first tick
  await expect(page.getByTestId(readyTestId)).toBeVisible();
}

function fakeIdToken(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.sig`;
}

export async function signIn(page: Page) {
  const tokens = {
    id_token: fakeIdToken({ sub: 'e2e-kid', email: 'e2e-kid@example.com' }),
    access_token: 'fake-access',
    refresh_token: 'fake-refresh',
    expires_at: Date.UTC(2100, 0, 1),
  };
  await page.addInitScript((t) => localStorage.setItem('ts_oauth_tokens', t), JSON.stringify(tokens));
}

export interface MockApi {
  calls: string[];
  // Saved records by game id, shaped like the Lambda's (TYP-16) responses.
  scores: Record<string, { bestScore: number; bestStreak: number; accuracy: number; totalScore: number }>;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

/** Stateful /me/* mock; pass `scores` to start with saved records for any game ids. */
export async function mockApi(page: Page, scores: MockApi['scores'] = {}): Promise<MockApi> {
  const api: MockApi = { calls: [], scores: { ...scores } };
  const badges = new Set<string>();
  const json = (route: Route, status: number, body: unknown) =>
    route.fulfill({ status, headers: CORS, contentType: 'application/json', body: JSON.stringify(body) });

  await page.route(/\/me\//, async (route) => {
    const req = route.request();
    const method = req.method();
    const path = new URL(req.url()).pathname;
    if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    api.calls.push(`${method} ${path}`);
    if (!req.headers()['authorization']) return json(route, 401, { message: 'Unauthorized' });

    if (path === '/me/progress' && method === 'GET') return json(route, 200, []);
    if (path === '/me/badges' && method === 'GET') return json(route, 200, [...badges].map((badgeId) => ({ badgeId })));
    const badge = path.match(/^\/me\/badges\/(.+)$/);
    if (badge && method === 'POST') { badges.add(badge[1]); return json(route, 200, { unlocked: true }); }

    if (path === '/me/games' && method === 'GET') {
      return json(route, 200, Object.entries(api.scores).map(([gameId, s]) => ({ gameId, ...s })));
    }
    const game = path.match(/^\/me\/games\/([\w-]+)\/score$/);
    if (game && method === 'PUT') {
      const { score, streak, accuracy } = req.postDataJSON();
      const prev = api.scores[game[1]];
      const totalScore = (prev?.totalScore ?? 0) + score;
      const better = !prev || score > prev.bestScore;
      api.scores[game[1]] = better
        ? { bestScore: score, bestStreak: streak, accuracy, totalScore }
        : { ...prev, totalScore };
      return json(route, 200, { updated: better, gameId: game[1], ...api.scores[game[1]] });
    }
    return json(route, 404, { error: 'Not found' });
  });
  return api;
}
