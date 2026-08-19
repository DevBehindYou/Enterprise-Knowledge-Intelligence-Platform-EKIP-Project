import { describe, it, expect } from 'vitest';
import { sanitizeInput } from '../../src/middleware/sanitizeInput.js';

function run(body = {}, query = {}, params = {}) {
  const req = { body, query, params };
  sanitizeInput(req, {}, () => {});
  return req;
}

describe('sanitizeInput', () => {
  it('strips a top-level operator key entirely, leaving the field absent (not an empty object)', () => {
    const req = run({}, { department: { $ne: 'zzz' } });
    expect(req.query.department).toBeUndefined();
  });

  it('strips $exists, $regex, $where, and $gt the same way — any $-prefixed key', () => {
    for (const op of ['$exists', '$regex', '$where', '$gt', '$in']) {
      const req = run({}, { tag: { [op]: 'x' } });
      expect(req.query.tag, `operator ${op} should be stripped`).toBeUndefined();
    }
  });

  it('strips keys containing "." (dot-notation path injection)', () => {
    const req = run({ 'user.role': 'admin' });
    expect(req.body['user.role']).toBeUndefined();
  });

  it('recurses into nested objects', () => {
    const req = run({ filter: { nested: { $ne: 'x' }, safe: 'ok' } });
    expect(req.body.filter.nested).toBeUndefined();
    expect(req.body.filter.safe).toBe('ok');
  });

  it('recurses into arrays without dropping legitimate array items', () => {
    // The injection payload element collapses to undefined and is compacted out,
    // so the array closes up rather than keeping a hole at its index. Positions
    // are deliberately NOT preserved: no caller pairs these arrays by index (they
    // are consumed as set membership — `allowedRoles: user.role`, `.includes()`,
    // `for...of`), and a surviving hole would serialize to null and reach Mongo,
    // where `{ field: { $in: [..., null] } }` also matches docs missing the field.
    const req = run({ tags: ['finance', { $ne: 'x' }, 'hr'] });
    expect(req.body.tags).toEqual(['finance', 'hr']);
  });

  it('leaves ordinary strings, numbers, and booleans completely untouched', () => {
    const req = run({ name: 'Priya Shah', age: 30, active: true }, { page: '2' });
    expect(req.body).toEqual({ name: 'Priya Shah', age: 30, active: true });
    expect(req.query).toEqual({ page: '2' });
  });

  it('a plain string value for a field that could otherwise be attacked is passed through unchanged', () => {
    const req = run({}, { department: 'HR', tag: 'onboarding' });
    expect(req.query.department).toBe('HR');
    expect(req.query.tag).toBe('onboarding');
  });

  it('handles a completely empty request without throwing', () => {
    expect(() => run(undefined, undefined, undefined)).not.toThrow();
  });
});
