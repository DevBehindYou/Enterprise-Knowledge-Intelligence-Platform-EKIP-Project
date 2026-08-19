import { Router } from 'express';
import { usersController } from '../controllers/usersController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth, requireRole('admin'));

router.get('/', usersController.list);
router.post('/invite', usersController.invite);
router.patch('/:id', usersController.update);
router.delete('/:id', usersController.remove);

export default router;
