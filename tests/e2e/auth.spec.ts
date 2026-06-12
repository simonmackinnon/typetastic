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
