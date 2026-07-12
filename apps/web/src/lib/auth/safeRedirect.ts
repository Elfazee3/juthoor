/**
 * Sanitize a user-supplied `next` redirect target to a safe, same-origin path.
 *
 * Prevents open-redirect: an attacker-controlled `next` — `https://evil.com`,
 * `//evil.com`, `/\evil.com`, `javascript:…`, percent-encoded variants — must
 * never send the user off-origin. Returns a guaranteed same-origin path,
 * falling back to `/dashboard` for anything not provably safe.
 *
 * Callers should still build the final URL relative to the request origin
 * (`new URL(sanitizeNextPath(next), origin)`), never against a base derived
 * from the untrusted value.
 */
export const DEFAULT_REDIRECT = '/dashboard';

export function sanitizeNextPath(
  next: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT
): string {
  if (!next) return fallback;

  let decoded: string;
  try {
    decoded = decodeURIComponent(next);
  } catch {
    // Malformed percent-encoding — do not trust it.
    return fallback;
  }

  const value = decoded.trim();

  // Must be an absolute same-origin path with a single leading slash.
  if (!value.startsWith('/')) return fallback;
  // Reject protocol-relative (`//host`) and backslash-tricked (`/\host`)
  // targets — browsers resolve both to a different origin.
  if (value.startsWith('//') || value.startsWith('/\\')) return fallback;
  // Reject control characters and backslashes anywhere, which browsers may
  // normalize into an authority component. `\p{Cc}` is the Unicode control
  // category (U+0000–U+001F, U+007F–U+009F), matched via property escape so
  // no literal control characters appear in the source.
  if (/[\p{Cc}\\]/u.test(value)) return fallback;

  return value;
}
