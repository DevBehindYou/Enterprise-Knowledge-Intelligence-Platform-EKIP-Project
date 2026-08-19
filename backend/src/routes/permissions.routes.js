import { Router } from 'express';
import { permissionsController } from '../controllers/permissionsController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

// Mounted at /api/documents in app.js — full paths are /api/documents/:id/permissions[...]
const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/:id/permissions', permissionsController.list);
router.post('/:id/permissions', permissionsController.create);
router.delete('/:id/permissions/:permissionId', permissionsController.remove);

export default router;
