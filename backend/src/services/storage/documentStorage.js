import os from 'os';
import path from 'path';
import fs from 'fs/promises';
import { Readable } from 'stream';
import {
  getActiveStorage,
  describeStorageError,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from './s3Client.js';

/**
 * Document-specific S3 operations used by the document upload and ingestion pipeline.
 * These are distinct from the general File Manager (fileManagerService.js) which
 * serves the UI-facing /api/files routes.
 *
 * Key layout: "documents/<tenantId>/<documentId>/<originalFilename>"
 */

export async function uploadDocumentToStorage({ tenantId, documentId, filename, buffer, mimeType }) {
  const key = `documents/${tenantId}/${documentId}/${filename}`;
  const { config, client } = await getActiveStorage(tenantId);

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
        ContentLength: buffer.length,
      })
    );
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }

  return key;
}

export async function downloadDocumentBuffer({ tenantId, storageKey }) {
  const { config, client } = await getActiveStorage(tenantId);

  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: storageKey }));
    const body = res.Body instanceof Readable ? res.Body : Readable.from(res.Body);
    const chunks = [];
    for await (const chunk of body) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch (err) {
    if (err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404) {
      const notFound = new Error('Document file not found in storage. It may have been deleted externally.');
      notFound.status = 404;
      notFound.code = 'FILE_NOT_FOUND';
      throw notFound;
    }
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

export async function deleteDocumentFromStorage({ tenantId, storageKey }) {
  if (!storageKey) return;
  try {
    const { config, client } = await getActiveStorage(tenantId);
    await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: storageKey }));
  } catch {
    // Best-effort; a missing S3 object must not block a DB delete.
  }
}

export async function bufferToTempFile({ buffer, filename }) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ekip-doc-'));
  const tmpPath = path.join(tmpDir, filename);
  await fs.writeFile(tmpPath, buffer);

  const cleanup = async () => {
    await fs.rm(tmpDir, { recursive: true, force: true }).catch(() => {});
  };

  return { tmpPath, cleanup };
}
