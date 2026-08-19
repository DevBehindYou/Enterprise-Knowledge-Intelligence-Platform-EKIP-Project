import { describe, it, expect } from 'vitest';
import {
  normalizePrefix,
  normalizeName,
  tenantRoot,
  classifyFile,
  guessMimeType,
} from '../../src/services/storage/fileManagerService.js';

describe('normalizePrefix', () => {
  it('returns an empty string for the root', () => {
    expect(normalizePrefix('')).toBe('');
    expect(normalizePrefix('/')).toBe('');
    expect(normalizePrefix(undefined)).toBe('');
  });

  it('strips leading, trailing, and duplicate slashes', () => {
    expect(normalizePrefix('/brand/logos/')).toBe('brand/logos');
    expect(normalizePrefix('brand//logos')).toBe('brand/logos');
  });

  it('normalizes Windows-style backslashes to forward slashes', () => {
    expect(normalizePrefix('brand\\logos')).toBe('brand/logos');
  });

  it('drops "." segments', () => {
    expect(normalizePrefix('brand/./logos')).toBe('brand/logos');
  });

  it('rejects path traversal outright rather than silently resolving it', () => {
    // The whole point: a caller must never be able to address a key outside
    // their own tenant prefix, so ".." is refused rather than collapsed.
    expect(() => normalizePrefix('../other-tenant')).toThrow(/traversal/i);
    expect(() => normalizePrefix('brand/../../etc/passwd')).toThrow(/traversal/i);
    expect(() => normalizePrefix('a/b/../..')).toThrow(/traversal/i);
  });

  it('rejects control characters', () => {
    expect(() => normalizePrefix('brand/logo\x01.png')).toThrow(/invalid characters/i);
  });

  it('rejects an over-long path', () => {
    expect(() => normalizePrefix('a'.repeat(1100))).toThrow(/too long/i);
  });

  it('attaches a 400 status and VALIDATION_ERROR code to its rejections', () => {
    // Rejections must surface as client errors, not 500s.
    try {
      normalizePrefix('../escape');
      throw new Error('should have thrown');
    } catch (err) {
      expect(err.status).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
    }
  });
});

describe('normalizeName', () => {
  it('accepts an ordinary filename', () => {
    expect(normalizeName('logo.png')).toBe('logo.png');
    expect(normalizeName('  Q4 Report.pdf  ')).toBe('Q4 Report.pdf');
  });

  it('rejects any name containing a path separator', () => {
    // A single segment only — otherwise "rename" could relocate a file.
    expect(() => normalizeName('nested/logo.png')).toThrow(/slashes/i);
    expect(() => normalizeName('nested\\logo.png')).toThrow(/slashes/i);
  });

  it('rejects traversal-shaped and empty names', () => {
    expect(() => normalizeName('..')).toThrow(/valid name/i);
    expect(() => normalizeName('.')).toThrow(/valid name/i);
    expect(() => normalizeName('')).toThrow(/valid name/i);
    expect(() => normalizeName('   ')).toThrow(/valid name/i);
  });

  it('rejects a name longer than 255 characters', () => {
    expect(() => normalizeName('x'.repeat(256))).toThrow(/too long/i);
  });
});

describe('tenantRoot', () => {
  it('scopes every key under a per-tenant prefix', () => {
    expect(tenantRoot('507f1f77bcf86cd799439011')).toBe('tenants/507f1f77bcf86cd799439011/');
  });
});

describe('classifyFile', () => {
  it('maps extensions to the kind the UI groups and filters by', () => {
    expect(classifyFile('logo.PNG')).toBe('image');
    expect(classifyFile('policy.pdf')).toBe('pdf');
    expect(classifyFile('data.csv')).toBe('spreadsheet');
    expect(classifyFile('deck.pptx')).toBe('presentation');
    expect(classifyFile('clip.mp4')).toBe('video');
    expect(classifyFile('song.mp3')).toBe('audio');
    expect(classifyFile('bundle.zip')).toBe('archive');
    expect(classifyFile('app.jsx')).toBe('code');
    expect(classifyFile('notes.txt')).toBe('document');
  });

  it('falls back to "other" for an unknown extension', () => {
    expect(classifyFile('mystery.qqq')).toBe('other');
    expect(classifyFile('no-extension')).toBe('other');
  });
});

describe('guessMimeType', () => {
  it('resolves known extensions', () => {
    expect(guessMimeType('logo.png')).toBe('image/png');
    expect(guessMimeType('policy.pdf')).toBe('application/pdf');
  });

  it('falls back to octet-stream for anything unrecognized', () => {
    expect(guessMimeType('mystery.qqq')).toBe('application/octet-stream');
  });
});
