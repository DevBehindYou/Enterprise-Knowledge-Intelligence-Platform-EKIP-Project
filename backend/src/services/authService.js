import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

// Service-role client: used only server-side, never exposed to the frontend.
const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

function signAppAccessToken(user) {
  return jwt.sign(
    { userId: String(user._id), role: user.role, department: user.department, tenantId: String(user.tenantId), type: 'access' },
    env.appJwtSecret,
    { expiresIn: env.appJwtExpiresIn, algorithm: 'HS256' }
  );
}

function signAppRefreshToken(user) {
  return jwt.sign({ userId: String(user._id), type: 'refresh' }, env.appJwtSecret, {
    expiresIn: env.refreshTokenExpiresIn,
    algorithm: 'HS256',
  });
}

/**
 * One source of truth for the refresh cookie's attributes. `set` and `clear`
 * MUST agree on path/domain/sameSite/secure or the browser silently refuses to
 * clear the cookie later.
 *
 * Cross-site is the deployed reality: the frontend (e.g. *.vercel.app) and the
 * API (e.g. *.onrender.com) are different registrable domains, so the browser
 * only sends the refresh cookie on those XHRs when it's SameSite=None; Secure.
 * In local dev we stay on Lax (no HTTPS), which is fine because it's same-site.
 */
function refreshCookieOptions() {
  const isProd = env.nodeEnv === 'production';
  const opts = {
    httpOnly: true,
    secure: isProd, // required for SameSite=None; also right for HTTPS-only prod
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth', // scoped narrowly — only sent to auth endpoints
  };
  // Only attach a Domain when it's a real host. Never "localhost" in production
  // (that makes the cookie unusable); leaving it unset binds the cookie host-only
  // to the API's own domain, which is exactly what a split frontend/API wants.
  if (env.refreshCookieDomain && env.refreshCookieDomain !== 'localhost') {
    opts.domain = env.refreshCookieDomain;
  }
  return opts;
}

function setRefreshCookie(res, refreshToken) {
  res.cookie(env.refreshCookieName, refreshToken, {
    ...refreshCookieOptions(),
    maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
  });
}

function clearRefreshCookie(res) {
  res.clearCookie(env.refreshCookieName, refreshCookieOptions());
}

