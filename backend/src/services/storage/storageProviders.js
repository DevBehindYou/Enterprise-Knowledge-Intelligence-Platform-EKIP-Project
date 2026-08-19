/**
 * Catalog of supported storage providers (Settings → Storage Integration).
 *
 * Every provider here speaks the S3 API (natively or via a compatibility
 * layer), so a single AWS-SDK S3 client covers all of them — the catalog's
 * job is to describe, per provider, which credentials/parameters the user
 * must supply and how to derive the S3 endpoint from them.
 *
 * `fields` drive the dynamic form in the frontend: { key, label, placeholder,
 * required, secret, help }. `accessKeyId`/`secretAccessKey`/`bucket`/`region`
 * are stored on the config document itself; any other field lands in `params`.
 */
export const STORAGE_PROVIDERS = [
  {
    id: 'amazon-s3',
    label: 'Amazon S3',
    docsUrl: 'https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html',
    help: 'Create an IAM user with s3:* permissions scoped to your bucket, then generate an access key pair.',
    forcePathStyle: false,
    fields: [
      { key: 'accessKeyId', label: 'Access Key ID', placeholder: 'AKIA…', required: true, secret: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: '', required: true, secret: true },
      { key: 'region', label: 'Region', placeholder: 'us-east-1', required: true },
      { key: 'bucket', label: 'Bucket name', placeholder: 'my-company-assets', required: true },
    ],
    buildEndpoint: () => '', // native AWS — SDK derives the endpoint from the region
  },
  {
    id: 'supabase',
    label: 'Supabase Storage',
    docsUrl: 'https://supabase.com/docs/guides/storage/s3/authentication',
    help: 'In your Supabase project: Storage → S3 Connection. Enable the S3 protocol and create an access key pair. Use the project reference from your project URL (https://<project-ref>.supabase.co).',
    forcePathStyle: true,
    fields: [
      { key: 'projectRef', label: 'Project reference', placeholder: 'abcdefghijklmnop', required: true, help: 'The subdomain of your project URL.' },
      { key: 'accessKeyId', label: 'S3 Access Key ID', placeholder: '', required: true, secret: true },
      { key: 'secretAccessKey', label: 'S3 Secret Access Key', placeholder: '', required: true, secret: true },
      { key: 'region', label: 'Region', placeholder: 'us-east-1', required: true, help: 'Shown on the same S3 Connection page.' },
      { key: 'bucket', label: 'Bucket name', placeholder: 'assets', required: true },
    ],
    buildEndpoint: (v) => `https://${v.projectRef}.storage.supabase.co/storage/v1/s3`,
  },
  {
    id: 'google-cloud-storage',
    label: 'Google Cloud Storage',
    docsUrl: 'https://cloud.google.com/storage/docs/authentication/hmackeys',
    help: 'GCS interoperability mode: Cloud Storage → Settings → Interoperability → create an HMAC key for a service account with Storage Object Admin on the bucket.',
    forcePathStyle: false,
    fields: [
      { key: 'accessKeyId', label: 'HMAC Access Key', placeholder: 'GOOG1E…', required: true, secret: true },
      { key: 'secretAccessKey', label: 'HMAC Secret', placeholder: '', required: true, secret: true },
      { key: 'bucket', label: 'Bucket name', placeholder: 'my-gcs-bucket', required: true },
    ],
    buildEndpoint: () => 'https://storage.googleapis.com',
    defaultRegion: 'auto',
  },
  {
    id: 'cloudflare-r2',
    label: 'Cloudflare R2',
    docsUrl: 'https://developers.cloudflare.com/r2/api/s3/tokens/',
    help: 'R2 → Manage R2 API Tokens → create a token with Object Read & Write. The account ID is on your R2 overview page.',
    forcePathStyle: true,
    fields: [
      { key: 'accountId', label: 'Account ID', placeholder: '023e105f4ecef8ad9ca31a8372d0c353', required: true },
      { key: 'accessKeyId', label: 'Access Key ID', placeholder: '', required: true, secret: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: '', required: true, secret: true },
      { key: 'bucket', label: 'Bucket name', placeholder: 'assets', required: true },
    ],
    buildEndpoint: (v) => `https://${v.accountId}.r2.cloudflarestorage.com`,
    defaultRegion: 'auto',
  },
  {
    id: 'digitalocean-spaces',
    label: 'DigitalOcean Spaces',
    docsUrl: 'https://docs.digitalocean.com/products/spaces/how-to/manage-access/',
    help: 'API → Spaces Keys → Generate New Key. The region is in your Space URL (e.g. nyc3).',
    forcePathStyle: false,
    fields: [
      { key: 'region', label: 'Region', placeholder: 'nyc3', required: true },
      { key: 'accessKeyId', label: 'Spaces access key', placeholder: 'DO…', required: true, secret: true },
      { key: 'secretAccessKey', label: 'Spaces secret key', placeholder: '', required: true, secret: true },
      { key: 'bucket', label: 'Space name', placeholder: 'my-space', required: true },
    ],
    buildEndpoint: (v) => `https://${v.region}.digitaloceanspaces.com`,
  },
  {
    id: 'backblaze-b2',
    label: 'Backblaze B2',
    docsUrl: 'https://www.backblaze.com/docs/cloud-storage-s3-compatible-api',
    help: 'App Keys → Add a New Application Key scoped to your bucket. The region is in your bucket\'s S3 endpoint (e.g. us-west-004).',
    forcePathStyle: false,
    fields: [
      { key: 'region', label: 'Region', placeholder: 'us-west-004', required: true },
      { key: 'accessKeyId', label: 'keyID', placeholder: '', required: true, secret: true },
      { key: 'secretAccessKey', label: 'applicationKey', placeholder: '', required: true, secret: true },
      { key: 'bucket', label: 'Bucket name', placeholder: 'my-b2-bucket', required: true },
    ],
    buildEndpoint: (v) => `https://s3.${v.region}.backblazeb2.com`,
  },
  {
    id: 'wasabi',
    label: 'Wasabi',
    docsUrl: 'https://docs.wasabi.com/docs/creating-a-user-account-and-access-key',
    help: 'Access Keys → Create New Access Key.',
    forcePathStyle: false,
    fields: [
      { key: 'region', label: 'Region', placeholder: 'us-east-1', required: true },
      { key: 'accessKeyId', label: 'Access Key', placeholder: '', required: true, secret: true },
      { key: 'secretAccessKey', label: 'Secret Key', placeholder: '', required: true, secret: true },
      { key: 'bucket', label: 'Bucket name', placeholder: 'my-wasabi-bucket', required: true },
    ],
    buildEndpoint: (v) => `https://s3.${v.region}.wasabisys.com`,
  },
  {
    id: 'minio',
    label: 'MinIO (self-hosted)',
    docsUrl: 'https://min.io/docs/minio/linux/administration/identity-access-management/minio-user-management.html',
    help: 'Point at your MinIO server URL and use a user or service-account key pair.',
    forcePathStyle: true,
    fields: [
      { key: 'endpoint', label: 'Server URL', placeholder: 'https://minio.internal.example.com:9000', required: true },
      { key: 'accessKeyId', label: 'Access Key', placeholder: '', required: true, secret: true },
      { key: 'secretAccessKey', label: 'Secret Key', placeholder: '', required: true, secret: true },
      { key: 'region', label: 'Region', placeholder: 'us-east-1', required: false },
      { key: 'bucket', label: 'Bucket name', placeholder: 'assets', required: true },
    ],
    buildEndpoint: (v) => v.endpoint,
  },
  {
    id: 's3-compatible',
    label: 'Other S3-compatible',
    docsUrl: '',
    help: 'Any service exposing the S3 API (Scaleway, OVH, Hetzner, Storj, …). Enter the endpoint from your provider\'s docs.',
    forcePathStyle: true,
    fields: [
      { key: 'endpoint', label: 'S3 endpoint URL', placeholder: 'https://s3.example.com', required: true },
      { key: 'accessKeyId', label: 'Access Key ID', placeholder: '', required: true, secret: true },
      { key: 'secretAccessKey', label: 'Secret Access Key', placeholder: '', required: true, secret: true },
      { key: 'region', label: 'Region', placeholder: 'us-east-1', required: false },
      { key: 'bucket', label: 'Bucket name', placeholder: '', required: true },
    ],
    buildEndpoint: (v) => v.endpoint,
  },
];

