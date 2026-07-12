import { z } from 'zod';

/**
 * Minimum length for a password the user SETS (reset / update flows).
 * Existing-user login is not re-validated against this, so raising it never
 * locks anyone out — it only strengthens newly chosen passwords.
 */
export const PASSWORD_MIN_LENGTH = 8;

// Bilingual (AR · EN) so the message reads in either locale — the
// update-password toast surfaces it verbatim.
export const PASSWORD_TOO_SHORT_MESSAGE =
  'كلمة المرور يجب ألا تقل عن 8 أحرف · Password must be at least 8 characters';

/** Zod field for a password being set. Reused by the password-set actions. */
export const passwordField = z
  .string()
  .min(PASSWORD_MIN_LENGTH, { message: PASSWORD_TOO_SHORT_MESSAGE });
