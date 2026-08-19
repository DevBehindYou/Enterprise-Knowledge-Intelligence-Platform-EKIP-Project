import { Router } from 'express';
import { storageConfigController } from '../controllers/storageConfigController.js';
import { aiProviderController } from '../controllers/aiProviderController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth);

/**
 * Settings → Storage Integration and AI Integration.
 *
 * Both are admin-only in full: these endpoints hold third-party credentials,
 * and even the read shape (which provider, which bucket, which model) is
 * infrastructure detail an employee has no reason to see. The one exception is
 * GET /api/files/status, which tells any user whether storage is connected
 * without revealing credentials — that lives on the files router.
 */
router.use(requireRole('admin'));

// ---- Storage ----
router.get('/storage/providers', storageConfigController.providers);
router.get('/storage', storageConfigController.list);
router.post('/storage', storageConfigController.create);
router.post('/storage/test', storageConfigController.test); // unsaved form values
router.post('/storage/:id/test', storageConfigController.test); // saved config
router.post('/storage/:id/activate', storageConfigController.activate);
router.patch('/storage/:id', storageConfigController.update);
router.delete('/storage/:id', storageConfigController.remove);

// ---- AI ----
router.get('/ai/providers', aiProviderController.providers);
router.get('/ai', aiProviderController.list);
router.post('/ai', aiProviderController.create);
router.post('/ai/test', aiProviderController.test);
router.post('/ai/:id/test', aiProviderController.test);
router.post('/ai/:id/default', aiProviderController.setDefault);
router.patch('/ai/:id', aiProviderController.update);
router.delete('/ai/:id', aiProviderController.remove);

export default router;
