import path from 'path';
import { Readable } from 'stream';
import {
  getActiveStorage,
  describeStorageError,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  getSignedUrl,
  buildS3Client,
} from './s3Client.js';

/**
 * File Manager operations on top of any S3-compatible bucket.
 *
 * S3 has no real directories: a "folder" is a key prefix ending in "/". Listing
 * with Delimiter:'/' makes the provider return the immediate children only
 * (CommonPrefixes = subfolders, Contents = files), which is what a file browser
 * needs. Creating an empty folder writes a zero-byte marker object at "prefix/"
 * so it survives having no files in it; those markers are filtered out of listings.
 */

const MAX_KEY_LENGTH = 1024;

/**
 * Rejects traversal, absolute paths, backslashes, and control characters.
 * Everything the caller sends is treated as untrusted: a key like
 * "../../other-tenant/secrets.pdf" must never resolve outside the tenant prefix.
 */
export function normalizePrefix(input = '') {
  const raw = String(input ?? '').replace(/\\/g, '/').trim();
  if (!raw || raw === '/') return '';

  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(raw)) {
    const err = new Error('Path contains invalid characters.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const segments = [];
  for (const segment of raw.split('/')) {
    if (!segment || segment === '.') continue;
    if (segment === '..') {
      const err = new Error('Path traversal is not allowed.');
      err.status = 400;
      err.code = 'VALIDATION_ERROR';
      throw err;
    }
    segments.push(segment);
  }

  const normalized = segments.join('/');
  if (normalized.length > MAX_KEY_LENGTH) {
    const err = new Error('Path is too long.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return normalized;
}

/** A single path segment (filename/folder name) — no slashes allowed at all. */
export function normalizeName(input) {
  const name = String(input ?? '').trim();
  if (!name || name === '.' || name === '..') {
    const err = new Error('Please provide a valid name.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  // eslint-disable-next-line no-control-regex
  if (/[/\\\x00-\x1f\x7f]/.test(name)) {
    const err = new Error('Names cannot contain slashes or control characters.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (name.length > 255) {
    const err = new Error('Name is too long (max 255 characters).');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  return name;
}

/**
 * Every tenant's files live under "tenants/<tenantId>/" inside the bucket, so a
 * single shared bucket can never leak across tenants even if a caller crafts a
 * malicious path — the prefix is prepended server-side from the authenticated
 * session, never from the request body.
 */
export function tenantRoot(tenantId) {
  return `tenants/${tenantId}/`;
}

function toKey(tenantId, relativePath) {
  return `${tenantRoot(tenantId)}${normalizePrefix(relativePath)}`;
}

function toRelative(tenantId, key) {
  const root = tenantRoot(tenantId);
  return key.startsWith(root) ? key.slice(root.length) : key;
}

const EXT_KIND = {
  image: ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.avif', '.bmp', '.ico', '.tiff'],
  video: ['.mp4', '.webm', '.mov', '.avi', '.mkv', '.m4v'],
  audio: ['.mp3', '.wav', '.ogg', '.m4a', '.flac', '.aac'],
  pdf: ['.pdf'],
  document: ['.doc', '.docx', '.txt', '.rtf', '.odt', '.md'],
  spreadsheet: ['.xls', '.xlsx', '.csv', '.ods'],
  presentation: ['.ppt', '.pptx', '.odp'],
  archive: ['.zip', '.tar', '.gz', '.rar', '.7z', '.bz2'],
  code: ['.js', '.jsx', '.ts', '.tsx', '.json', '.html', '.css', '.py', '.java', '.xml', '.yml', '.yaml', '.sh'],
};

export function classifyFile(filename) {
  const ext = path.extname(filename).toLowerCase();
  for (const [kind, exts] of Object.entries(EXT_KIND)) {
    if (exts.includes(ext)) return kind;
  }
  return 'other';
}

const MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.pdf': 'application/pdf',
  '.txt': 'text/plain',
  '.md': 'text/markdown',
  '.csv': 'text/csv',
  '.json': 'application/json',
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.zip': 'application/zip',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
};

export function guessMimeType(filename, fallback = 'application/octet-stream') {
  return MIME_BY_EXT[path.extname(filename).toLowerCase()] || fallback;
}

function publicUrlFor(config, key) {
  if (!config.publicBaseUrl) return null;
  return `${config.publicBaseUrl.replace(/\/+$/, '')}/${key.split('/').map(encodeURIComponent).join('/')}`;
}

/* ------------------------------------------------------------------ */
/* Listing                                                             */
/* ------------------------------------------------------------------ */

/**
 * Lists the immediate contents of one folder.
 * @returns {Promise<{path:string, folders:object[], files:object[], truncated:boolean}>}
 */
export async function listFolder({ tenantId, prefix = '', search = '', sortBy = 'name', sortDir = 'asc' }) {
  const relative = normalizePrefix(prefix);
  const { config, client } = await getActiveStorage(tenantId);
  const fullPrefix = relative ? `${tenantRoot(tenantId)}${relative}/` : tenantRoot(tenantId);

  const folders = [];
  const files = [];
  let continuationToken;
  let pages = 0;

  try {
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: fullPrefix,
          Delimiter: '/',
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );

      for (const cp of res.CommonPrefixes || []) {
        const name = cp.Prefix.slice(fullPrefix.length).replace(/\/$/, '');
        if (name) folders.push({ type: 'folder', name, path: toRelative(tenantId, cp.Prefix).replace(/\/$/, '') });
      }

      for (const obj of res.Contents || []) {
        // Skip the zero-byte marker representing the folder itself.
        if (obj.Key === fullPrefix) continue;
        const name = obj.Key.slice(fullPrefix.length);
        if (!name || name.endsWith('/')) continue;
        files.push({
          type: 'file',
          name,
          path: toRelative(tenantId, obj.Key),
          key: obj.Key,
          size: obj.Size ?? 0,
          lastModified: obj.LastModified,
          etag: obj.ETag?.replace(/"/g, ''),
          kind: classifyFile(name),
          mimeType: guessMimeType(name),
          publicUrl: publicUrlFor(config, obj.Key),
        });
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      pages += 1;
    } while (continuationToken && pages < 20); // hard cap so one huge folder can't hang the request
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }

  const term = search.trim().toLowerCase();
  const matches = (item) => !term || item.name.toLowerCase().includes(term);

  const dir = sortDir === 'desc' ? -1 : 1;
  const compare = (a, b) => {
    if (sortBy === 'size') return ((a.size ?? 0) - (b.size ?? 0)) * dir;
    if (sortBy === 'modified') {
      return (new Date(a.lastModified ?? 0) - new Date(b.lastModified ?? 0)) * dir;
    }
    if (sortBy === 'kind') return String(a.kind ?? '').localeCompare(String(b.kind ?? '')) * dir;
    return a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' }) * dir;
  };

  return {
    path: relative,
    folders: folders.filter(matches).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }) * dir),
    files: files.filter(matches).sort(compare),
    truncated: Boolean(continuationToken),
    provider: config.provider,
    bucket: config.bucket,
  };
}

/** Recursive search across the whole tenant prefix (no Delimiter). */
export async function searchAll({ tenantId, query, kind = '', limit = 300 }) {
  const { config, client } = await getActiveStorage(tenantId);
  const term = String(query || '').trim().toLowerCase();
  if (!term && !kind) return { items: [], truncated: false };

  const root = tenantRoot(tenantId);
  const items = [];
  let continuationToken;
  let pages = 0;
  let truncated = false;

  try {
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: root,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );

      for (const obj of res.Contents || []) {
        if (obj.Key.endsWith('/')) continue;
        const relative = toRelative(tenantId, obj.Key);
        const name = relative.split('/').pop();
        const itemKind = classifyFile(name);
        if (term && !relative.toLowerCase().includes(term)) continue;
        if (kind && itemKind !== kind) continue;
        items.push({
          type: 'file',
          name,
          path: relative,
          key: obj.Key,
          folder: relative.split('/').slice(0, -1).join('/'),
          size: obj.Size ?? 0,
          lastModified: obj.LastModified,
          kind: itemKind,
          mimeType: guessMimeType(name),
          publicUrl: publicUrlFor(config, obj.Key),
        });
        if (items.length >= limit) {
          truncated = true;
          break;
        }
      }

      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      pages += 1;
    } while (continuationToken && items.length < limit && pages < 20);
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }

  return { items, truncated: truncated || Boolean(continuationToken) };
}

/** Folder tree for the sidebar — walks CommonPrefixes breadth-first to a depth cap. */
export async function folderTree({ tenantId, maxDepth = 3 }) {
  const { config, client } = await getActiveStorage(tenantId);
  const root = tenantRoot(tenantId);

  async function children(prefix) {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: config.bucket, Prefix: prefix, Delimiter: '/', MaxKeys: 1000 })
    );
    return (res.CommonPrefixes || []).map((cp) => cp.Prefix);
  }

  async function walk(prefix, depth) {
    if (depth > maxDepth) return [];
    const prefixes = await children(prefix);
    return Promise.all(
      prefixes.map(async (p) => ({
        name: p.slice(prefix.length).replace(/\/$/, ''),
        path: toRelative(tenantId, p).replace(/\/$/, ''),
        children: await walk(p, depth + 1),
      }))
    );
  }

  try {
    return { name: 'All files', path: '', children: await walk(root, 1) };
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

/** Aggregate usage: total bytes, object count, and a breakdown by kind. */
export async function usageStats({ tenantId }) {
  const { config, client } = await getActiveStorage(tenantId);
  const root = tenantRoot(tenantId);

  let totalBytes = 0;
  let fileCount = 0;
  const byKind = {};
  let continuationToken;
  let pages = 0;

  try {
    do {
      const res = await client.send(
        new ListObjectsV2Command({
          Bucket: config.bucket,
          Prefix: root,
          MaxKeys: 1000,
          ContinuationToken: continuationToken,
        })
      );
      for (const obj of res.Contents || []) {
        if (obj.Key.endsWith('/')) continue;
        const kind = classifyFile(obj.Key.split('/').pop());
        totalBytes += obj.Size ?? 0;
        fileCount += 1;
        byKind[kind] = byKind[kind] || { count: 0, bytes: 0 };
        byKind[kind].count += 1;
        byKind[kind].bytes += obj.Size ?? 0;
      }
      continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
      pages += 1;
    } while (continuationToken && pages < 50);
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }

  return {
    provider: config.provider,
    bucket: config.bucket,
    totalBytes,
    fileCount,
    byKind,
    partial: Boolean(continuationToken),
  };
}

/* ------------------------------------------------------------------ */
/* Mutations                                                           */
/* ------------------------------------------------------------------ */

export async function createFolder({ tenantId, parentPath = '', name }) {
  // Validate before resolving storage: a malformed path is a 400 regardless of
  // whether a provider happens to be connected, and there's no reason to do a
  // DB lookup for a request that can't succeed.
  const folderName = normalizeName(name);
  const relative = normalizePrefix(parentPath ? `${parentPath}/${folderName}` : folderName);
  const { config, client } = await getActiveStorage(tenantId);
  const key = `${tenantRoot(tenantId)}${relative}/`;

  try {
    await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: key, Body: '', ContentLength: 0 }));
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
  return { type: 'folder', name: folderName, path: relative };
}

