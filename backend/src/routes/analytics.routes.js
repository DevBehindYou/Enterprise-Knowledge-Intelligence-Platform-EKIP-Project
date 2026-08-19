import { Router } from 'express';
import { analyticsController } from '../controllers/analyticsController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth);

router.get('/department', requireRole('manager', 'admin'), analyticsController.department);
router.get('/evaluation', requireRole('admin'), analyticsController.evaluation);
router.patch('/evaluation/:feedbackEventId', requireRole('admin'), analyticsController.markEvaluationReviewed);

export default router;
