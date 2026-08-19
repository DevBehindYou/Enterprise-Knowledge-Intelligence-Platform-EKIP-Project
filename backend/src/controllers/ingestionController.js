import { getQueueSnapshot } from '../queues/ingestionQueue.js';
import IngestionJob from '../models/IngestionJob.js';
import Document from '../models/Document.js';

export const ingestionController = {
  async queue(req, res, next) {
    try {
      const snapshot = await getQueueSnapshot();

      // Enrich with document names + current stage from Mongo (BullMQ only knows queue state).
      const recentJobs = await IngestionJob.find({ tenantId: req.user.tenantId })
        .sort({ createdAt: -1 })
        .limit(20)
        .lean();
      const documentIds = [...new Set(recentJobs.map((j) => String(j.documentId)))];
      const documents = await Document.find({ _id: { $in: documentIds } }).select('originalName').lean();
      const nameById = Object.fromEntries(documents.map((d) => [String(d._id), d.originalName]));

      res.status(200).json({
        counts: snapshot.counts,
        recentJobs: recentJobs.map((j) => ({
          ...j,
          documentName: nameById[String(j.documentId)] || 'Unknown document',
        })),
      });
    } catch (err) {
      next(err);
    }
  },
};
