import Document from '../../models/Document.js';
import DocumentChunk from '../../models/DocumentChunk.js';
import IngestionJob from '../../models/IngestionJob.js';
import { extractText } from './textExtraction.js';
import { chunkText } from './chunking.js';
import { embeddingProvider } from '../../providers/embeddingProvider.js';
import { downloadDocumentBuffer } from '../storage/documentStorage.js';

/**
 * Runs the full ingestion pipeline for a single document:
 * download → extract → chunk → embed → store.
 *
 * The file is downloaded from S3-compatible storage into a Buffer before
 * extraction so the pipeline never depends on the local filesystem — this
 * makes it safe on ephemeral-filesystem hosts like Render free tier.
 *
 * In production this is invoked by a BullMQ worker so uploads don't block the
 * request thread (see docs/02-system-architecture.md §5.1). This function is
 * the pipeline itself — swap the caller (direct vs. queued) without touching this.
 */
export async function ingestDocument(documentId) {
  const doc = await Document.findById(documentId);
  if (!doc) throw new Error(`Document ${documentId} not found`);

  const job = await IngestionJob.create({ tenantId: doc.tenantId, documentId: doc._id, stage: 'extraction' });

  try {
    doc.status = 'processing';
    await doc.save();

    // ---- download from storage ----
    if (!doc.storageUrl) {
      throw new Error('Document has no storage URL — it may not have been uploaded yet.');
    }
    const fileBuffer = await downloadDocumentBuffer({
      tenantId: String(doc.tenantId),
      storageKey: doc.storageUrl,
    });

    // ---- extraction (OCR runs automatically inside extractText for scanned PDFs) ----
    const { text, pageCount, wasOcrd } = await extractText(fileBuffer, doc.fileType, doc.originalName);
    if (wasOcrd) {
      console.log(`[ingestion] ${doc._id} required OCR — extracted ${text.length} chars.`);
    }
    if (pageCount) {
      doc.pageCount = pageCount;
      await doc.save();
    }

    // ---- chunking ----
    job.stage = 'chunking';
    await job.save();
    const chunks = chunkText(text);
    if (chunks.length === 0) throw new Error('No extractable text found in document.');

    // ---- embedding ----
    job.stage = 'embedding';
    await job.save();
    const embeddings = await embeddingProvider.embedBatch(chunks.map((c) => c.text));

    // ---- indexing (store) ----
    job.stage = 'indexing';
    await job.save();
    await DocumentChunk.deleteMany({ documentId: doc._id }); // clear any prior version's chunks
    await DocumentChunk.insertMany(
      chunks.map((c, i) => ({
        tenantId: doc.tenantId,
        documentId: doc._id,
        department: doc.department,
        securityLevel: doc.securityLevel,
        text: c.text,
        embedding: embeddings[i],
        chunkIndex: c.chunkIndex,
      }))
    );

    doc.status = 'ready';
    doc.processingError = undefined;
    await doc.save();

    job.stage = 'done';
    job.completedAt = new Date();
    await job.save();
  } catch (err) {
    doc.status = 'failed';
    doc.processingError = err.message;
    await doc.save();

    job.stage = 'failed';
    job.lastError = err.message;
    job.attempts += 1;
    await job.save();

    throw err;
  }
}
