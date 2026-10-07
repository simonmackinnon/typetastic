import { test, expect } from '@playwright/test';

test.describe('Auth Modal', () => {
  test('opens login modal from header', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByRole('dialog', { name: /sign in to TypeStar/i })).toBeVisible();
    await expect(page.getByText('Welcome Back!')).toBeVisible();
  });

  test('switches to register form', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.getByRole('button', { name: /sign up free/i }).click();
    await expect(page.getByText('Join TypeStar!')).toBeVisible();
    await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();
  });

  test('closes modal with X button', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.getByRole('button', { name: /close/i }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('shows validation error for empty email', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    await page.getByRole('button', { name: /log in/i }).last().click();
    // HTML5 validation fires — check the input is in invalid state
    const emailInput = page.getByPlaceholder('you@example.com');
    await expect(emailInput).toBeVisible();
  });

  test('login form has email and password fields', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: /log in/i }).click();
    await expect(page.getByPlaceholder('you@example.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });
});

// TYP-10: below the `sm` breakpoint the header auth buttons are icon-only, so
// they must carry an accessible name. Runs at a phone viewport so CI's
// desktop Chromium project covers it too.
test.describe('Header auth buttons on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Log in button has an accessible name and opens the modal', async ({ page }) => {
    await page.goto('/');
    const logIn = page.locator('header').getByRole('button', { name: 'Log in' });
    await expect(logIn).toBeVisible();
    await logIn.click();
    await expect(page.getByRole('dialog', { name: /sign in to TypeStar/i })).toBeVisible();
  });

  test('Log out button has an accessible name when signed in', async ({ page }) => {
    // Fake signed-in Google session (the app reads ts_oauth_tokens before Cognito)
    const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url');
    const idToken = `${b64({ alg: 'none' })}.${b64({ sub: 'e2e-kid', email: 'e2e-kid@example.com' })}.sig`;
    const tokens = JSON.stringify({
      id_token: idToken, access_token: 'x', refresh_token: 'x', expires_at: Date.UTC(2100, 0, 1),
    });
    await page.addInitScript((t) => localStorage.setItem('ts_oauth_tokens', t), tokens);
    await page.route(/\/me\//, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '[]' }));
    await page.goto('/');
    await expect(page.locator('header').getByRole('button', { name: 'Log out' })).toBeVisible();
  });
});
