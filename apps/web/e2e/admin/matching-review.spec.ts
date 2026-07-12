import { test, expect } from '@playwright/test';
import {
  seedPendingMatch,
  getMatchStatus,
  cleanupSeed,
  type SeededMatch,
} from '../_helpers/matchSeed';

// Runs as an admin (storageState from admin.setup). Each test seeds its own
// pending cross-tree match, acts on it in the /admin/review queue, and verifies
// the resolve_match RPC flipped the status. Nothing auto-merges — every decision
// is an explicit admin action (shadow mode).
test.describe('Admin matching review', () => {
  let seed: SeededMatch | undefined;

  test.afterEach(async () => {
    if (seed) {
      await cleanupSeed(seed);
      seed = undefined;
    }
  });

  test('admin can MERGE a pending match (approve → confirmed link)', async ({ page }) => {
    seed = await seedPendingMatch();
    await page.goto('/admin/review');
    const card = page.locator('li', { hasText: seed.marker });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Merge|دمج/ }).dispatchEvent('click');

    await expect(page.locator('li', { hasText: seed.marker })).toHaveCount(0);
    await expect.poll(() => getMatchStatus(seed!.matchId), { timeout: 15000 }).toBe(
      'admin_approved',
    );
  });

  test('admin can REJECT a pending match', async ({ page }) => {
    seed = await seedPendingMatch();
    await page.goto('/admin/review');
    const card = page.locator('li', { hasText: seed.marker });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Reject|رفض/ }).dispatchEvent('click');

    await expect(page.locator('li', { hasText: seed.marker })).toHaveCount(0);
    await expect.poll(() => getMatchStatus(seed!.matchId), { timeout: 15000 }).toBe(
      'admin_rejected',
    );
  });

  test('admin can DEFER a pending match to the owners', async ({ page }) => {
    seed = await seedPendingMatch();
    await page.goto('/admin/review');
    const card = page.locator('li', { hasText: seed.marker });
    await expect(card).toBeVisible();

    await card.getByRole('button', { name: /Defer to owners|تأجيل/ }).dispatchEvent('click');

    await expect(page.locator('li', { hasText: seed.marker })).toHaveCount(0);
    await expect.poll(() => getMatchStatus(seed!.matchId), { timeout: 15000 }).toBe('deferred');
  });
});
