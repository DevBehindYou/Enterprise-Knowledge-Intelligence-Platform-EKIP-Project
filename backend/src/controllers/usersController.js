import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';
import User from '../models/User.js';
import { writeAudit } from '../middleware/auditWrite.js';

const supabase = createClient(env.supabaseUrl, env.supabaseServiceRoleKey);

export const usersController = {
  async list(req, res, next) {
    try {
      const { department, role, status, page = 1, limit = 20 } = req.query;
      const filter = { tenantId: req.user.tenantId };
      if (department) filter.department = department;
      if (role) filter.role = role;
      if (status) filter.status = status;

      const skip = (Number(page) - 1) * Number(limit);
      const [items, total] = await Promise.all([
        User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).select('-supabaseUserId').lean(),
        User.countDocuments(filter),
      ]);
      res.status(200).json({ items, total, page: Number(page), limit: Number(limit) });
    } catch (err) {
      next(err);
    }
  },

  async invite(req, res, next) {
    try {
      const { email, name, role, department } = req.body;
      const { data, error } = await supabase.auth.admin.inviteUserByEmail(email);
      if (error) {
        return res.status(400).json({ error: { code: 'AUTH_INVITE_FAILED', message: error.message } });
      }
      const user = await User.create({
        tenantId: req.user.tenantId,
        supabaseUserId: data.user.id,
        name,
        email: email.toLowerCase(),
        role: role || 'employee',
        department,
        status: 'invited',
      });
      await writeAudit({ req, action: 'user.invite', targetType: 'user', targetId: user._id, metadata: { role: user.role } });
      res.status(201).json(user);
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const { role, department, status } = req.body;
      const before = await User.findOne({ _id: req.params.id, tenantId: req.user.tenantId }).lean();
      if (!before) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'Not found.' } });

      const update = {};
      if (role !== undefined) update.role = role;
      if (department !== undefined) update.department = department;
      if (status !== undefined) update.status = status;

      const user = await User.findByIdAndUpdate(req.params.id, update, { new: true });
      await writeAudit({
        req,
        action: 'user.role_change',
        targetType: 'user',
        targetId: user._id,
        metadata: { fromRole: before.role, toRole: user.role, fromStatus: before.status, toStatus: user.status },
      });
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      // Soft-delete only — never hard-delete a user (preserves audit log integrity).
      const user = await User.findByIdAndUpdate(req.params.id, { status: 'suspended' }, { new: true });
      await writeAudit({ req, action: 'user.suspend', targetType: 'user', targetId: user._id });
      res.status(200).json(user);
    } catch (err) {
      next(err);
    }
  },
};
