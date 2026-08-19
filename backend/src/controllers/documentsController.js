import path from 'path';
import { documentService } from '../services/documentService.js';
import { retrieve } from '../services/rag/retrievalService.js';
import Document from '../models/Document.js';
import { writeAudit } from '../middleware/auditWrite.js';
import { llmProvider } from '../providers/llmProvider.js';
import { uploadDocumentToStorage, downloadDocumentBuffer } from '../services/storage/documentStorage.js';
import { getActiveStorage, GetObjectCommand, getSignedUrl } from '../services/storage/s3Client.js';

const MIME_BY_TYPE = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

const EXT_TO_TYPE = { '.pdf': 'pdf', '.docx': 'docx', '.txt': 'txt', '.md': 'md', '.csv': 'csv', '.pptx': 'pptx' };

export const documentsController = {
  async list(req, res, next) {
    try {
      const { department, securityLevel, status, tag, page, limit } = req.query;
      const result = await documentService.listForUser(req.user, { department, securityLevel, status, tag, page: Number(page) || 1, limit: Number(limit) || 20 });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async search(req, res, next) {
    try {
      const { q } = req.query;
      if (!q?.trim()) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'q is required.' } });

      const chunks = await retrieve(q, req.user, { topK: 15 });
      const documentIds = [...new Set(chunks.map((c) => String(c.documentId)))];
      const documents = await Document.find({ _id: { $in: documentIds } }).lean();
      const docById = Object.fromEntries(documents.map((d) => [String(d._id), d]));

      const grouped = documentIds.map((id) => ({
        document: docById[id],
        matches: chunks.filter((c) => String(c.documentId) === id).map((c) => ({ text: c.text, page: c.page, score: c.score })),
      }));
      res.status(200).json({ results: grouped });
    } catch (err) {
      next(err);
    }
  },

  async getOne(req, res, next) {
    try {
      const doc = await documentService.getForUser(req.user, req.params.id);
      if (!doc) return res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Not found.' } });
      await writeAudit({ req, action: 'document.access', targetType: 'document', targetId: doc._id, metadata: { via: 'direct_open' } });
      res.status(200).json(doc);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Serves the original uploaded file.
   *
   * storageUrl is now an S3 key (e.g. "documents/<tenantId>/<docId>/<filename>").
   * We issue a short-lived presigned GET URL and redirect the browser to it —
   * this avoids proxying potentially large files through the API server while
   * still enforcing permission checks on every request. The presigned URL expires
   * in 5 minutes, which is short enough to prevent indefinite sharing of links.
   */
  async file(req, res, next) {
    try {
      const doc = await documentService.getForUser(req.user, req.params.id);
      if (!doc) return res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Not found.' } });
      if (doc.accessLevel !== 'cite') {
        return res.status(403).json({ error: { code: 'AUTH_FORBIDDEN', message: 'You cannot download this document.' } });
      }
      if (!doc.storageUrl) {
        return res.status(404).json({ error: { code: 'FILE_NOT_FOUND', message: 'The original file is missing from storage.' } });
      }

      await writeAudit({ req, action: 'document.download', targetType: 'document', targetId: doc._id });

      const { config, client } = await getActiveStorage(req.user.tenantId);
      const url = await getSignedUrl(
        client,
        new GetObjectCommand({
          Bucket: config.bucket,
          Key: doc.storageUrl,
          ResponseContentType: MIME_BY_TYPE[doc.fileType] || 'application/octet-stream',
          ResponseContentDisposition: `attachment; filename="${encodeURIComponent(doc.originalName)}"`,
        }),
        { expiresIn: 300 } // 5 minutes
      );
      res.redirect(url);
    } catch (err) {
      next(err);
    }
  },

  /**
   * Uploads a document to the configured S3-compatible storage provider.
   * multer is configured with memoryStorage() so the buffer arrives in
   * req.file.buffer — no temp file is written to disk at any point.
   */
  async upload(req, res, next) {
    try {
      if (!req.file) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'file is required.' } });
      const ext = path.extname(req.file.originalname).toLowerCase();
      const fileType = EXT_TO_TYPE[ext];
      if (!fileType) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: `Unsupported file type ${ext}` } });

      const { department, securityLevel, tags } = req.body;
      const allowedRoles = [].concat(req.body.allowedRoles || []);

      // Create the DB record first to get the documentId for the S3 key.
      const doc = await documentService.create({
        tenantId: req.user.tenantId,
        ownerId: req.user.id,
        originalName: req.file.originalname,
        filename: req.file.originalname,
        fileType,
        department: department || req.user.department,
        securityLevel: securityLevel || 'internal',
        allowedRoles,
        tags: [].concat(tags || []),
        storageUrl: null, // will be set after S3 upload
        sizeBytes: req.file.size,
      });

      // Upload the buffer to S3; store the key back on the document.
      const storageKey = await uploadDocumentToStorage({
        tenantId: req.user.tenantId,
        documentId: String(doc._id),
        filename: req.file.originalname,
        buffer: req.file.buffer,
        mimeType: req.file.mimetype,
      });
      await Document.findByIdAndUpdate(doc._id, { storageUrl: storageKey });

      await writeAudit({ req, action: 'document.upload', targetType: 'document', targetId: doc._id, metadata: { securityLevel: doc.securityLevel } });
      res.status(202).json({ documentId: doc._id, status: doc.status });
    } catch (err) {
      next(err);
    }
  },

  async status(req, res, next) {
    try {
      const status = await documentService.getIngestionStatus(req.params.id);
      if (!status) return res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Not found.' } });
      res.status(200).json(status);
    } catch (err) {
      next(err);
    }
  },

  async reprocess(req, res, next) {
    try {
      await documentService.reprocess(req.params.id);
      await writeAudit({ req, action: 'document.reprocess', targetType: 'document', targetId: req.params.id });
      res.status(202).json({ status: 'queued' });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      await documentService.remove(req.user.tenantId, req.params.id);
      await writeAudit({ req, action: 'document.delete', targetType: 'document', targetId: req.params.id });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },

  async summarize(req, res, next) {
    try {
      const doc = await documentService.getForUser(req.user, req.params.id);
      if (!doc) return res.status(404).json({ error: { code: 'DOCUMENT_NOT_FOUND', message: 'Not found.' } });

      const chunks = await retrieve('summary of key points, purpose, and risk', req.user, { topK: 10 });
      const relevant = chunks.filter((c) => String(c.documentId) === String(doc._id));
      const context = relevant.map((c) => c.text).join('\n\n');

      const { text } = await llmProvider.generate({
        systemPrompt:
          'Summarize the given document context as JSON with keys "purpose" (string), "keyPoints" (array of short strings), and "riskFlag" (one of "low","medium","high"). Output ONLY valid JSON.',
        context,
        question: 'Summarize this document.',
        tenantId: req.user.tenantId,
      });

      let parsed;
      try {
        parsed = JSON.parse(text);
      } catch {
        parsed = { purpose: text, keyPoints: [], riskFlag: 'medium' };
      }
      res.status(200).json(parsed);
    } catch (err) {
      next(err);
    }
  },
};