export function getStorageProvider(id) {
  return STORAGE_PROVIDERS.find((p) => p.id === id) || null;
}

/** Shape safe to send to the frontend (no functions). */
export function storageProviderCatalog() {
  return STORAGE_PROVIDERS.map(({ buildEndpoint, ...rest }) => rest);
}

/**
 * Validates user input against the provider's field spec and resolves the
 * final connection settings. Returns { error } or { value }.
 */
export function resolveStorageInput(providerId, input) {
  const provider = getStorageProvider(providerId);
  if (!provider) return { error: `Unknown storage provider "${providerId}".` };

  for (const field of provider.fields) {
    if (field.required && !String(input[field.key] ?? '').trim()) {
      return { error: `"${field.label}" is required for ${provider.label}.` };
    }
  }

  const values = {};
  for (const field of provider.fields) {
    const raw = input[field.key];
    if (raw !== undefined && raw !== null) values[field.key] = String(raw).trim();
  }

  let endpoint = '';
  try {
    endpoint = provider.buildEndpoint(values) || '';
  } catch {
    return { error: 'Could not derive the storage endpoint from the provided values.' };
  }
  if (endpoint && !/^https?:\/\//.test(endpoint)) {
    return { error: 'Endpoint must be an http(s) URL.' };
  }

  const { accessKeyId, secretAccessKey, bucket, region, ...params } = values;
  return {
    value: {
      provider: provider.id,
      bucket,
      region: region || provider.defaultRegion || 'us-east-1',
      endpoint,
      forcePathStyle: provider.forcePathStyle,
      params,
      accessKeyId,
      secretAccessKey,
    },
  };
}
