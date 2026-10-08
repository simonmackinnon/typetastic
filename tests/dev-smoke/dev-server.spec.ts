import { test, expect } from '@playwright/test';

// The app must actually boot under `vite` dev: no uncaught errors and a
// non-empty #root on each main route.
for (const path of ['/', '/map', '/games', '/games/post-office']) {
  test(`dev server renders ${path}`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await page.goto(path, { waitUntil: 'networkidle' });
    expect(errors, 'uncaught errors while booting').toEqual([]);
    await expect(page.locator('#root > *').first()).toBeVisible();
  });
}

test('dev server: Log in modal opens (Cognito library loads)', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.goto('/', { waitUntil: 'networkidle' });
  expect(errors, 'uncaught errors while booting').toEqual([]);
  await page.locator('header').getByRole('button', { name: 'Log in' }).click();
  await expect(page.getByRole('dialog', { name: /sign in to TypeStar/i })).toBeVisible();
  expect(errors).toEqual([]);
});
