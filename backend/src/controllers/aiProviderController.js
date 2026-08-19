import AiProviderConfig from '../models/AiProviderConfig.js';
import { writeAudit } from '../middleware/auditWrite.js';
import { encryptSecret, maskSecret, decryptSecret, isMaskedPlaceholder } from '../utils/secretVault.js';
import { aiProviderCatalog, resolveAiInput, getAiProvider } from '../services/ai/aiProviders.js';
import { testAiConnection, toCallableConfig } from '../services/ai/aiGateway.js';

/**
 * Settings → AI Integration.
 *
 * Ollama Cloud (`gpt-oss:120b`, free tier) is seeded as the default entry the
 * first time a tenant opens this page, so there's always something to point at —
 * it just needs an API key pasted in before it can be used.
 */

function toPublic(doc) {
  const spec = getAiProvider(doc.provider);
  return {
    id: String(doc._id),
    provider: doc.provider,
    providerLabel: spec?.label || doc.provider,
    label: doc.label,
    baseUrl: doc.baseUrl,
    model: doc.model,
    apiKey: maskSecret(doc.apiKey),
    hasApiKey: Boolean(decryptSecret(doc.apiKey)),
    temperature: doc.temperature,
    maxTokens: doc.maxTokens,
    isDefault: doc.isDefault,
    enabled: doc.enabled,
    status: doc.status,
    statusMessage: doc.statusMessage,
    lastTestedAt: doc.lastTestedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/**
 * Creates the Ollama Cloud entry on first visit. Left unverified with no key —
 * seeding a placeholder key would be worse than an obvious "needs setup" state.
 */
async function seedDefaults(tenantId, userId) {
  const count = await AiProviderConfig.countDocuments({ tenantId });
  if (count > 0) return;
  const spec = getAiProvider('ollama-cloud');
  await AiProviderConfig.create({
    tenantId,
    provider: 'ollama-cloud',
    label: 'Ollama Cloud (free)',
    baseUrl: spec.defaultBaseUrl,
    model: spec.defaultModel,
    apiKey: '',
    isDefault: true,
    enabled: true,
    status: 'unverified',
    statusMessage: 'Add your Ollama API key to start using this provider.',
    createdBy: userId,
  });
}

export const aiProviderController = {
  async providers(req, res, next) {
    try {
      res.status(200).json({ providers: aiProviderCatalog() });
    } catch (err) {
      next(err);
    }
  },

  async list(req, res, next) {
    try {
      await seedDefaults(req.user.tenantId, req.user.id);
      const items = await AiProviderConfig.find({ tenantId: req.user.tenantId }).sort({
        isDefault: -1,
        createdAt: 1,
      });
      res.status(200).json({ items: items.map(toPublic) });
    } catch (err) {
      next(err);
    }
  },

  async create(req, res, next) {
    try {
      const { provider, setDefault = false, enabled = true } = req.body;
      const { value, error } = resolveAiInput(provider, req.body);
      if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });

      const spec = getAiProvider(provider);
      if (spec.requiresApiKey && !value.apiKey) {
        return res.status(400).json({
          error: { code: 'VALIDATION_ERROR', message: `${spec.label} requires an API key.` },
        });
      }

      const doc = await AiProviderConfig.create({
        tenantId: req.user.tenantId,
        provider: value.provider,
        label: value.label,
        baseUrl: value.baseUrl,
        model: value.model,
        apiKey: encryptSecret(value.apiKey || ''),
        temperature: value.temperature,
        maxTokens: value.maxTokens,
        enabled: Boolean(enabled),
        createdBy: req.user.id,
      });

      const result = await testAiConnection(toCallableConfig(doc));
      doc.status = result.ok ? 'connected' : 'error';
      doc.statusMessage = result.message;
      doc.lastTestedAt = new Date();

      // Same rule as storage: only a provider that answered may become default.
      const isFirst = (await AiProviderConfig.countDocuments({ tenantId: req.user.tenantId })) === 1;
      if ((setDefault || isFirst) && result.ok) {
        await AiProviderConfig.updateMany(
          { tenantId: req.user.tenantId, _id: { $ne: doc._id } },
          { isDefault: false }
        );
        doc.isDefault = true;
      }
      await doc.save();

      await writeAudit({
        req,
        action: 'ai.provider_create',
        targetType: 'ai_provider',
        targetId: doc._id,
        metadata: { provider: doc.provider, model: doc.model, connected: result.ok },
      });

      res.status(201).json({ config: toPublic(doc), test: result });
    } catch (err) {
      next(err);
    }
  },

  async update(req, res, next) {
    try {
      const doc = await AiProviderConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!doc) {
        return res.status(404).json({ error: { code: 'AI_PROVIDER_NOT_FOUND', message: 'Not found.' } });
      }

      const incoming = { ...req.body };
      // A masked key echoed back from the form means "leave it as it was".
      if (incoming.apiKey === undefined || incoming.apiKey === '' || isMaskedPlaceholder(incoming.apiKey)) {
        incoming.apiKey = decryptSecret(doc.apiKey);
      }

      const { value, error } = resolveAiInput(doc.provider, {
        label: doc.label,
        model: doc.model,
        baseUrl: doc.baseUrl,
        temperature: doc.temperature,
        maxTokens: doc.maxTokens,
        ...incoming,
      });
      if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });

      doc.label = value.label;
      doc.model = value.model;
      doc.baseUrl = value.baseUrl;
      doc.apiKey = encryptSecret(value.apiKey || '');
      doc.temperature = value.temperature;
      doc.maxTokens = value.maxTokens;
      if (req.body.enabled !== undefined) doc.enabled = Boolean(req.body.enabled);

      const result = await testAiConnection(toCallableConfig(doc));
      doc.status = result.ok ? 'connected' : 'error';
      doc.statusMessage = result.message;
      doc.lastTestedAt = new Date();
      await doc.save();

      await writeAudit({
        req,
        action: 'ai.provider_update',
        targetType: 'ai_provider',
        targetId: doc._id,
        metadata: { provider: doc.provider, model: doc.model, connected: result.ok },
      });

      res.status(200).json({ config: toPublic(doc), test: result });
    } catch (err) {
      next(err);
    }
  },

  async test(req, res, next) {
    try {
      if (req.params.id) {
        const doc = await AiProviderConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
        if (!doc) {
          return res.status(404).json({ error: { code: 'AI_PROVIDER_NOT_FOUND', message: 'Not found.' } });
        }
        const result = await testAiConnection(toCallableConfig(doc));
        doc.status = result.ok ? 'connected' : 'error';
        doc.statusMessage = result.message;
        doc.lastTestedAt = new Date();
        await doc.save();
        return res.status(200).json({ ...result, config: toPublic(doc) });
      }

      const { value, error } = resolveAiInput(req.body.provider, req.body);
      if (error) return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: error } });
      const result = await testAiConnection(value);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  },

  async setDefault(req, res, next) {
    try {
      const doc = await AiProviderConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!doc) {
        return res.status(404).json({ error: { code: 'AI_PROVIDER_NOT_FOUND', message: 'Not found.' } });
      }

      const result = await testAiConnection(toCallableConfig(doc));
      doc.status = result.ok ? 'connected' : 'error';
      doc.statusMessage = result.message;
      doc.lastTestedAt = new Date();
      if (!result.ok) {
        await doc.save();
        return res.status(400).json({
          error: {
            code: 'AI_TEST_FAILED',
            message: `Cannot make this the default while it isn't reachable: ${result.message}`,
          },
        });
      }

      await AiProviderConfig.updateMany(
        { tenantId: req.user.tenantId, _id: { $ne: doc._id } },
        { isDefault: false }
      );
      doc.isDefault = true;
      doc.enabled = true;
      await doc.save();

      await writeAudit({
        req,
        action: 'ai.provider_set_default',
        targetType: 'ai_provider',
        targetId: doc._id,
        metadata: { provider: doc.provider, model: doc.model },
      });
      res.status(200).json({ config: toPublic(doc) });
    } catch (err) {
      next(err);
    }
  },

  async remove(req, res, next) {
    try {
      const doc = await AiProviderConfig.findOne({ _id: req.params.id, tenantId: req.user.tenantId });
      if (!doc) {
        return res.status(404).json({ error: { code: 'AI_PROVIDER_NOT_FOUND', message: 'Not found.' } });
      }

      const remaining = await AiProviderConfig.countDocuments({ tenantId: req.user.tenantId });
      if (remaining <= 1) {
        return res.status(400).json({
          error: {
            code: 'VALIDATION_ERROR',
            message: 'At least one AI provider must remain configured. Add a replacement before deleting this one.',
          },
        });
      }

      const wasDefault = doc.isDefault;
      await doc.deleteOne();

      // Never leave the tenant with no default — promote the next enabled one.
      if (wasDefault) {
        const next = await AiProviderConfig.findOne({ tenantId: req.user.tenantId, enabled: true }).sort({
          createdAt: 1,
        });
        if (next) {
          next.isDefault = true;
          await next.save();
        }
      }

      await writeAudit({
        req,
        action: 'ai.provider_delete',
        targetType: 'ai_provider',
        targetId: req.params.id,
        metadata: { provider: doc.provider, model: doc.model, wasDefault },
      });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  },
};
