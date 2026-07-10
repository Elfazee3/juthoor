/**
 * Email-OTP code length. MUST match the Supabase Auth `otp_length` setting of
 * the environment the app points at:
 *   - hosted Juthoor project: 8 digits  (the default here)
 *   - local supabase stack:   6 digits  (set NEXT_PUBLIC_OTP_LENGTH=6)
 *
 * Configured via NEXT_PUBLIC_OTP_LENGTH (inlined at build time) so the
 * sign-up/login OTP inputs render the right number of cells. Defaults to 8
 * because the hosted project — the "forgot to configure" case — issues
 * 8-digit codes; a 6-digit default silently locked hosted users out.
 *
 * The client submit gate (`isValidOtp`) and the server action
 * (`verifyEmailOtpSchema`) both accept ANY 6–8 digit token, so a length
 * mismatch degrades gracefully instead of locking users out.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 8;

const parsed = Number.parseInt(process.env.NEXT_PUBLIC_OTP_LENGTH ?? '8', 10);

export const OTP_LENGTH =
  Number.isInteger(parsed) &&
  parsed >= OTP_MIN_LENGTH &&
  parsed <= OTP_MAX_LENGTH
    ? parsed
    : OTP_MAX_LENGTH;

/**
 * True when `code` is a submittable OTP: 6–8 ASCII digits. Used by the sign-up
 * and login submit buttons so a valid code is accepted regardless of how many
 * cells happened to be rendered (env length vs. actual server length).
 */
export function isValidOtp(code: string): boolean {
  return /^\d{6,8}$/.test(code);
}