export const authService = {
  /** Creates a Supabase identity + mirrored MongoDB user record. */
  async signup({ name, email, password, department = 'Unassigned' }) {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email to allow immediate login
    });
    if (error) {
      const err = new Error(error.message);
      err.status = 400;
      err.code = 'AUTH_SIGNUP_FAILED';
      throw err;
    }

    const user = await User.create({
      tenantId: env.defaultTenantId,
      supabaseUserId: data.user.id,
      name,
      email: email.toLowerCase(),
      role: 'employee',
      department,
      status: 'invited',
    });
    return user;
  },

  /** Verifies credentials against Supabase, then mints EKIP's own session. */
  async login({ email, password }, res) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const err = new Error('Invalid email or password.');
      err.status = 401;
      err.code = 'AUTH_INVALID_CREDENTIALS';
      throw err;
    }

    const user = await User.findOne({ supabaseUserId: data.user.id });
    if (!user) {
      const err = new Error('No EKIP profile found for this account. Contact your admin.');
      err.status = 403;
      err.code = 'AUTH_PROFILE_MISSING';
      throw err;
    }
    if (user.status === 'suspended') {
      const err = new Error('This account has been suspended.');
      err.status = 403;
      err.code = 'AUTH_ACCOUNT_SUSPENDED';
      throw err;
    }

    user.status = 'active';
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = signAppAccessToken(user);
    const refreshToken = signAppRefreshToken(user);
    setRefreshCookie(res, refreshToken);

    return {
      accessToken,
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        notificationPreferences: user.notificationPreferences,
      },
    };
  },

  /** Reads the HttpOnly refresh cookie and mints a new short-lived access token. */
  async refresh(req, res) {
    const token = req.cookies?.[env.refreshCookieName];
    if (!token) {
      const err = new Error('No refresh token present.');
      err.status = 401;
      err.code = 'AUTH_REFRESH_MISSING';
      throw err;
    }
    let payload;
    try {
      payload = jwt.verify(token, env.appJwtSecret, { algorithms: ['HS256'] });
    } catch {
      const err = new Error('Refresh token is invalid or expired. Please log in again.');
      err.status = 401;
      err.code = 'AUTH_REFRESH_INVALID';
      throw err;
    }
    // A stolen or misdirected access token must never be usable here — only a
    // token explicitly minted as type:"refresh" may be exchanged for a new
    // access token. Without this check, a short-lived access token could be
    // replayed indefinitely to keep minting fresh access tokens, defeating
    // the entire point of it being short-lived.
    if (payload.type !== 'refresh') {
      const err = new Error('This token cannot be used to refresh a session.');
      err.status = 401;
      err.code = 'AUTH_REFRESH_INVALID';
      throw err;
    }
    const user = await User.findById(payload.userId);
    if (!user || user.status !== 'active') {
      const err = new Error('Account no longer active.');
      err.status = 401;
      err.code = 'AUTH_USER_INACTIVE';
      throw err;
    }
    // A refresh token from before a "log out everywhere" must not be able to
    // mint a fresh access token — otherwise global revocation only lasts until
    // the next silent refresh.
    if (user.sessionsValidFrom && payload.iat * 1000 < new Date(user.sessionsValidFrom).getTime()) {
      clearRefreshCookie(res);
      const err = new Error('This session was ended. Please log in again.');
      err.status = 401;
      err.code = 'AUTH_SESSION_REVOKED';
      throw err;
    }
    return { accessToken: signAppAccessToken(user) };
  },

  async logout(req, res) {
    clearRefreshCookie(res);
    // Best-effort: also invalidate the Supabase-side session if we have enough context.
    // (Supabase JS admin API doesn't expose a direct "revoke by user id" for password
    // sessions in all SDK versions — omitted here rather than left half-implemented.)
    return { success: true };
  },

  async forgotPassword({ email }) {
    await supabase.auth.resetPasswordForEmail(email);
    return { success: true }; // always return success — never reveal whether the email exists
  },

  /**
   * Profile self-service (Settings → Profile). Deliberately narrow: a user can
   * change their display name and notification preferences, and nothing else.
   * Role, department, email, and status are all privileged fields — they stay
   * exclusively on the admin path (PATCH /api/users/:id) so a user can't
   * escalate their own role by posting extra keys here.
   */
  async updateProfile(userId, { name, notificationPreferences }) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('Account not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (trimmed.length < 2 || trimmed.length > 120) {
        const err = new Error('Name must be between 2 and 120 characters.');
        err.status = 400;
        err.code = 'VALIDATION_ERROR';
        throw err;
      }
      user.name = trimmed;
    }

    if (notificationPreferences && typeof notificationPreferences === 'object') {
      if (notificationPreferences.documentUpdates !== undefined) {
        user.notificationPreferences.documentUpdates = Boolean(notificationPreferences.documentUpdates);
      }
      if (notificationPreferences.weeklyDigest !== undefined) {
        user.notificationPreferences.weeklyDigest = Boolean(notificationPreferences.weeklyDigest);
      }
    }

    await user.save();
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      notificationPreferences: user.notificationPreferences,
    };
  },

  /**
   * Password change. The current password is re-verified against Supabase first:
   * without that step, anyone holding a stolen access token could lock the real
   * owner out of their account. Only after it checks out is the new password
   * written via the admin API.
   */
  async changePassword(userId, { currentPassword, newPassword }) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('Account not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }

    const { error: verifyError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });
    if (verifyError) {
      const err = new Error('Your current password is incorrect.');
      err.status = 400;
      err.code = 'AUTH_INVALID_CREDENTIALS';
      throw err;
    }

    const { error: updateError } = await supabase.auth.admin.updateUserById(user.supabaseUserId, {
      password: newPassword,
    });
    if (updateError) {
      const err = new Error(updateError.message);
      err.status = 400;
      err.code = 'AUTH_PASSWORD_UPDATE_FAILED';
      throw err;
    }

    return { success: true };
  },

  /**
   * Revokes every session for this user, including the one making the request.
   * Bumping sessionsValidFrom one second into the future guarantees the
   * just-issued token (same-second iat) is also caught — otherwise the caller's
   * own session could survive its own "log out everywhere".
   */
  async logoutEverywhere(userId, res) {
    const user = await User.findById(userId);
    if (!user) {
      const err = new Error('Account not found.');
      err.status = 404;
      err.code = 'USER_NOT_FOUND';
      throw err;
    }
    user.sessionsValidFrom = new Date(Date.now() + 1000);
    await user.save();
    clearRefreshCookie(res);
    return { success: true };
  },

  /** Used by GET /api/auth/me to let the frontend restore session state after a page reload. */
  async getCurrentUser(userId) {
    const User = (await import('../models/User.js')).default;
    const user = await User.findById(userId).lean();
    if (!user) return null;
    return {
      id: String(user._id),
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      notificationPreferences: user.notificationPreferences || { documentUpdates: true, weeklyDigest: false },
    };
  },
};
