import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';
import {
  seedOwnerHint,
  getHintStatus,
  cleanupOwnerHint,
  type SeededOwnerHint,
} from '../_helpers/matchSeed';

/** The uid of the logged-in (non-admin) user, persisted by user.setup. */
function ownerUserId(): string {
  const metaPath = path.resolve(process.cwd(), 'playwright/.auth/user_1.meta.json');
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf-8')) as { userId: string };
  return meta.userId;
}

// Runs as the logged-in owner (user_1 storageState).
test.describe('Owner connection review', () => {
  let seed: SeededOwnerHint | undefined;

  test.afterEach(async () => {
    if (seed) {
      await cleanupOwnerHint(seed);
      seed = undefined;
    }
  });

  test('owner accepts a deferred connection', async ({ page }) => {
    seed = await seedOwnerHint(ownerUserId());
    await page.goto('/dashboard/connections');

    // the card is located via the owner's OWN relative name (always shown in full);
    // the counterpart is a masked label.
    const card = page.locator('li', { hasText: seed.marker });
    await expect(card).toBeVisible();

    // note: "ليس نفس الشخص" (decline) also contains "نفس الشخص" — match the accept text only
    await card.getByRole('button', { name: /Yes, same person|نعم، نفس الشخص/ }).dispatchEvent('click');

    // one-sided accept → the hint is 'accepted' (link confirms only when BOTH accept)
    await expect.poll(() => getHintStatus(seed!.hintId), { timeout: 15000 }).toBe('accepted');
  });
});
