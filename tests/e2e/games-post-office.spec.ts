import { test, expect, type Page, type Route } from '@playwright/test';

// The round is 60s long; Playwright's fake clock lets us fast-forward through
// the countdown and the round instead of waiting in real time.

async function startRound(page: Page) {
  await page.getByRole('button', { name: /start/i }).click();
  await page.clock.runFor(3_200); // 3-2-1 countdown + first belt tick
  await expect(page.getByTestId('active-parcel')).toBeVisible();
}

async function typeActiveParcel(page: Page) {
  const code = await page.getByTestId('active-parcel').getAttribute('data-code');
  expect(code).toBeTruthy();
  await page.keyboard.type(code!);
}

test.describe('Post Office game', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'game needs a physical keyboard; mobile gate is covered below');
  });

  test('Games hub card opens the Post Office page', async ({ page }) => {
    await page.goto('/games');
    await page.getByTestId('game-post-office').click();
    await expect(page).toHaveURL(/\/games\/post-office$/);
    await expect(page.getByTestId('post-office-instructions')).toBeVisible();
  });

  test('instructions -> countdown -> live game', async ({ page }) => {
    await page.clock.install();
    await page.goto('/games/post-office');
    await expect(page.getByRole('heading', { name: /how to play/i })).toBeVisible();

    await page.getByRole('button', { name: /start/i }).click();
    await expect(page.locator('.animate-pop').filter({ hasText: /^[123]$/ })).toBeVisible();

    await page.clock.runFor(3_200);
    await expect(page.getByTestId('belt')).toBeVisible();
    await expect(page.getByTestId('active-parcel')).toBeVisible();
    await expect(page.getByTestId('hud-time')).toContainText('1:00');
  });

  test('typing a parcel code increments the score', async ({ page }) => {
    await page.clock.install();
    await page.goto('/games/post-office');
    await startRound(page);

    await typeActiveParcel(page);
    await expect(page.getByTestId('hud-score')).toContainText('1');
    await expect(page.getByTestId('hud-streak')).toContainText('1');
  });

  test('results screen appears with the session stats when time runs out', async ({ page }) => {
    await page.clock.install();
    await page.goto('/games/post-office');
    await startRound(page);
    await typeActiveParcel(page);
    await expect(page.getByTestId('hud-score')).toContainText('1');

    await page.clock.runFor(61_000);
    await expect(page.getByText(/post office round complete/i)).toBeVisible();
    await expect(page.getByTestId('result-score')).toContainText('1');
    await expect(page.getByTestId('result-accuracy')).toContainText('100%');
    await expect(page.getByTestId('result-streak')).toContainText('1');

    await page.getByRole('button', { name: /back to games/i }).click();
    await expect(page).toHaveURL(/\/games$/);
  });
});

// ── Signed-in persistence ────────────────────────────────────────────────────
// CI builds against stub Cognito/API values, so there's no real login or
// backend here. We seed a fake signed-in Google session (the app reads
// ts_oauth_tokens before touching Cognito) and answer /me/* with a stateful
// mock that applies the Lambda's rules and survives page reloads. The real
// handler round trip is covered by tests/integration/progressGameScore.test.tsx.

function fakeIdToken(claims: Record<string, unknown>): string {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
  return `${b64({ alg: 'none', typ: 'JWT' })}.${b64(claims)}.sig`;
}

async function signIn(page: Page) {
  const tokens = {
    id_token: fakeIdToken({ sub: 'e2e-kid', email: 'e2e-kid@example.com' }),
    access_token: 'fake-access',
    refresh_token: 'fake-refresh',
    expires_at: Date.UTC(2100, 0, 1),
  };
  await page.addInitScript((t) => localStorage.setItem('ts_oauth_tokens', t), JSON.stringify(tokens));
}

interface MockApi {
  calls: string[];
  score: { bestScore: number; bestStreak: number; accuracy: number; totalParcelsRouted: number } | null;
}

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
};

async function mockApi(page: Page): Promise<MockApi> {
  const api: MockApi = { calls: [], score: null };
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

    if (path === '/me/games/post-office/score') {
      if (method === 'GET') return api.score ? json(route, 200, api.score) : json(route, 404, { error: 'Not found' });
      if (method === 'PUT') {
        const { score, streak, accuracy } = req.postDataJSON();
        const total = (api.score?.totalParcelsRouted ?? 0) + score;
        const better = !api.score || score > api.score.bestScore;
        api.score = better
          ? { bestScore: score, bestStreak: streak, accuracy, totalParcelsRouted: total }
          : { ...api.score!, totalParcelsRouted: total };
        return json(route, 200, { updated: better, ...api.score });
      }
    }
    return json(route, 404, { error: 'Not found' });
  });
  return api;
}

test.describe('Post Office game: saving scores', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'game needs a physical keyboard');
  });

  test('a signed-in round is saved and the best persists across reload', async ({ page }) => {
    await signIn(page);
    const api = await mockApi(page);
    await page.clock.install();
    await page.goto('/games/post-office');
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
    await expect(page.getByTestId('saved-best')).toBeHidden(); // never played

    await startRound(page);
    await typeActiveParcel(page);
    await expect(page.getByTestId('hud-score')).toContainText('1');
    await page.clock.runFor(61_000);

    await expect(page.getByTestId('personal-best')).toContainText('First score saved: 1!');
    await expect.poll(() => api.calls).toContain('PUT /me/games/post-office/score');
    expect(api.score).toMatchObject({ bestScore: 1, totalParcelsRouted: 1 });

    await page.reload();
    await expect(page.getByTestId('saved-best')).toContainText('Your best: 1 parcels');
  });

  test('guest rounds are never sent to the API', async ({ page }) => {
    const api = await mockApi(page);
    await page.clock.install();
    await page.goto('/games/post-office');
    await startRound(page);
    await typeActiveParcel(page);
    await page.clock.runFor(61_000);

    await expect(page.getByTestId('result-score')).toContainText('1');
    await expect(page.getByTestId('personal-best')).toBeHidden();
    expect(api.calls).toEqual([]);
  });
});

test.describe('Post Office game on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the keyboard-required gate instead of the game', async ({ page }) => {
    await page.goto('/games/post-office');
    await expect(page.getByRole('heading', { name: /need a keyboard to play/i })).toBeVisible();
    await expect(page.getByTestId('post-office-instructions')).toBeHidden();
  });
});
