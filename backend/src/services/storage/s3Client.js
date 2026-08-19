import {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import StorageConfig from '../../models/StorageConfig.js';
import { decryptSecret } from '../../utils/secretVault.js';

/**
 * Every supported provider (see storageProviders.js) speaks the S3 API, so one
 * client factory serves all of them — the differences are endpoint,
 * forcePathStyle, and region, all resolved at save time onto the config doc.
 *
 * Clients are cached per config document + updatedAt, so editing credentials in
 * Settings invalidates the cached client instead of silently reusing stale ones.
 */
const clientCache = new Map();

function cacheKey(config) {
  return `${config._id}:${new Date(config.updatedAt).getTime()}`;
}

export function buildS3Client(config) {
  const key = cacheKey(config);
  const cached = clientCache.get(key);
  if (cached) return cached;

  const client = new S3Client({
    region: config.region || 'us-east-1',
    ...(config.endpoint ? { endpoint: config.endpoint } : {}),
    forcePathStyle: Boolean(config.forcePathStyle),
    credentials: {
      accessKeyId: decryptSecret(config.accessKeyId),
      secretAccessKey: decryptSecret(config.secretAccessKey),
    },
  });

  clientCache.clear(); // small map; simplest correct invalidation
  clientCache.set(key, client);
  return client;
}

export class StorageNotConfiguredError extends Error {
  constructor() {
    super('No storage provider is connected. An administrator can set one up in Settings → Storage Integration.');
    this.status = 409;
    this.code = 'STORAGE_NOT_CONFIGURED';
  }
}

/** Resolves the tenant's active storage config, or throws a 409 the UI can act on. */
export async function getActiveStorage(tenantId) {
  const config = await StorageConfig.findOne({ tenantId, isActive: true });
  if (!config) throw new StorageNotConfiguredError();
  return { config, client: buildS3Client(config) };
}

/**
 * Normalizes provider errors into messages worth showing a user. The raw SDK
 * error names are accurate but unreadable ("NoSuchBucket", "SignatureDoesNotMatch").
 */
export function describeStorageError(err) {
  const name = err?.name || err?.Code || '';
  const map = {
    NoSuchBucket: 'That bucket does not exist on this provider.',
    NotFound: 'That bucket or object was not found.',
    InvalidAccessKeyId: 'The access key ID was rejected by the provider.',
    SignatureDoesNotMatch: 'The secret access key does not match the access key ID.',
    AccessDenied: 'These credentials are valid but lack permission for this bucket.',
    Forbidden: 'These credentials are valid but lack permission for this bucket.',
    PermanentRedirect: 'Wrong region for this bucket — check the region setting.',
    AuthorizationHeaderMalformed: 'Wrong region for this bucket — check the region setting.',
    CredentialsProviderError: 'Credentials are missing or unreadable.',
    NetworkingError: 'Could not reach the storage endpoint.',
    TimeoutError: 'The storage endpoint did not respond in time.',
    ENOTFOUND: 'The storage endpoint hostname could not be resolved.',
  };
  return map[name] || err?.message || 'The storage provider rejected the request.';
}

export {
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  CopyObjectCommand,
  HeadObjectCommand,
  HeadBucketCommand,
  getSignedUrl,
};
