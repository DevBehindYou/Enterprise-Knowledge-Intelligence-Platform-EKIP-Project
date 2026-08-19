import { Router } from 'express';
import { auditController } from '../controllers/auditController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', auditController.list);

export default router;
