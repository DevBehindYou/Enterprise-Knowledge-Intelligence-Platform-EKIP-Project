import DocumentPermission from '../models/DocumentPermission.js';
import { writeAudit } from '../middleware/auditWrite.js';

export const permissionsController = {
  async list(req, res, next) {
    try {
      const grants = await DocumentPermission.find({ tenantId: req.user.tenantId, documentId: req.params.id })
        .populate('userId', 'name email')
        .populate('grantedBy', 'name email')
        .lean();
      res.status(200).json({ items: grants });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { grantType, role, userId, accessLevel } = req.body;
      if (!['role', 'user'].includes(grantType)) {
        return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'grantType must be "role" or "user".' } });
      }
      const grant = await DocumentPermission.create({
        tenantId: req.user.tenantId,
        documentId: req.params.id,
        grantType,
        role: grantType === 'role' ? role : undefined,
        userId: grantType === 'user' ? userId : undefined,
        accessLevel: accessLevel || 'view',
        grantedBy: req.user.id,
      });
      await writeAudit({
        req,
        action: 'permission.change',
        targetType: 'permission',
        targetId: grant._id,
        metadata: { documentId: req.params.id, grantType, accessLevel: grant.accessLevel },
      });
      res.status(201).json(grant);
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await DocumentPermission.deleteOne({ _id: req.params.permissionId, tenantId: req.user.tenantId });
      await writeAudit({
        req,
        action: 'permission.revoke',
        targetType: 'permission',
        targetId: req.params.permissionId,
        metadata: { documentId: req.params.id },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