export async function uploadFile({ tenantId, folderPath = '', filename, buffer, mimeType }) {
  const safeName = normalizeName(filename);
  const relative = normalizePrefix(folderPath ? `${folderPath}/${safeName}` : safeName);
  const { config, client } = await getActiveStorage(tenantId);
  const key = `${tenantRoot(tenantId)}${relative}`;

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: config.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType || guessMimeType(safeName),
        ContentLength: buffer.length,
      })
    );
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }

  return {
    type: 'file',
    name: safeName,
    path: relative,
    key,
    size: buffer.length,
    kind: classifyFile(safeName),
    mimeType: mimeType || guessMimeType(safeName),
    lastModified: new Date(),
    publicUrl: publicUrlFor(config, key),
  };
}

/** Presigned GET for preview/download without proxying bytes through the API. */
export async function signedUrlFor({ tenantId, filePath, expiresIn = 900, download = false }) {
  const relative = normalizePrefix(filePath);
  const { config, client } = await getActiveStorage(tenantId);
  const key = `${tenantRoot(tenantId)}${relative}`;
  const filename = relative.split('/').pop();

  try {
    await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    const url = await getSignedUrl(
      client,
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
        ...(download
          ? { ResponseContentDisposition: `attachment; filename="${filename.replace(/"/g, '')}"` }
          : {}),
      }),
      { expiresIn: Math.min(Math.max(Number(expiresIn) || 900, 60), 60 * 60 * 24) }
    );
    return { url, expiresIn, path: relative, name: filename };
  } catch (err) {
    const status = err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404 ? 404 : 502;
    const wrapped = new Error(status === 404 ? 'That file no longer exists.' : describeStorageError(err));
    wrapped.status = status;
    wrapped.code = status === 404 ? 'FILE_NOT_FOUND' : 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

/** Presigned PUT so large uploads can go browser → provider directly. */
export async function signedUploadUrl({ tenantId, folderPath = '', filename, expiresIn = 900 }) {
  const safeName = normalizeName(filename);
  const relative = normalizePrefix(folderPath ? `${folderPath}/${safeName}` : safeName);
  const { config, client } = await getActiveStorage(tenantId);
  const key = `${tenantRoot(tenantId)}${relative}`;

  const url = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: config.bucket, Key: key, ContentType: guessMimeType(safeName) }),
    { expiresIn: Math.min(Math.max(Number(expiresIn) || 900, 60), 60 * 60 * 6) }
  );
  return { url, method: 'PUT', path: relative, headers: { 'Content-Type': guessMimeType(safeName) } };
}

