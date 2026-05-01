import { redirect } from 'next/navigation';

import { ensureUserHasDefaultTree } from '@/data/anon/trees';

/**
 * `/tree` — bootstraps a default tree on first visit then redirects to
 * `/tree/[treeId]`. Per the 2026-04-17 decision, the user never sees
 * an empty `/tree` screen: their first tree is auto-created with the
 * name "شجرة عائلتي" ("My Family Tree") and they land straight in the
 * Add-Yourself wizard.
 *
 * We call a plain server-side helper (not a next-safe-action server
 * action) so that `revalidatePath` isn't invoked during render, which
 * Next 16 rejects.
 */
export default async function TreeRoot() {
  let treeId: string | null;
  try {
    treeId = await ensureUserHasDefaultTree();
  } catch {
    redirect('/login');
  }

  if (!treeId) {
    redirect('/login');
  }

  redirect(`/tree/${treeId}`);
}
