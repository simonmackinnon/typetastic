import { test, expect, type Page } from '@playwright/test';
import { gotoGame, mockApi, pauseClock, runUntilResults, signIn, startRound as startGameRound } from './helpers/games';

// The round is 60s long; Playwright's fake clock lets us fast-forward through
// the countdown and the round instead of waiting in real time.

const GAME_ID = 'factories';
const startRound = (page: Page) => startGameRound(page, 'active-part');

const toys = async (page: Page) => Number((await page.getByTestId('hud-score').textContent())!.replace(/\D/g, ''));

/** Types every part of the front order, reading each active part from the DOM. */
async function buildFrontOrder(page: Page) {
  const before = await toys(page);
  for (let i = 0; i < 6 && (await toys(page)) === before; i++) {
    const part = await page.getByTestId('active-part').getAttribute('data-part');
    expect(part).toBeTruthy();
    await page.keyboard.type(part!);
  }
  await expect.poll(() => toys(page)).toBe(before + 1);
}

test.describe('Factories game', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'game needs a physical keyboard; mobile gate is covered below');
  });

  test('Games hub card opens the Factories page', async ({ page }) => {
    await page.goto('/games');
    await page.getByTestId('game-factories').click();
    await expect(page).toHaveURL(/\/games\/factories$/);
    await expect(page.getByTestId('factories-instructions')).toBeVisible();
  });

  test('instructions -> countdown -> live game', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await expect(page.getByRole('heading', { name: /how to play/i })).toBeVisible();

    await page.getByRole('button', { name: /start/i }).click();
    await expect(page.locator('.animate-pop').filter({ hasText: /^[123]$/ })).toBeVisible();

    await page.clock.runFor(3_200);
    await expect(page.getByTestId('assembly-line')).toBeVisible();
    await expect(page.getByTestId('order-ticket')).toHaveCount(1);
    await expect(page.getByTestId('active-part')).toBeVisible();
    await expect(page.getByTestId('hud-time')).toContainText('1:00');
  });

  test('typing every part of the front order builds a toy', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);

    const firstPart = await page.getByTestId('active-part').getAttribute('data-part');
    await page.keyboard.type(firstPart!);
    await expect(page.getByTestId('attached-part')).toHaveText([firstPart!]);

    await buildFrontOrder(page);
    await expect(page.getByTestId('hud-score')).toContainText('1');
    await expect(page.getByTestId('hud-combo')).toContainText('×1');
  });

  test('results screen appears with the session stats when time runs out', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);
    await pauseClock(page); // the loop below must not drift on a slow runner
    // Build the front toy every 2s: orders arrive every 4-6s, so none are missed.
    for (let s = 0; s < 30; s++) {
      if (await page.getByTestId('active-part').count()) await buildFrontOrder(page);
      await page.clock.runFor(2_000);
    }
    await runUntilResults(page);

    await expect(page.getByText(/factories round complete/i)).toBeVisible();
    await expect(page.getByTestId('result-score')).not.toContainText(/^\s*0\s*$/);
    await expect(page.getByTestId('result-missed')).toContainText('0');
    await expect(page.getByTestId('result-accuracy')).toContainText('100%');

    await page.getByRole('button', { name: /back to games/i }).click();
    await expect(page).toHaveURL(/\/games$/);
  });
});

test.describe('Factories game: saving scores', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'game needs a physical keyboard');
  });

  test('a signed-in round is saved and the best persists across reload', async ({ page }) => {
    await signIn(page);
    const api = await mockApi(page);
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await expect(page.getByRole('button', { name: /log out/i })).toBeVisible();
    await expect(page.getByTestId('saved-best')).toBeHidden(); // never played

    await startRound(page);
    await buildFrontOrder(page);
    await page.clock.runFor(61_000);

    await expect(page.getByTestId('personal-best')).toContainText('First score saved: 1!');
    await expect.poll(() => api.calls).toContain('PUT /me/games/factories/score');
    expect(api.scores.factories).toMatchObject({ bestScore: 1, totalScore: 1 });

    await page.reload();
    await expect(page.getByTestId('saved-best')).toContainText('Your best: 1 toys');
  });

  test('guest rounds are never sent to the API', async ({ page }) => {
    const api = await mockApi(page);
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);
    await buildFrontOrder(page);
    await page.clock.runFor(61_000);

    await expect(page.getByTestId('result-score')).toContainText('1');
    await expect(page.getByTestId('personal-best')).toBeHidden();
    expect(api.calls).toEqual([]);
  });
});

test.describe('Factories game on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the keyboard-required gate instead of the game', async ({ page }) => {
    await gotoGame(page, GAME_ID);
    await expect(page.getByRole('heading', { name: /need a keyboard to play/i })).toBeVisible();
    await expect(page.getByTestId('factories-instructions')).toBeHidden();
  });
});