/** Streams an object back through the API (used for inline preview). */
export async function readFileStream({ tenantId, filePath }) {
  const relative = normalizePrefix(filePath);
  const { config, client } = await getActiveStorage(tenantId);
  const key = `${tenantRoot(tenantId)}${relative}`;

  try {
    const res = await client.send(new GetObjectCommand({ Bucket: config.bucket, Key: key }));
    const body = res.Body instanceof Readable ? res.Body : Readable.from(res.Body);
    return {
      stream: body,
      contentType: res.ContentType || guessMimeType(relative),
      contentLength: res.ContentLength,
      name: relative.split('/').pop(),
    };
  } catch (err) {
    const status = err?.name === 'NoSuchKey' || err?.$metadata?.httpStatusCode === 404 ? 404 : 502;
    const wrapped = new Error(status === 404 ? 'That file no longer exists.' : describeStorageError(err));
    wrapped.status = status;
    wrapped.code = status === 404 ? 'FILE_NOT_FOUND' : 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

/** Lists every object under a prefix (no delimiter) — used by folder move/copy/delete. */
async function listAllUnder({ client, bucket, prefix }) {
  const keys = [];
  let continuationToken;
  let pages = 0;
  do {
    const res = await client.send(
      new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, MaxKeys: 1000, ContinuationToken: continuationToken })
    );
    for (const obj of res.Contents || []) keys.push(obj.Key);
    continuationToken = res.IsTruncated ? res.NextContinuationToken : undefined;
    pages += 1;
  } while (continuationToken && pages < 50);
  return keys;
}

