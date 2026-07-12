import { createSupabaseClient } from '@/supabase-clients/server';
import { cache } from 'react';

// Only meant to be used in protected pages
// This makes an extra call to the server to verify the user is still logged in
// Use sparingly
export const getCachedLoggedInVerifiedSupabaseUser = cache(async () => {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }
  return data;
});

export const getCachedLoggedInUserClaims = cache(async () => {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error) {
    throw error;
  }
  if (!data?.claims) {
    throw new Error('No claims found');
  }
  return data.claims;
});

// Returns null instead of throwing when the visitor is unauthenticated, so
// callers (like AuthGuard) can branch on it and redirect to /login.
export const getCachedLoggedInUserClaimsOrNull = cache(async () => {
  const supabase = await createSupabaseClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) {
    return null;
  }
  return data.claims;
});

export const getCachedIsUserLoggedIn = cache(async () => {
  const claims = await getCachedLoggedInUserClaimsOrNull();
  return Boolean(claims?.sub);
});

export const getCachedLoggedInUserId = cache(async () => {
  const claims = await getCachedLoggedInUserClaims();
  return claims.sub;
});

// Like getCachedLoggedInUserId but returns null for an unauthenticated visitor
// instead of throwing — for data reads that degrade to "no user" (return null /
// empty) rather than erroring. Uses claims (local JWT), so no network round trip.
export const getCachedLoggedInUserIdOrNull = cache(async () => {
  const claims = await getCachedLoggedInUserClaimsOrNull();
  return claims?.sub ?? null;
});
