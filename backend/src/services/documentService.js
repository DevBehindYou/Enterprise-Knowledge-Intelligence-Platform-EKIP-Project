import Document from '../models/Document.js';
import DocumentChunk from '../models/DocumentChunk.js';
import IngestionJob from '../models/IngestionJob.js';
import { permissionService } from './permissionService.js';
import { enqueueIngestion } from '../queues/ingestionQueue.js';
import { deleteDocumentFromStorage } from './storage/documentStorage.js';

export const documentService = {
  async create({ tenantId, ownerId, originalName, filename, fileType, department, securityLevel, allowedRoles, tags, storageUrl, sizeBytes }) {
    const doc = await Document.create({
      tenantId,
      ownerId,
      originalName,
      filename,
      fileType,
      department,
      securityLevel,
      allowedRoles,
      tags,
      storageUrl,
      sizeBytes,
      status: 'queued',
    });

    // Hands off to the ingestion worker process (backend/worker.js) via Redis —
    // this request returns immediately regardless of how long extraction/embedding takes.
    await enqueueIngestion(doc._id);

    return doc;
  },

  /** Lists documents visible to a user, honoring their role/department scope. */
  async listForUser(user, { department, securityLevel, status, tag, page = 1, limit = 20 } = {}) {
    const filter = permissionService.buildVisibilityFilter(user);
    if (department) filter.department = department;
    if (securityLevel) filter.securityLevel = securityLevel;
    if (status) filter.status = status;
    if (tag) filter.tags = tag;

    const skip = (page - 1) * limit;
    const [items, total] = await Promise.all([
      Document.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      Document.countDocuments(filter),
    ]);
    return { items, total, page, limit };
  },

  /** Returns a document only if the requesting user is permitted to see it — else null (never leaks existence). */
  async getForUser(user, documentId) {
    const level = await permissionService.resolveAccessLevel(user, documentId);
    if (level === 'none') return null;
    const doc = await Document.findOne({ _id: documentId, tenantId: user.tenantId }).lean();
    return doc ? { ...doc, accessLevel: level } : null;
  },

  async reprocess(documentId) {
    await Document.findByIdAndUpdate(documentId, { status: 'queued', processingError: null });
    return enqueueIngestion(documentId);
  },

  async remove(tenantId, documentId) {
    // Fetch the document first so we have the storageUrl before deleting the DB record.
    const doc = await Document.findOne({ _id: documentId, tenantId }).lean();

    await DocumentChunk.deleteMany({ tenantId, documentId });
    await IngestionJob.deleteMany({ tenantId, documentId });
    await Document.deleteOne({ _id: documentId, tenantId });

    // Remove the file from S3 storage. Best-effort: a missing/already-deleted
    // object in the bucket must not prevent the DB record from being removed.
    if (doc?.storageUrl) {
      await deleteDocumentFromStorage({ tenantId: String(tenantId), storageKey: doc.storageUrl });
    }
  },

  async getIngestionStatus(documentId) {
    const doc = await Document.findById(documentId).select('status processingError').lean();
    return doc;
  },
};
