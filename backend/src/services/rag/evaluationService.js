import FeedbackEvent from '../../models/FeedbackEvent.js';
import mongoose from 'mongoose';

/**
 * Backs the Admin Evaluation Dashboard (docs/06-pages-and-user-flows.md §5.6).
 * Kept deliberately simple in this scaffold — swap the aggregation queries
 * for a scheduled job + materialized view once volume grows.
 */
export const evaluationService = {
  async recordFeedback({ tenantId, conversationId, messageId, rating, retrievalScoreAtTime }) {
    return FeedbackEvent.create({ tenantId, conversationId, messageId, rating, retrievalScoreAtTime });
  },

  async getReviewQueue(tenantId, { onlyUnreviewed = true } = {}) {
    const filter = { tenantId, rating: 'down' };
    if (onlyUnreviewed) filter.reviewed = false;
    return FeedbackEvent.find(filter).sort({ createdAt: -1 }).limit(50).lean();
  },

  async markReviewed(feedbackEventId, notes) {
    return FeedbackEvent.findByIdAndUpdate(feedbackEventId, { reviewed: true, reviewNotes: notes }, { new: true });
  },

  async getSummaryStats(tenantId) {
    const tenantObjId = new mongoose.Types.ObjectId(tenantId);
    const [agg] = await FeedbackEvent.aggregate([
      { $match: { tenantId: tenantObjId } },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          up: { $sum: { $cond: [{ $eq: ['$rating', 'up'] }, 1, 0] } },
          down: { $sum: { $cond: [{ $eq: ['$rating', 'down'] }, 1, 0] } },
          avgScore: { $avg: '$retrievalScoreAtTime' },
        },
      },
    ]);
    if (!agg) return { total: 0, upRate: 0, avgConfidence: 0, flaggedForReview: 0 };
    const flaggedForReview = await FeedbackEvent.countDocuments({ tenantId, rating: 'down', reviewed: false });
    return {
      total: agg.total,
      upRate: agg.total ? agg.up / agg.total : 0,
      avgConfidence: agg.avgScore ?? 0,
      flaggedForReview,
    };
  },
};