/**
 * S3 has no rename or move — both are copy-then-delete. For a folder that means
 * doing it for every object underneath, which is why this reports a count back
 * to the UI instead of pretending it was one atomic operation.
 */
async function copyThenDelete({ client, bucket, sourceKeys, mapKey, deleteSource }) {
  let moved = 0;
  for (const sourceKey of sourceKeys) {
    const destinationKey = mapKey(sourceKey);
    if (destinationKey === sourceKey) continue;
    await client.send(
      new CopyObjectCommand({
        Bucket: bucket,
        CopySource: `${bucket}/${sourceKey}`.split('/').map(encodeURIComponent).join('/'),
        Key: destinationKey,
      })
    );
    moved += 1;
  }
  if (deleteSource && sourceKeys.length) {
    // DeleteObjects caps at 1000 keys per call.
    for (let i = 0; i < sourceKeys.length; i += 1000) {
      const batch = sourceKeys.slice(i, i + 1000);
      await client.send(
        new DeleteObjectsCommand({
          Bucket: bucket,
          Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
        })
      );
    }
  }
  return moved;
}

/**
 * Moves or copies a file or folder.
 * @param {{tenantId:string, sourcePath:string, destinationPath:string, isFolder?:boolean, mode?:'move'|'copy'}} params
 */
