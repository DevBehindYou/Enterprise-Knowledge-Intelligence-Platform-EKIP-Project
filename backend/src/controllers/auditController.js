import AuditLog from '../models/AuditLog.js';

export const auditController = {
  async list(req, res, next) {
    try {
      const { actorId, targetType, action, from, to, page = 1, limit = 30 } = req.query;
      const filter = { tenantId: req.user.tenantId };
      if (actorId) filter.actorId = actorId;
      if (targetType) filter.targetType = targetType;
      if (action) filter.action = action;
      if (from || to) {
        filter.createdAt = {};
        if (from) filter.createdAt.$gte = new Date(from);
        if (to) filter.createdAt.$lte = new Date(to);
      }

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        AuditLog.find(filter)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(Number(limit))
          .populate('actorId', 'name email')
          .lean(),
        AuditLog.countDocuments(filter),
      ]);
      res.status(200).json({ items, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
      next(err);
    }
  },
};
