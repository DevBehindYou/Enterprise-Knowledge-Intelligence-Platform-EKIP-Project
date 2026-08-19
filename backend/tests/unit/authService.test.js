import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ auth: { signInWithPassword: vi.fn(), admin: {}, resetPasswordForEmail: vi.fn() } }),
}));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn(), verify: vi.fn() } }));
vi.mock('../../src/models/User.js', () => ({ default: { findById: vi.fn(), findOne: vi.fn() } }));

const jwt = (await import('jsonwebtoken')).default;
const User = (await import('../../src/models/User.js')).default;
const { authService } = await import('../../src/services/authService.js');

describe('authService.refresh — regression coverage for the token-type-confusion fix', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects a token whose payload.type is "access" (or missing) rather than "refresh"', async () => {
    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'access' });
    const req = { cookies: { ekip_rt: 'some-access-token' } };

    await expect(authService.refresh(req, {})).rejects.toMatchObject({ code: 'AUTH_REFRESH_INVALID' });
    // Must fail before ever touching the DB for the same reason as requireAuth.
    expect(User.findById).not.toHaveBeenCalled();
  });

  it('mints a new access token for a genuine type:"refresh" token belonging to an active user', async () => {
    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'refresh' });
    User.findById.mockResolvedValue({ _id: 'user-1', role: 'employee', department: 'HR', tenantId: 'tenant-1', status: 'active' });
    jwt.sign.mockReturnValue('new-access-token');

    const req = { cookies: { ekip_rt: 'a-real-refresh-token' } };
    const result = await authService.refresh(req, {});

    expect(result.accessToken).toBe('new-access-token');
    // The newly-minted access token must itself carry type:"access".
    expect(jwt.sign).toHaveBeenCalledWith(expect.objectContaining({ type: 'access' }), expect.anything(), expect.anything());
  });

  it('rejects when there is no refresh cookie at all', async () => {
    await expect(authService.refresh({ cookies: {} }, {})).rejects.toMatchObject({ code: 'AUTH_REFRESH_MISSING' });
  });

  it('rejects a refresh token belonging to a suspended user', async () => {
    jwt.verify.mockReturnValue({ userId: 'user-1', type: 'refresh' });
    User.findById.mockResolvedValue({ _id: 'user-1', status: 'suspended' });

    await expect(authService.refresh({ cookies: { ekip_rt: 'x' } }, {})).rejects.toMatchObject({ code: 'AUTH_USER_INACTIVE' });
  });
});
