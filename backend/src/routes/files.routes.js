import { Router } from 'express';
import multer from 'multer';
import { filesController } from '../controllers/filesController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth);

/**
 * File Manager uploads are buffered in memory rather than written to disk,
 * because the bytes are forwarded straight to the storage provider — writing a
 * temp file first would just add a cleanup problem. The 100MB cap bounds that
 * memory use; anything larger should use the presigned-PUT flow
 * (POST /api/files/sign-upload), which never passes through this tier at all.
 *
 * Unlike the knowledge-base document upload (documents.routes.js), the File
 * Manager is a general-purpose asset store — images, PDFs, archives, video —
 * so there is no extension allowlist here. What protects this endpoint is that
 * it is admin-only and that nothing stored through it is ever executed or
 * served from the API's own origin: downloads go out as presigned provider
 * URLs, and the inline-preview route sets Content-Disposition: inline with the
 * provider's own content type.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 25 },
});

// ---- Reads: any authenticated user ----
router.get('/status', filesController.status);
router.get('/', filesController.list);
router.get('/tree', filesController.tree);
router.get('/search', filesController.search);
router.get('/usage', filesController.usage);
router.get('/stat', filesController.stat);
router.get('/signed-url', filesController.signedUrl);
router.get('/raw', filesController.raw);

// ---- Mutations: admin only ----
router.post('/upload', requireRole('admin'), upload.array('files', 25), filesController.upload);
router.post('/sign-upload', requireRole('admin'), filesController.signUpload);
router.post('/folder', requireRole('admin'), filesController.createFolder);
router.patch('/rename', requireRole('admin'), filesController.rename);
router.post('/move', requireRole('admin'), filesController.move);
router.post('/delete', requireRole('admin'), filesController.remove);

export default router;
