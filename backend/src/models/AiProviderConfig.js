import mongoose from 'mongoose';

/**
 * One configured AI provider (Settings → AI Integration).
 * The platform default is Ollama Cloud (`gpt-oss:120b`, free tier) — seeded on
 * first read if the tenant has no providers yet. Exactly one config per tenant
 * is `isDefault`; RAG generation resolves it first and falls back to the
 * env-based adapter (providers/llmProvider.js) when nothing is configured.
 * API keys are encrypted via utils/secretVault.js.
 */
const aiProviderConfigSchema = new mongoose.Schema(
  {
    tenantId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    provider: {
      type: String,
      enum: ['ollama-cloud', 'openai', 'anthropic', 'gemini', 'ollama-local', 'custom'],
      required: true,
    },
    label: { type: String, required: true, trim: true },
    baseUrl: { type: String, default: '' },
    apiKey: { type: String, default: '' }, // encrypted (enc:v1:…)
    model: { type: String, required: true, trim: true },
    temperature: { type: Number, default: 0.2, min: 0, max: 2 },
    maxTokens: { type: Number, default: 1024, min: 1 },
    isDefault: { type: Boolean, default: false, index: true },
    enabled: { type: Boolean, default: true },
    status: { type: String, enum: ['unverified', 'connected', 'error'], default: 'unverified' },
    statusMessage: { type: String, default: '' },
    lastTestedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

aiProviderConfigSchema.index({ tenantId: 1, isDefault: 1 });

export default mongoose.model('AiProviderConfig', aiProviderConfigSchema);
