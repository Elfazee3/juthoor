import { describe, expect, it } from 'vitest';
import {
  OTP_LENGTH,
  OTP_MAX_LENGTH,
  OTP_MIN_LENGTH,
  isValidOtp,
} from '../otpConfig';

describe('otp config', () => {
  it('exposes the 6–8 digit bounds', () => {
    expect(OTP_MIN_LENGTH).toBe(6);
    expect(OTP_MAX_LENGTH).toBe(8);
  });

  it('renders a length within the accepted range', () => {
    expect(OTP_LENGTH).toBeGreaterThanOrEqual(OTP_MIN_LENGTH);
    expect(OTP_LENGTH).toBeLessThanOrEqual(OTP_MAX_LENGTH);
  });
});

describe('isValidOtp (submit gate)', () => {
  it('accepts any 6, 7, or 8 digit code', () => {
    expect(isValidOtp('123456')).toBe(true);
    expect(isValidOtp('1234567')).toBe(true);
    expect(isValidOtp('12345678')).toBe(true);
  });

  it('rejects too-short and too-long codes', () => {
    expect(isValidOtp('12345')).toBe(false);
    expect(isValidOtp('123456789')).toBe(false);
    expect(isValidOtp('')).toBe(false);
  });

  it('rejects non-digit content', () => {
    expect(isValidOtp('12 456')).toBe(false);
    expect(isValidOtp('12345a')).toBe(false);
    expect(isValidOtp('abcdef')).toBe(false);
    expect(isValidOtp(' 123456')).toBe(false);
  });
});
