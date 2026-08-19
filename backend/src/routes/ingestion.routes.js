import { Router } from 'express';
import { ingestionController } from '../controllers/ingestionController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/queue', ingestionController.queue);

export default router;
