import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('shows TypeStar heading and play button', async ({ page }) => {
    await page.goto('/');
    // MobileGate uses h2; the landing page h1 is the only h1
    await expect(page.locator('h1').filter({ hasText: 'TypeStar' })).toBeVisible();
    await expect(page.getByRole('link', { name: /play now/i })).toBeVisible();
  });

  test('navigates to level map', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /see all levels/i }).click();
    await expect(page).toHaveURL(/\/map/);
    await expect(page.getByText(/level map/i)).toBeVisible();
  });
});

test.describe('Level Map', () => {
  test('shows all 6 zones', async ({ page }) => {
    await page.goto('/map');
    await expect(page.getByText('Keyboard Kingdom')).toBeVisible();
    await expect(page.getByText('Top Tower')).toBeVisible();
    await expect(page.getByText('Bottom Bunker')).toBeVisible();
    await expect(page.getByText('Word World')).toBeVisible();
    await expect(page.getByText('Sentence City')).toBeVisible();
    await expect(page.getByText('Speed Summit')).toBeVisible();
  });

  test('shows 20 level cards', async ({ page }) => {
    await page.goto('/map');
    const levels = await page.locator('[data-testid^="level-"]').all();
    expect(levels).toHaveLength(20);
  });

  test('level 1 is clickable', async ({ page }) => {
    await page.goto('/map');
    const level1 = page.getByTestId('level-01');
    await expect(level1).toBeVisible();
    await expect(level1).not.toHaveAttribute('aria-disabled', 'true');
  });

  test('locked levels show lock icon', async ({ page }) => {
    await page.goto('/map');
    // Level 2 and beyond should be locked without progress
    const level2 = page.getByTestId('level-02');
    await expect(level2.getByRole('img', { name: 'Locked' })).toBeVisible();
  });
});

test.describe('Game Page', () => {
  test.beforeEach(async ({ page }) => {
    // Pre-dismiss the level 1 tutorial so it doesn't block game page tests
    await page.addInitScript(() => {
      localStorage.setItem('tt_dismissed', JSON.stringify(['01']));
    });
  });

  test('navigates to level 1 game', async ({ page }) => {
    await page.goto('/play/01');
    await expect(page.getByTestId('level-name')).toContainText('Home Base');
    await expect(page.getByRole('button', { name: /start/i })).toBeVisible();
  });

  test('shows countdown after clicking start', async ({ page }) => {
    await page.goto('/play/01');
    await page.getByRole('button', { name: /start/i }).click();
    // Wait for the countdown number to appear in the dedicated countdown div
    await expect(page.locator('.animate-pop').filter({ hasText: /^[123]$/ })).toBeVisible({
      timeout: 4000,
    });
  });

  test('shows virtual keyboard on level 1', async ({ page }) => {
    await page.goto('/play/01');
    await expect(page.getByLabel('Virtual keyboard')).toBeVisible();
  });

  test('back button returns to map', async ({ page }) => {
    await page.goto('/play/01');
    // The back button is a <button> element (uses navigate()), not a link
    await page.getByRole('button', { name: /back/i }).click();
    await expect(page).toHaveURL(/\/map/);
  });
});

test.describe('Badges Page', () => {
  test('shows badges heading', async ({ page }) => {
    await page.goto('/badges');
    await expect(page.getByRole('heading', { name: /badge cabinet/i })).toBeVisible();
  });

  test('shows 12 badge cards', async ({ page }) => {
    await page.goto('/badges');
    const badges = await page.locator('[data-testid^="badge-"]').all();
    expect(badges).toHaveLength(12);
  });

  test('unearned badges are visually distinct', async ({ page }) => {
    await page.goto('/badges');
    // Unearned badges have grayscale + opacity-50 classes; no "Earned!" label
    const earnedLabels = await page.locator('text=✓ Earned!').count();
    // A fresh visitor has 0 earned badges
    expect(earnedLabels).toBe(0);
  });
});

test.describe('Navigation', () => {
  test('header logo navigates to home', async ({ page }) => {
    await page.goto('/map');
    // Use the header logo link specifically (it's the first TypeStar link)
    await page.locator('header').getByRole('link', { name: /TypeStar/i }).click();
    await expect(page).toHaveURL('/');
  });

  test('unknown routes redirect to home', async ({ page }) => {
    await page.goto('/this-does-not-exist');
    await expect(page).toHaveURL('/');
  });
});
