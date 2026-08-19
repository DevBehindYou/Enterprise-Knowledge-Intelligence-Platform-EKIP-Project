import DocumentPermission from '../models/DocumentPermission.js';
import Document from '../models/Document.js';

/**
 * Central authority for "what can this user see." Every retrieval and
 * document-list query should route through here rather than re-implementing
 * visibility rules per route (see docs/02-system-architecture.md §4.1).
 */
export const permissionService = {
  /** Security levels a role can see by default, before any explicit override. */
  defaultAllowedLevels(role) {
    switch (role) {
      case 'admin':
        return ['public', 'internal', 'confidential', 'restricted'];
      case 'manager':
        return ['public', 'internal', 'confidential'];
      case 'employee':
      default:
        return ['public', 'internal'];
    }
  },

  /**
   * Builds the $vectorSearch / find() pre-filter for a given user.
   * This is the mechanism that makes retrieval "permission-aware" rather than
   * merely "permission-checked after the fact."
   */
  buildVisibilityFilter(user) {
    return {
      tenantId: user.tenantId,
      $or: [
        { securityLevel: { $in: this.defaultAllowedLevels(user.role) }, department: user.department },
        { securityLevel: 'public' },
        { securityLevel: { $in: this.defaultAllowedLevels(user.role) }, allowedRoles: user.role },
      ],
    };
  },

  /** Checks a single document against explicit overrides + the default rule. Returns 'none' | 'view' | 'cite'. */
  async resolveAccessLevel(user, documentId) {
    const doc = await Document.findOne({ _id: documentId, tenantId: user.tenantId }).lean();
    if (!doc) return 'none';

    // Explicit user-specific override wins over everything.
    const userOverride = await DocumentPermission.findOne({
      tenantId: user.tenantId,
      documentId,
      grantType: 'user',
      userId: user.id,
    }).lean();
    if (userOverride) return userOverride.accessLevel;

    // Explicit role override.
    const roleOverride = await DocumentPermission.findOne({
      tenantId: user.tenantId,
      documentId,
      grantType: 'role',
      role: user.role,
    }).lean();
    if (roleOverride) return roleOverride.accessLevel;

    // Default: department match + role's allowed security levels, or public.
    const allowedLevels = this.defaultAllowedLevels(user.role);
    if (doc.securityLevel === 'public') return 'cite';
    if (allowedLevels.includes(doc.securityLevel) && doc.department === user.department) return 'cite';
    if (allowedLevels.includes(doc.securityLevel) && doc.allowedRoles?.includes(user.role)) return 'cite';
    return 'none';
  },

  async canView(user, documentId) {
    const level = await this.resolveAccessLevel(user, documentId);
    return level === 'view' || level === 'cite';
  },
};
