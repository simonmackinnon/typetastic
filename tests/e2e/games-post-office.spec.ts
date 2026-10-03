import { test, expect, type Page } from '@playwright/test';

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

test.describe('Post Office game on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the keyboard-required gate instead of the game', async ({ page }) => {
    await page.goto('/games/post-office');
    await expect(page.getByRole('heading', { name: /need a keyboard to play/i })).toBeVisible();
    await expect(page.getByTestId('post-office-instructions')).toBeHidden();
  });
});
