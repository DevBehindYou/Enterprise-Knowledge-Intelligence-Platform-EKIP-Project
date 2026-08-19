import { describe, it, expect } from 'vitest';
import {
  STORAGE_PROVIDERS,
  getStorageProvider,
  storageProviderCatalog,
  resolveStorageInput,
} from '../../src/services/storage/storageProviders.js';

const creds = { accessKeyId: 'AKIAEXAMPLE', secretAccessKey: 'shhh', bucket: 'assets' };

describe('storage provider catalog', () => {
  it('exposes every provider the Settings UI offers', () => {
    const ids = STORAGE_PROVIDERS.map((p) => p.id);
    expect(ids).toContain('amazon-s3');
    expect(ids).toContain('supabase');
    expect(ids).toContain('google-cloud-storage');
    expect(ids).toContain('cloudflare-r2');
    expect(ids).toContain('minio');
    expect(ids).toContain('s3-compatible');
  });

  it('gives every provider a label and at least the two credential fields', () => {
    for (const provider of STORAGE_PROVIDERS) {
      expect(provider.label).toBeTruthy();
      const keys = provider.fields.map((f) => f.key);
      expect(keys).toContain('accessKeyId');
      expect(keys).toContain('secretAccessKey');
      expect(keys).toContain('bucket');
    }
  });

  it('marks every credential field as secret so the UI renders a password input', () => {
    for (const provider of STORAGE_PROVIDERS) {
      for (const key of ['accessKeyId', 'secretAccessKey']) {
        expect(provider.fields.find((f) => f.key === key)?.secret).toBe(true);
      }
    }
  });

  it('strips functions from the catalog sent to the frontend', () => {
    // buildEndpoint isn't JSON-serializable and must not leak into the response.
    for (const provider of storageProviderCatalog()) {
      expect(provider.buildEndpoint).toBeUndefined();
      expect(provider.id).toBeTruthy();
    }
  });

  it('returns null for an unknown provider id', () => {
    expect(getStorageProvider('dropbox')).toBeNull();
  });
});

describe('resolveStorageInput', () => {
  it('leaves the endpoint empty for native AWS S3 so the SDK derives it from the region', () => {
    const { value, error } = resolveStorageInput('amazon-s3', { ...creds, region: 'eu-west-2' });
    expect(error).toBeUndefined();
    expect(value.endpoint).toBe('');
    expect(value.region).toBe('eu-west-2');
    expect(value.forcePathStyle).toBe(false);
  });

  it('builds the Supabase S3 endpoint from the project reference', () => {
    const { value, error } = resolveStorageInput('supabase', {
      ...creds,
      projectRef: 'crzrzmxqsamzhkwtsfjt',
      region: 'us-east-1',
    });
    expect(error).toBeUndefined();
    expect(value.endpoint).toBe('https://crzrzmxqsamzhkwtsfjt.storage.supabase.co/storage/v1/s3');
    expect(value.forcePathStyle).toBe(true);
    // projectRef is not a credential or a top-level column — it belongs in params.
    expect(value.params.projectRef).toBe('crzrzmxqsamzhkwtsfjt');
  });

  it('builds the Cloudflare R2 endpoint from the account id and defaults region to auto', () => {
    const { value } = resolveStorageInput('cloudflare-r2', { ...creds, accountId: 'abc123' });
    expect(value.endpoint).toBe('https://abc123.r2.cloudflarestorage.com');
    expect(value.region).toBe('auto');
  });

  it('uses the GCS interoperability endpoint', () => {
    const { value } = resolveStorageInput('google-cloud-storage', creds);
    expect(value.endpoint).toBe('https://storage.googleapis.com');
  });

  it('builds region-scoped endpoints for DigitalOcean, Backblaze, and Wasabi', () => {
    expect(resolveStorageInput('digitalocean-spaces', { ...creds, region: 'nyc3' }).value.endpoint).toBe(
      'https://nyc3.digitaloceanspaces.com'
    );
    expect(resolveStorageInput('backblaze-b2', { ...creds, region: 'us-west-004' }).value.endpoint).toBe(
      'https://s3.us-west-004.backblazeb2.com'
    );
    expect(resolveStorageInput('wasabi', { ...creds, region: 'us-east-2' }).value.endpoint).toBe(
      'https://s3.us-east-2.wasabisys.com'
    );
  });

  it('uses the operator-supplied endpoint verbatim for MinIO', () => {
    const { value } = resolveStorageInput('minio', {
      ...creds,
      endpoint: 'https://minio.internal:9000',
    });
    expect(value.endpoint).toBe('https://minio.internal:9000');
    expect(value.forcePathStyle).toBe(true);
  });

  it('names the specific missing field rather than failing generically', () => {
    const { error } = resolveStorageInput('supabase', creds); // no projectRef
    expect(error).toMatch(/Project reference/i);
  });

  it('rejects an endpoint that is not an http(s) URL', () => {
    const { error } = resolveStorageInput('minio', { ...creds, endpoint: 'ftp://minio.internal' });
    expect(error).toMatch(/http\(s\) URL/i);
  });

  it('rejects an unknown provider', () => {
    const { error } = resolveStorageInput('dropbox', creds);
    expect(error).toMatch(/Unknown storage provider/i);
  });

  it('keeps credentials out of params', () => {
    // params is stored unencrypted, so a secret must never end up in it.
    const { value } = resolveStorageInput('cloudflare-r2', { ...creds, accountId: 'abc123' });
    expect(value.params.accessKeyId).toBeUndefined();
    expect(value.params.secretAccessKey).toBeUndefined();
    expect(value.accessKeyId).toBe('AKIAEXAMPLE');
  });
});
