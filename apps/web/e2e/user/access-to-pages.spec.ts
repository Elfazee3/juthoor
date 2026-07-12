import { test, expect } from '@playwright/test';

// Runs with the saved storageState of a freshly signed-up (non-admin) user.
test.describe('Logged-in user page access', () => {
  test('can open the dashboard (not bounced to login)', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('can open the connections lane', async ({ page }) => {
    await page.goto('/dashboard/connections');
    await expect(page).toHaveURL(/\/dashboard\/connections/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('a non-admin is not shown the admin review queue (404)', async ({ page }) => {
    await page.goto('/admin/review');
    // notFound() for non-admins — the admin queue heading must never render
    await expect(page.getByText('طابور المطابقات المقترحة')).toHaveCount(0);
    await expect(page.getByText('Proposed match queue')).toHaveCount(0);
  });
});
