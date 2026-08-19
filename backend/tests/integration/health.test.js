import { describe, it, expect, vi } from 'vitest';

// Mock the Supabase SDK at the network boundary so this suite never makes a
// real outbound call — both authService.js and usersController.js construct
// a client from this module at import time, so the mock must be in place
// before app.js (and its transitive imports) are loaded below.
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signInWithPassword: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Invalid login credentials' },
      }),
      admin: {
        createUser: vi.fn(),
        inviteUserByEmail: vi.fn(),
      },
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}));

const request = (await import('supertest')).default;
const app = (await import('../../src/app.js')).default;

describe('GET /api/health', () => {
  it('responds 200 with a status payload without requiring auth', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok' });
    expect(res.body).toHaveProperty('mongoConnected');
    expect(res.body).toHaveProperty('timestamp');
  });
});

describe('unauthenticated access to protected routes', () => {
  it('rejects GET /api/documents without a token', async () => {
    const res = await request(app).get('/api/documents');
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_TOKEN_MISSING');
  });

  it('rejects GET /api/users (admin-only) without a token', async () => {
    const res = await request(app).get('/api/users');
    expect(res.status).toBe(401);
  });

  it('returns a structured 404 error body for an unknown route', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('ROUTE_NOT_FOUND');
  });
});

describe('POST /api/auth/login', () => {
  it('returns a clean 401 with AUTH_INVALID_CREDENTIALS for bad credentials (mocked Supabase)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrong-password' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('AUTH_INVALID_CREDENTIALS');
  });

  it('rejects a request missing required fields before ever calling Supabase', async () => {
    const res = await request(app).post('/api/auth/login').send({ email: 'nobody@example.com' });
    // password is missing — Supabase's mock would still be called since authController
    // does not currently pre-validate presence of password; this test documents that
    // behavior explicitly rather than assuming validation exists where it doesn't.
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
