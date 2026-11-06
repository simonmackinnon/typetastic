import { test, expect, type Page } from '@playwright/test';
import { gotoGame, mockApi, pauseClock, runUntilResults, signIn, startRound as startGameRound } from './helpers/games';

// The round is 60s long; Playwright's fake clock lets us fast-forward through
// the countdown and the round instead of waiting in real time.

const GAME_ID = 'rockets';
const startRound = (page: Page) => startGameRound(page, 'active-word');

async function typeActiveWord(page: Page) {
  const word = await page.getByTestId('active-word').getAttribute('data-word');
  expect(word).toBeTruthy();
  await page.keyboard.type(word!);
}

const speed = async (page: Page) => Number(await page.getByRole('meter', { name: 'Speed' }).getAttribute('aria-valuenow'));

test.describe('Rockets game', () => {
  test.beforeEach(async ({ isMobile }) => {
    test.skip(isMobile, 'game needs a physical keyboard; mobile gate is covered below');
  });

  test('Games hub card opens the Rockets page', async ({ page }) => {
    await page.goto('/games');
    await page.getByTestId('game-rockets').click();
    await expect(page).toHaveURL(/\/games\/rockets$/);
    await expect(page.getByTestId('rockets-instructions')).toBeVisible();
  });

  test('instructions -> countdown -> live game', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await expect(page.getByRole('heading', { name: /how to play/i })).toBeVisible();

    await page.getByRole('button', { name: /start/i }).click();
    await expect(page.locator('.animate-pop').filter({ hasText: /^[123]$/ })).toBeVisible();

    await page.clock.runFor(3_200);
    await expect(page.getByTestId('sky')).toHaveAttribute('data-stage', 'Sky');
    await expect(page.getByTestId('active-word')).toBeVisible();
    await expect(page.getByTestId('next-word')).toBeVisible();
    await expect(page.getByTestId('hud-time')).toContainText('1:00');
  });

  test('typing the shown word fires a thrust and the rocket climbs', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);

    const before = await speed(page);
    const word = await page.getByTestId('active-word').getAttribute('data-word');
    await typeActiveWord(page);
    await expect.poll(() => speed(page)).toBeGreaterThan(before);
    await expect(page.getByTestId('rocket')).toHaveAttribute('data-thrusts', '1');
    await expect(page.getByTestId('active-word')).not.toHaveAttribute('data-word', word!);
    await expect(page.getByTestId('hud-streak')).toContainText('1');

    await page.clock.runFor(2_000);
    await expect(page.getByTestId('hud-km')).not.toContainText(/^\s*0 km/);
  });

  test('results screen appears with the session stats when time runs out', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);
    await pauseClock(page); // the loop below must not drift on a slow runner
    // Two words every 2s keeps the rocket well above stall speed.
    for (let s = 0; s < 30; s++) {
      await typeActiveWord(page);
      await typeActiveWord(page);
      await page.clock.runFor(2_000);
    }
    await runUntilResults(page);

    await expect(page.getByText(/rockets round complete/i)).toBeVisible();
    await expect(page.getByTestId('result-score')).toContainText('km');
    await expect(page.getByTestId('result-words')).toContainText('60');
    await expect(page.getByTestId('result-accuracy')).toContainText('100%');
    await expect(page.getByRole('heading', { name: 'Stalled!' })).toBeHidden();

    await page.getByRole('button', { name: /back to games/i }).click();
    await expect(page).toHaveURL(/\/games$/);
  });

  test('an idle rocket shows the Stalling! countdown, then ends the round early', async ({ page }) => {
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);

    await page.clock.runFor(8_000); // coasting from launch speed, it stalls ~6.4s in
    await expect(page.getByTestId('stall-warning')).toContainText(/Stalling! \d s/);

    await page.clock.runFor(5_000);
    await expect(page.getByRole('heading', { name: 'Stalled!' })).toBeVisible();
    await expect(page.getByText(/rockets round complete/i)).toBeVisible();
  });
});

test.describe('Rockets game: saving scores', () => {
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
    await typeActiveWord(page);
    await page.clock.runFor(20_000); // stalls and ends early

    await expect(page.getByTestId('personal-best')).toContainText('First score saved');
    await expect.poll(() => api.calls).toContain('PUT /me/games/rockets/score');
    const best = api.scores.rockets.bestScore;
    expect(best).toBeGreaterThan(0);

    await page.reload();
    await expect(page.getByTestId('saved-best')).toContainText(`Your best: ${best} km`);
  });

  test('guest rounds are never sent to the API', async ({ page }) => {
    const api = await mockApi(page);
    await page.clock.install();
    await gotoGame(page, GAME_ID);
    await startRound(page);
    await typeActiveWord(page);
    await page.clock.runFor(20_000);

    await expect(page.getByTestId('result-score')).toBeVisible();
    await expect(page.getByTestId('personal-best')).toBeHidden();
    expect(api.calls).toEqual([]);
  });
});

test.describe('Rockets game on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('shows the keyboard-required gate instead of the game', async ({ page }) => {
    await gotoGame(page, GAME_ID);
    await expect(page.getByRole('heading', { name: /need a keyboard to play/i })).toBeVisible();
    await expect(page.getByTestId('rockets-instructions')).toBeHidden();
  });
});
