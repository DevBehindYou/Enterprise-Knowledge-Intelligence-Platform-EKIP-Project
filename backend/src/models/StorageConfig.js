import mongoose from 'mongoose';

/**
 * One saved storage connection (Settings → Storage Integration).
 * Credentials are AES-256-GCM encrypted via utils/secretVault.js before they
 * ever reach this schema — never store them raw. Exactly one config per tenant
 * is `isActive`; the File Manager always operates on the active one.
 */
const storageConfigSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    name: { type: String, required: true, trim: true },
    provider: {
      type: String,
      enum: [
        'amazon-s3',
        'supabase',
        'google-cloud-storage',
        'cloudflare-r2',
        'digitalocean-spaces',
        'backblaze-b2',
        'wasabi',
        'minio',
        's3-compatible',
      ],
      required: true,
    },
    bucket: { type: String, required: true, trim: true },
    region: { type: String, default: 'us-east-1' },
    endpoint: { type: String }, // resolved from provider params at save time; empty for native AWS S3
    forcePathStyle: { type: Boolean, default: false },
    // Non-secret provider-specific inputs (accountId, projectRef, …) kept so the
    // edit form can re-render exactly what was entered.
    params: { type: mongoose.Schema.Types.Mixed, default: {} },
    // Encrypted (enc:v1:…) — see utils/secretVault.js
    accessKeyId: { type: String, required: true },
    secretAccessKey: { type: String, required: true },
    publicBaseUrl: { type: String, default: '' }, // optional CDN/public prefix for shared links
    isActive: { type: Boolean, default: false, index: true },
    status: { type: String, enum: ['unverified', 'connected', 'error'], default: 'unverified' },
    statusMessage: { type: String, default: '' },
    lastTestedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

storageConfigSchema.index({ tenantId: 1, isActive: 1 });

export default mongoose.model('StorageConfig', storageConfigSchema);
