import { describe, expect, it } from 'vitest';
import {
  PASSWORD_MIN_LENGTH,
  PASSWORD_TOO_SHORT_MESSAGE,
  passwordField,
} from '../passwordPolicy';

describe('passwordField policy', () => {
  it('requires at least 8 characters', () => {
    expect(PASSWORD_MIN_LENGTH).toBe(8);
    expect(passwordField.safeParse('').success).toBe(false);
    expect(passwordField.safeParse('short').success).toBe(false);
    expect(passwordField.safeParse('1234567').success).toBe(false); // 7
  });

  it('accepts 8+ character passwords', () => {
    expect(passwordField.safeParse('12345678').success).toBe(true);
    expect(passwordField.safeParse('a-strong-passphrase').success).toBe(true);
  });

  it('reports the bilingual error message', () => {
    const result = passwordField.safeParse('short');
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toBe(PASSWORD_TOO_SHORT_MESSAGE);
    }
  });
});
