import { getLoggedInUserId } from '@/data/user/user';
import { createSafeActionClient } from 'next-safe-action';
import 'server-only';

export const actionClient = createSafeActionClient({
  // Surface the actual error message to the client instead of the default
  // "Something went wrong while executing the operation". Supabase auth
  // errors (invalid OTP, expired token, user not found, etc.) carry the
  // information the user needs to recover.
  handleServerError(error) {
    return error instanceof Error ? error.message : String(error);
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
