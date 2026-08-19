import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('jsonwebtoken', () => ({
  default: { verify: vi.fn() },
}));
vi.mock('../../src/models/User.js', () => ({
  default: { findById: vi.fn() },
}));

const jwt = (await import('jsonwebtoken')).default;
const User = (await import('../../src/models/User.js')).default;
const { requireAuth } = await import('../../src/middleware/requireAuth.js');

function mockRes() {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('requireAuth', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects a request with no Authorization header', async () => {
    const req = { headers: {} };
    const res = mockRes();
    const next = vi.fn();

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('rejects an expired token with AUTH_TOKEN_EXPIRED so the client knows to refresh', async () => {
    const req = { headers: { authorization: 'Bearer expired-token' } };
    const res = mockRes();
    const next = vi.fn();
    const expiredError = new Error('jwt expired');
    expiredError.name = 'TokenExpiredError';
    jwt.verify.mockImplementation(() => {
      throw expiredError;
    });

    await requireAuth(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'AUTH_TOKEN_EXPIRED' }) })
    );
  });

  it('attaches req.user and calls next() for a valid access token and active user', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = vi.fn();

    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'access' });
    User.findById.mockReturnValue({
      lean: vi.fn().mockResolvedValue({
        _id: 'user-1',
        tenantId: 'tenant-1',
        role: 'employee',
        department: 'HR',
        email: 'a@b.com',
        name: 'Test User',
        status: 'active',
      }),
    });

    await requireAuth(req, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(req.user).toMatchObject({ id: 'user-1', role: 'employee', department: 'HR' });
  });

  it('rejects a suspended user even with a structurally valid access token', async () => {
    const req = { headers: { authorization: 'Bearer valid-token' } };
    const res = mockRes();
    const next = vi.fn();

    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'access' });
    User.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'user-1', status: 'suspended' }) });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  // --- Regression coverage for the token-type-confusion fix (Security Audit
  // Report, Finding 1): a refresh token must never work as a Bearer access
  // token, regardless of how structurally valid its signature is. ---
  it('rejects a REFRESH token presented as a Bearer access token', async () => {
    const req = { headers: { authorization: 'Bearer some-refresh-token' } };
    const res = mockRes();
    const next = vi.fn();

    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'refresh' });
    User.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'user-1', status: 'active' }) });

    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: expect.objectContaining({ code: 'AUTH_TOKEN_INVALID' }) })
    );
    // It must fail on the type check itself, before ever touching the DB —
    // otherwise a refresh token for a real active user would slip through.
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('rejects a token with no type claim at all (e.g. one issued before this fix)', async () => {
    const req = { headers: { authorization: 'Bearer legacy-token' } };
    const res = mockRes();
    const next = vi.fn();

    jwt.verify.mockReturnValue({ userId: 'user-1' }); // no `type` field
    await requireAuth(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  it('passes algorithms: ["HS256"] to jwt.verify, not accepting whatever the token header declares', async () => {
    const req = { headers: { authorization: 'Bearer some-token' } };
    const res = mockRes();
    const next = vi.fn();
    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'access' });
    User.findById.mockReturnValue({ lean: vi.fn().mockResolvedValue({ _id: 'user-1', status: 'active', role: 'employee', department: 'HR' }) });

    await requireAuth(req, res, next);

    expect(jwt.verify).toHaveBeenCalledWith('some-token', expect.anything(), expect.objectContaining({ algorithms: ['HS256'] }));
  });
});
