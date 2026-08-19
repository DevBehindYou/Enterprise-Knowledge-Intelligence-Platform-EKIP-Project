import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { documentsController } from '../controllers/documentsController.js';
import { requireAuth } from '../middleware/requireAuth.js';
import { requireRole } from '../middleware/requireRole.js';

const router = Router();
router.use(requireAuth);

const ALLOWED_EXTENSIONS = new Set(['.pdf', '.docx', '.txt', '.csv', '.pptx', '.md']);
const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/vnd.ms-excel', // some browsers send this for .csv
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
]);

// memoryStorage: the buffer lives in req.file.buffer and is uploaded directly
// to S3-compatible storage in documentsController.upload. No local file is ever
// written, which makes the API stateless and safe for ephemeral-filesystem hosts
// like Render's free tier.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      const err = new Error(`Unsupported file type: ${ext || file.mimetype}`);
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      return cb(err);
    }
    cb(null, true);
  },
});

router.get('/', documentsController.list);
router.get('/search', documentsController.search);
router.get('/:id', documentsController.getOne);
router.get('/:id/file', documentsController.file);
router.get('/:id/status', documentsController.status);
router.post('/:id/summarize', documentsController.summarize);

// Admin-only mutations
router.post('/', requireRole('admin'), upload.single('file'), documentsController.upload);
router.post('/:id/reprocess', requireRole('admin'), documentsController.reprocess);
router.delete('/:id', requireRole('admin'), documentsController.remove);

export default router;

