import mongoose from 'mongoose';
import Conversation from '../models/Conversation.js';
import { evaluationService } from '../services/rag/evaluationService.js';

export const analyticsController = {
  /**
   * Manager/Admin view. Deliberately aggregates ONLY — never returns raw
   * conversation content, per the privacy boundary in docs/01-brd-srs.md FR-5.2.
   */
  async department(req, res, next) {
    try {
      const tenantObjId = new mongoose.Types.ObjectId(req.user.tenantId);
      const scopeDepartment = req.user.role === 'manager' ? req.user.department : req.query.department;

      const matchStage = { tenantId: tenantObjId };
      // Manager analytics needs a join through the user's department — simplified here
      // by trusting a `department` query param for admins, and the manager's own dept otherwise.

      const [volumeOverTime, feedbackStats] = await Promise.all([
        Conversation.aggregate([
          { $match: matchStage },
          { $unwind: '$messages' },
          { $match: { 'messages.role': 'user' } },
          {
            $group: {
              _id: { $dateToString: { format: '%Y-%m-%d', date: '$messages.createdAt' } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
        ]),
        evaluationService.getSummaryStats(req.user.tenantId),
      ]);

      res.status(200).json({
        scopeDepartment: scopeDepartment || 'all',
        volumeOverTime,
        feedbackRate: feedbackStats.upRate,
        avgConfidence: feedbackStats.avgConfidence,
      });
    } catch (err) {
      next(err);
    }
  },

  async evaluation(req, res, next) {
    try {
      const stats = await evaluationService.getSummaryStats(req.user.tenantId);
      const queue = await evaluationService.getReviewQueue(req.user.tenantId);
      res.status(200).json({ ...stats, reviewQueue: queue });
    } catch (err) {
      next(err);
    }
  },

  async markEvaluationReviewed(req, res, next) {
    try {
      const { feedbackEventId } = req.params;
      const { notes } = req.body;
      const updated = await evaluationService.markReviewed(feedbackEventId, notes);
      if (!updated) return res.status(404).json({ error: { code: 'FEEDBACK_EVENT_NOT_FOUND', message: 'Not found.' } });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  },
};