export async function moveOrCopy({ tenantId, sourcePath, destinationPath, isFolder = false, mode = 'move' }) {
  const root = tenantRoot(tenantId);
  const source = normalizePrefix(sourcePath);
  const destination = normalizePrefix(destinationPath);

  if (!source) {
    const err = new Error('Cannot move the root folder.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  if (source === destination) {
    const err = new Error('Source and destination are the same.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }
  // Moving a folder into itself would recurse forever and destroy data.
  if (isFolder && (destination === source || destination.startsWith(`${source}/`))) {
    const err = new Error('A folder cannot be moved inside itself.');
    err.status = 400;
    err.code = 'VALIDATION_ERROR';
    throw err;
  }

  const { config, client } = await getActiveStorage(tenantId);

  try {
    if (isFolder) {
      const sourcePrefix = `${root}${source}/`;
      const destinationPrefix = `${root}${destination}/`;
      const keys = await listAllUnder({ client, bucket: config.bucket, prefix: sourcePrefix });
      if (!keys.length) {
        // Empty folder with no marker object — just create the destination marker.
        await client.send(new PutObjectCommand({ Bucket: config.bucket, Key: destinationPrefix, Body: '' }));
        return { moved: 0, isFolder: true, path: destination };
      }
      const moved = await copyThenDelete({
        client,
        bucket: config.bucket,
        sourceKeys: keys,
        mapKey: (key) => `${destinationPrefix}${key.slice(sourcePrefix.length)}`,
        deleteSource: mode === 'move',
      });
      return { moved, isFolder: true, path: destination };
    }

    const sourceKey = `${root}${source}`;
    const destinationKey = `${root}${destination}`;
    await copyThenDelete({
      client,
      bucket: config.bucket,
      sourceKeys: [sourceKey],
      mapKey: () => destinationKey,
      deleteSource: mode === 'move',
    });
    return { moved: 1, isFolder: false, path: destination };
  } catch (err) {
    if (err.status) throw err;
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

/** Renames in place — a move whose destination keeps the same parent folder. */
export async function rename({ tenantId, targetPath, newName, isFolder = false }) {
  const safeName = normalizeName(newName);
  const relative = normalizePrefix(targetPath);
  const parent = relative.split('/').slice(0, -1).join('/');
  const destination = parent ? `${parent}/${safeName}` : safeName;
  return moveOrCopy({ tenantId, sourcePath: relative, destinationPath: destination, isFolder, mode: 'move' });
}

/**
 * Deletes files and/or folders. Folders delete every object underneath, so the
 * count is returned for the confirmation toast — the UI shows what it actually removed.
 */
export async function remove({ tenantId, paths = [], folderPaths = [] }) {
  const root = tenantRoot(tenantId);

  // Normalize every path up front so one bad entry rejects the whole batch
  // before anything is deleted — a partial delete is the worst outcome here.
  const keys = new Set();
  for (const p of paths) {
    const relative = normalizePrefix(p);
    if (relative) keys.add(`${root}${relative}`);
  }
  const folders = folderPaths.map(normalizePrefix).filter(Boolean); // '' would be the tenant root

  const { config, client } = await getActiveStorage(tenantId);

  try {
    for (const relative of folders) {
      const under = await listAllUnder({ client, bucket: config.bucket, prefix: `${root}${relative}/` });
      under.forEach((k) => keys.add(k));
      keys.add(`${root}${relative}/`); // the marker object itself
    }

    const list = [...keys];
    if (!list.length) return { deleted: 0 };

    for (let i = 0; i < list.length; i += 1000) {
      const batch = list.slice(i, i + 1000);
      if (batch.length === 1) {
        await client.send(new DeleteObjectCommand({ Bucket: config.bucket, Key: batch[0] }));
      } else {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: config.bucket,
            Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
          })
        );
      }
    }
    return { deleted: list.length };
  } catch (err) {
    const wrapped = new Error(describeStorageError(err));
    wrapped.status = 502;
    wrapped.code = 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

export async function statFile({ tenantId, filePath }) {
  const relative = normalizePrefix(filePath);
  const { config, client } = await getActiveStorage(tenantId);
  const key = `${tenantRoot(tenantId)}${relative}`;
  try {
    const res = await client.send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    const name = relative.split('/').pop();
    return {
      name,
      path: relative,
      key,
      size: res.ContentLength ?? 0,
      mimeType: res.ContentType || guessMimeType(name),
      kind: classifyFile(name),
      lastModified: res.LastModified,
      etag: res.ETag?.replace(/"/g, ''),
      metadata: res.Metadata || {},
      publicUrl: publicUrlFor(config, key),
    };
  } catch (err) {
    const status = err?.name === 'NotFound' || err?.$metadata?.httpStatusCode === 404 ? 404 : 502;
    const wrapped = new Error(status === 404 ? 'That file no longer exists.' : describeStorageError(err));
    wrapped.status = status;
    wrapped.code = status === 404 ? 'FILE_NOT_FOUND' : 'STORAGE_REQUEST_FAILED';
    throw wrapped;
  }
}

/**
 * Verifies a set of credentials against the provider before they're saved as
 * active — a HeadBucket round-trip is the cheapest proof that the endpoint,
 * region, bucket, and key pair all agree with each other.
 */
export async function testConnection(configLike) {
  const client = buildS3Client(configLike);
  try {
    await client.send(new HeadBucketCommand({ Bucket: configLike.bucket }));
    return { ok: true, message: `Connected to "${configLike.bucket}".` };
  } catch (err) {
    return { ok: false, message: describeStorageError(err) };
  }
}
