import AuditLog from '../models/AuditLog.js';

/**
 * Fire-and-forget audit writer. Never blocks or fails the parent request —
 * an audit-log write failure should be logged, not surfaced to the user as
 * their action failing (see docs/03-database-schema.md §6).
 */
export async function writeAudit({ req, action, targetType, targetId, metadata = {} }) {
  try {
    await AuditLog.create({
      tenantId: req.user.tenantId,
      actorId: req.user.id,
      action,
      targetType,
      targetId,
      metadata,
      ipAddress: req.ip,
    });
  } catch (err) {
    console.error('[audit] failed to write audit log entry', { action, targetType, targetId }, err);
  }
}
