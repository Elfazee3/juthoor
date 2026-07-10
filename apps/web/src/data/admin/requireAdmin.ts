import { cache } from 'react';
import { createJuthoorSupabaseClient } from '@/supabase-clients/juthoor-server';
import { getCachedLoggedInVerifiedSupabaseUser } from '@/rsc-data/supabase';

/**
 * The current user's id IF they are an admin, else null.
 *
 * Server-verified (getUser via the cached verified helper) then checks
 * `profiles.is_admin`. Cached per request, so the page guard and the
 * subsequent admin data fetch share a single lookup. Returns null (rather than
 * throwing) for an unauthenticated visitor so page guards can 404 cleanly.
 */
export const getAdminUserId = cache(async (): Promise<string | null> => {
  let uid: string | undefined;
  try {
    const { user } = await getCachedLoggedInVerifiedSupabaseUser();
    uid = user?.id;
  } catch {
    return null; // no valid session
  }
  if (!uid) return null;

  const supabase = await createJuthoorSupabaseClient();
  const { data } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', uid)
    .maybeSingle();
  return (data as { is_admin: boolean } | null)?.is_admin ? uid : null;
});

/** True when the current user is an admin. For page-level `notFound()` guards. */
export async function isCurrentUserAdmin(): Promise<boolean> {
  return Boolean(await getAdminUserId());
}

/**
 * Assert the current user is an admin; returns their uid or throws
 * 'Not authorized'. Reused by every admin-only data action and page.
 */
export async function requireAdmin(): Promise<string> {
  const uid = await getAdminUserId();
  if (!uid) throw new Error('Not authorized');
  return uid;
}
