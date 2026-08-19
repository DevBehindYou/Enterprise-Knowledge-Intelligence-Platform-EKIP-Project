import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import User from '../models/User.js';

/**
 * Verifies the short-lived app-issued JWT (NOT the Supabase token — see
 * docs/02-system-architecture.md §4 for why the two are decoupled).
 * Attaches a fresh copy of the user's role/department/status to req.user
 * so role changes take effect immediately without requiring re-login.
 */
export async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) {
      return res.status(401).json({ error: { code: 'AUTH_TOKEN_MISSING', message: 'No access token provided.' } });
    }

    let payload;
    try {
      payload = jwt.verify(token, env.appJwtSecret, { algorithms: ['HS256'] });
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'AUTH_TOKEN_EXPIRED' : 'AUTH_TOKEN_INVALID';
      return res.status(401).json({ error: { code, message: 'Access token is invalid or expired.' } });
    }

    // A refresh token (long-lived, meant only for POST /auth/refresh) must never
    // work as a Bearer access token here — without this check, a stolen refresh
    // token becomes a 30-day skeleton key to every protected route instead of
    // being restricted to the one endpoint it was minted for.
    if (payload.type !== 'access') {
      return res
        .status(401)
        .json({ error: { code: 'AUTH_TOKEN_INVALID', message: 'This token cannot be used to access this resource.' } });
    }

    const user = await User.findById(payload.userId).lean();
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: { code: 'AUTH_USER_INACTIVE', message: 'This account is not active.' } });
    }

    // Honour "log out everywhere": a token minted before sessionsValidFrom is
    // dead even though its signature and expiry are still valid. iat is in
    // seconds, so compare at second resolution.
    if (user.sessionsValidFrom && payload.iat * 1000 < new Date(user.sessionsValidFrom).getTime()) {
      return res
        .status(401)
        .json({ error: { code: 'AUTH_SESSION_REVOKED', message: 'This session was ended. Please log in again.' } });
    }

    req.user = {
      id: String(user._id),
      tenantId: String(user.tenantId),
      role: user.role,
      department: user.department,
      email: user.email,
      name: user.name,
    };
    next();
  } catch (err) {
    next(err);
  }
}
