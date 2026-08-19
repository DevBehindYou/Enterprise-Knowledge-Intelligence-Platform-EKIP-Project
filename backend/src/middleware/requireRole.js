/**
 * Usage: router.get('/admin/only', requireAuth, requireRole('admin'), handler)
 * Accepts one or more allowed roles.
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: { code: 'AUTH_TOKEN_MISSING', message: 'Not authenticated.' } });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: { code: 'AUTH_FORBIDDEN', message: 'Your role does not permit this action.' } });
    }
    next();
  };
}
