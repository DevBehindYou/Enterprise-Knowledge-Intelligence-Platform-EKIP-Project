import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret, maskSecret, isMaskedPlaceholder } from '../../src/utils/secretVault.js';

describe('secretVault', () => {
  it('round-trips a secret through encrypt/decrypt', () => {
    const secret = 'sk-ant-api03-abcdef1234567890';
    const stored = encryptSecret(secret);

    expect(stored).not.toContain(secret); // never stored in the clear
    expect(stored.startsWith('enc:v1:')).toBe(true);
    expect(decryptSecret(stored)).toBe(secret);
  });

  it('produces a different ciphertext each time for the same input', () => {
    // A fresh random IV per call — identical secrets must not produce identical
    // ciphertext, otherwise the DB leaks which configs share a key.
    const a = encryptSecret('same-value');
    const b = encryptSecret('same-value');
    expect(a).not.toBe(b);
    expect(decryptSecret(a)).toBe(decryptSecret(b));
  });

  it('treats empty and nullish input as an empty secret', () => {
    expect(encryptSecret('')).toBe('');
    expect(encryptSecret(null)).toBe('');
    expect(encryptSecret(undefined)).toBe('');
    expect(decryptSecret('')).toBe('');
    expect(decryptSecret(null)).toBe('');
  });

  it('returns an empty string rather than throwing when the ciphertext is corrupt', () => {
    // Simulates APP_JWT_SECRET having been rotated: stored values become
    // undecryptable and must read as "unset" so Settings shows a re-entry prompt
    // instead of the whole page 500ing.
    expect(decryptSecret('enc:v1:bogus:bogus:bogus')).toBe('');
  });

  it('passes through a legacy plaintext value unchanged', () => {
    expect(decryptSecret('plain-old-value')).toBe('plain-old-value');
  });

  it('masks a secret down to its last four characters', () => {
    const stored = encryptSecret('AKIAIOSFODNN7EXAMPLE');
    expect(maskSecret(stored)).toBe('••••MPLE');
  });

  it('masks an unset secret as an empty string', () => {
    expect(maskSecret('')).toBe('');
  });

  it('recognizes a masked placeholder echoed back from a form', () => {
    expect(isMaskedPlaceholder('••••MPLE')).toBe(true);
    expect(isMaskedPlaceholder('••••••••')).toBe(true);
    expect(isMaskedPlaceholder('a-real-new-key')).toBe(false);
    expect(isMaskedPlaceholder(undefined)).toBe(false);
  });
});
