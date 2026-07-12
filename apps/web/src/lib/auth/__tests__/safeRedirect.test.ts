import { describe, expect, it } from 'vitest';
import { DEFAULT_REDIRECT, sanitizeNextPath } from '../safeRedirect';

describe('sanitizeNextPath', () => {
  it('allows same-origin absolute paths', () => {
    expect(sanitizeNextPath('/dashboard')).toBe('/dashboard');
    expect(sanitizeNextPath('/dash')).toBe('/dash');
    expect(sanitizeNextPath('/tree/123?tab=chart#node')).toBe(
      '/tree/123?tab=chart#node'
    );
    expect(sanitizeNextPath('/')).toBe('/');
  });

  it('falls back for absolute off-origin URLs', () => {
    expect(sanitizeNextPath('https://evil.com')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath('http://evil.com/path')).toBe(DEFAULT_REDIRECT);
  });

  it('falls back for protocol-relative and backslash-tricked targets', () => {
    expect(sanitizeNextPath('//evil.com')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath('/\\evil.com')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath('/\\/evil.com')).toBe(DEFAULT_REDIRECT);
  });

  it('falls back for javascript: and other non-path schemes', () => {
    expect(sanitizeNextPath('javascript:alert(1)')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath('data:text/html,x')).toBe(DEFAULT_REDIRECT);
  });

  it('handles percent-encoded off-origin attempts', () => {
    // decodeURIComponent('%2F%2Fevil.com') === '//evil.com'
    expect(sanitizeNextPath('%2F%2Fevil.com')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath('https%3A%2F%2Fevil.com')).toBe(DEFAULT_REDIRECT);
  });

  it('falls back for malformed encoding, empty, and nullish input', () => {
    expect(sanitizeNextPath('%')).toBe(DEFAULT_REDIRECT); // malformed
    expect(sanitizeNextPath('')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath(null)).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath(undefined)).toBe(DEFAULT_REDIRECT);
  });

  it('rejects control characters that browsers may normalize', () => {
    expect(sanitizeNextPath('/foo\nbar')).toBe(DEFAULT_REDIRECT);
    expect(sanitizeNextPath('/\tevil')).toBe(DEFAULT_REDIRECT);
  });

  it('respects a custom fallback', () => {
    expect(sanitizeNextPath(null, '/login')).toBe('/login');
    expect(sanitizeNextPath('//evil.com', '/login')).toBe('/login');
  });
});
