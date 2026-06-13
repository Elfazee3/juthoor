/**
 * Email-OTP code length. MUST match the Supabase Auth `otp_length`
 * setting of the environment the app points at:
 *   - hosted Juthoor project: 8 digits
 *   - local supabase stack:   6 digits (default)
 *
 * Configured via NEXT_PUBLIC_OTP_LENGTH (inlined at build time) so the
 * sign-up/login OTP inputs render the right number of cells. The server
 * action accepts any 6–8 digit token regardless, so a mismatch degrades
 * gracefully instead of locking users out.
 */
const parsed = Number.parseInt(process.env.NEXT_PUBLIC_OTP_LENGTH ?? '6', 10);

export const OTP_LENGTH =
  Number.isInteger(parsed) && parsed >= 6 && parsed <= 8 ? parsed : 6;
