import { test, expect } from '@playwright/test';

// The middleware (proxy.ts) default-denies app routes and redirects an anonymous
// visitor to /login, preserving a SANITIZED same-origin `next` (the A1 fix).
test.describe.parallel('Anonymous user gated page access', () => {
  test('dashboard redirects to login, preserving next', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  });

  test('the connections lane redirects to login, preserving next', async ({ page }) => {
    await page.goto('/dashboard/connections');
    await expect(page).toHaveURL(/\/login\?next=%2Fdashboard%2Fconnections/);
  });

  test('the admin review queue redirects to login, preserving next', async ({ page }) => {
    await page.goto('/admin/review');
    await expect(page).toHaveURL(/\/login\?next=%2Fadmin%2Freview/);
  });
});
