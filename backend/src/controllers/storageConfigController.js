import StorageConfig from '../models/StorageConfig.js';
import { writeAudit } from '../middleware/auditWrite.js';
import { encryptSecret, maskSecret, decryptSecret, isMaskedPlaceholder } from '../utils/secretVault.js';
import { storageProviderCatalog, resolveStorageInput, getStorageProvider } from '../services/storage/storageProviders.js';
import { testConnection } from '../services/storage/fileManagerService.js';

/**
 * Settings → Storage Integration.
 *
 * Secrets are never returned to the client — reads get a `••••abcd` mask. When
 * an edit form posts the mask back unchanged, the stored value is kept rather
 * than being overwritten with the mask string.
 */

/** Strips secrets and returns only what the UI is allowed to see. */
function toPublic(doc) {
  return {
    id: String(doc._id),
    name: doc.name,
    provider: doc.provider,
    bucket: doc.bucket,
    region: doc.region,
    endpoint: doc.endpoint,
    forcePathStyle: doc.forcePathStyle,
    params: doc.params || {},
    publicBaseUrl: doc.publicBaseUrl || '',
    accessKeyId: maskSecret(doc.accessKeyId),
    secretAccessKey: doc.secretAccessKey ? '••••••••' : '',
    isActive: doc.isActive,
    status: doc.status,
    statusMessage: doc.statusMessage,
    lastTestedAt: doc.lastTestedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export const storageConfigController = {
  /** The provider catalog + field specs that drive the dynamic form. */
  async providers(req, res, next) {
    try {
      res.status(200).json({ providers: storageProviderCatalog() });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      const items = await StorageConfig.find({ tenantId: req.user.tenantId }).sort({ createdAt: -1 });
      res.status(200).json({ items: items.map(toPublic) });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { provider, name, publicBaseUrl, setActive = true, ...input } = req.body;
      const { value, error } = resolveStorageInput(provider, input);
      if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });

      const spec = getStorageProvider(provider);
      const doc = await StorageConfig.create({
        tenantId: req.user.tenantId,
        name: String(name || spec.label).trim(),
        provider: value.provider,
        bucket: value.bucket,
        region: value.region,
        endpoint: value.endpoint,
        forcePathStyle: value.forcePathStyle,
        params: value.params,
        accessKeyId: encryptSecret(value.accessKeyId),
        secretAccessKey: encryptSecret(value.secretAccessKey),
        publicBaseUrl: String(publicBaseUrl || '').trim(),
        createdBy: req.user.id,
      });

      // Verify immediately so the admin isn't left wondering whether it works.
      const result = await testConnection(doc);
      doc.status = result.ok ? 'connected' : 'error';
      doc.statusMessage = result.message;
      doc.lastTestedAt = new Date();

      // Only a connection that actually works may become the active provider —
      // activating a broken one would break the File Manager for everyone.
      if (setActive && result.ok) {
        await StorageConfig.updateMany({ tenantId: req.user.tenantId, _id: { $ne: doc._id } }, { isActive: false });
        doc.isActive = true;
      }
      await doc.save();

      await writeAudit({
        req,
        action: 'storage.config_create',
        targetType: 'storage_config',
        targetId: doc._id,
        metadata: { provider: doc.provider, bucket: doc.bucket, connected: result.ok },
      });

      res.status(201).json({ config: toPublic(doc), test: result });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const doc = await StorageConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!doc) {
        return res.status(404).json({ error: { code: 'STORAGE_CONFIG_NOT_FOUND', message: 'Not found.' } });
      }

      const { name, publicBaseUrl, ...input } = req.body;

      // An edit form re-posts the masked secrets it was given; treat those as
      // "unchanged" so a user editing only the bucket name doesn't wipe the keys.
      const merged = {
        ...(doc.params || {}),
        bucket: doc.bucket,
        region: doc.region,
        endpoint: doc.endpoint,
        accessKeyId: decryptSecret(doc.accessKeyId),
        secretAccessKey: decryptSecret(doc.secretAccessKey),
      };
      for (const [key, raw] of Object.entries(input)) {
        if (raw === undefined || raw === null || raw === '') continue;
        if (isMaskedPlaceholder(raw)) continue;
        merged[key] = raw;
      }

      const { value, error } = resolveStorageInput(doc.provider, merged);
      if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });

      if (name !== undefined) doc.name = String(name).trim() || doc.name;
      if (publicBaseUrl !== undefined) doc.publicBaseUrl = String(publicBaseUrl).trim();
      doc.bucket = value.bucket;
      doc.region = value.region;
      doc.endpoint = value.endpoint;
      doc.forcePathStyle = value.forcePathStyle;
      doc.params = value.params;
      doc.accessKeyId = encryptSecret(value.accessKeyId);
      doc.secretAccessKey = encryptSecret(value.secretAccessKey);

      const result = await testConnection(doc);
      doc.status = result.ok ? 'connected' : 'error';
      doc.statusMessage = result.message;
      doc.lastTestedAt = new Date();
      // A config that just stopped working must not stay active.
      if (!result.ok && doc.isActive) doc.isActive = false;
      await doc.save();

      await writeAudit({
        req,
        action: 'storage.config_update',
        targetType: 'storage_config',
        targetId: doc._id,
        metadata: { provider: doc.provider, connected: result.ok },
      });

      res.status(200).json({ config: toPublic(doc), test: result });
    } catch (err) {
      next(err);
    }
  },

  /** Test an existing saved config, or unsaved form values before saving. */
  async test(req, res, next) {
    try {
      if (req.params.id) {
        const doc = await StorageConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!doc) {
          return res.status(404).json({ error: { code: 'STORAGE_CONFIG_NOT_FOUND', message: 'Not found.' } });
        }
        const result = await testConnection(doc);
        doc.status = result.ok ? 'connected' : 'error';
        doc.statusMessage = result.message;
        doc.lastTestedAt = new Date();
        if (!result.ok && doc.isActive) doc.isActive = false;
        await doc.save();
        return res.status(200).json({ ...result, config: toPublic(doc) });
      }

      const { provider, ...input } = req.body;
      const { value, error } = resolveStorageInput(provider, input);
      if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });

      const result = await testConnection({
        _id: 'ephemeral-test',
        updatedAt: new Date(),
        ...value,
        accessKeyId: encryptSecret(value.accessKeyId),
        secretAccessKey: encryptSecret(value.secretAccessKey),
      });
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async activate(req, res, next) {
    try {
      const doc = await StorageConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!doc) {
        return res.status(404).json({ error: { code: 'STORAGE_CONFIG_NOT_FOUND', message: 'Not found.' } });
      }

      const result = await testConnection(doc);
      doc.status = result.ok ? 'connected' : 'error';
      doc.statusMessage = result.message;
      doc.lastTestedAt = new Date();
      if (!result.ok) {
        await doc.save();
        return res.status(400).json({
          error: {
            code: 'STORAGE_TEST_FAILED',
            message: `Cannot activate a provider that isn't reachable: ${result.message}`,
          },
        });
      }

      await StorageConfig.updateMany({ tenantId: req.user.tenantId, _id: { $ne: doc._id } }, { isActive: false });
      doc.isActive = true;
      await doc.save();

      await writeAudit({
        req,
        action: 'storage.config_activate',
        targetType: 'storage_config',
        targetId: doc._id,
        metadata: { provider: doc.provider, bucket: doc.bucket },
      });
      res.status(200).json({ config: toPublic(doc) });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const doc = await StorageConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!doc) {
        return res.status(404).json({ error: { code: 'STORAGE_CONFIG_NOT_FOUND', message: 'Not found.' } });
      }
      // Deleting the config only removes the saved credentials — the files in
      // the bucket are untouched, which is what an admin expects here.
      await doc.deleteOne();
      await writeAudit({
        req,
        action: 'storage.config_delete',
        targetType: 'storage_config',
        targetId: req.params.id,
        metadata: { provider: doc.provider, bucket: doc.bucket },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
