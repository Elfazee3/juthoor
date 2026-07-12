import { getLoggedInUserId } from '@/data/user/user';
import { friendlyAuthError } from '@/lib/auth/authErrors';
import { createSafeActionClient } from 'next-safe-action';
import 'server-only';

export const actionClient = createSafeActionClient({
  // Log the raw error server-side for debugging, but return only a safe,
  // bilingual message to the client. Known auth failures (invalid OTP, expired
  // token, wrong credentials, rate limit, ...) map to a specific friendly
  // message; anything else collapses to a generic one so raw Supabase / DB
  // internals never reach the browser.
  handleServerError(error) {
    console.error('[safe-action] server error:', error);
    return friendlyAuthError(error);
  },
});

export const authActionClient = actionClient.use(async ({ next }) => {
  const userId = await getLoggedInUserId();
  return await next({
    ctx: {
      userId,
    },
  });
});
