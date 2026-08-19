import { describe, it, expect } from 'vitest';
import { validatePassword, validateEmail } from '../../src/utils/validators.js';

describe('validatePassword', () => {
  it('rejects a password shorter than 8 characters (closing the client-only-validation gap)', () => {
    expect(validatePassword('1')).toMatch(/at least 8/i);
    expect(validatePassword('short1')).toMatch(/at least 8/i);
  });

  it('rejects a password with no letters or no numbers', () => {
    expect(validatePassword('12345678')).toMatch(/letter and one number/i);
    expect(validatePassword('abcdefgh')).toMatch(/letter and one number/i);
  });

  it('rejects an unreasonably long password (128+ chars)', () => {
    expect(validatePassword('a1'.repeat(100))).toMatch(/under 128/i);
  });

  it('accepts a reasonable real-world password', () => {
    expect(validatePassword('Str0ngPassword')).toBeNull();
    expect(validatePassword('correcthorse1battery')).toBeNull();
  });

  it('rejects non-string input rather than throwing', () => {
    expect(validatePassword(undefined)).toBeTruthy();
    expect(validatePassword(12345678)).toBeTruthy();
    expect(() => validatePassword(null)).not.toThrow();
  });
});

describe('validateEmail', () => {
  it('accepts a well-formed email', () => {
    expect(validateEmail('priya.shah@acmecorp.com')).toBeNull();
  });

  it('rejects obviously malformed input', () => {
    expect(validateEmail('not-an-email')).toBeTruthy();
    expect(validateEmail('missing-domain@')).toBeTruthy();
    expect(validateEmail('@missing-local.com')).toBeTruthy();
  });

  it('rejects non-string input rather than throwing', () => {
    expect(validateEmail(undefined)).toBeTruthy();
    expect(() => validateEmail({ $ne: null })).not.toThrow();
  });
});
