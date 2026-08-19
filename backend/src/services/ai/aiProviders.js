/**
 * Catalog of supported AI providers (Settings → AI Integration).
 *
 * The platform default is Ollama Cloud running `gpt-oss:120b`, which has a free
 * tier and needs only an API key from https://ollama.com/settings/keys. Every
 * other provider is optional and user-added.
 *
 * `fields` drive the dynamic form in the frontend. `models` is a starting list —
 * the model field stays free-text so a new model can be used the day it ships
 * without waiting on a code change here.
 */
export const AI_PROVIDERS = [
  {
    id: 'ollama-cloud',
    label: 'Ollama Cloud',
    isPlatformDefault: true,
    docsUrl: 'https://docs.ollama.com/cloud',
    keyUrl: 'https://ollama.com/settings/keys',
    help: 'Free tier, no credit card. Create an API key at ollama.com/settings/keys. Cloud model names drop the "-cloud" suffix when called over the API.',
    defaultBaseUrl: 'https://ollama.com',
    defaultModel: 'gpt-oss:120b',
    models: ['gpt-oss:120b', 'gpt-oss:20b', 'deepseek-v3.1:671b', 'qwen3-coder:480b', 'kimi-k2:1t'],
    requiresApiKey: true,
    fields: [
      { key: 'apiKey', label: 'Ollama API key', placeholder: '', required: true, secret: true },
      { key: 'model', label: 'Model', placeholder: 'gpt-oss:120b', required: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://ollama.com', required: false, help: 'Leave as-is unless you are proxying Ollama Cloud.' },
    ],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    docsUrl: 'https://platform.openai.com/docs/api-reference/chat',
    keyUrl: 'https://platform.openai.com/api-keys',
    help: 'Uses the Chat Completions API. Billed per token by OpenAI.',
    defaultBaseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4o-mini',
    models: ['gpt-4o-mini', 'gpt-4o', 'gpt-4.1', 'gpt-4.1-mini', 'o4-mini'],
    requiresApiKey: true,
    fields: [
      { key: 'apiKey', label: 'API key', placeholder: 'sk-…', required: true, secret: true },
      { key: 'model', label: 'Model', placeholder: 'gpt-4o-mini', required: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.openai.com/v1', required: false, help: 'Change only for Azure OpenAI or a compatible proxy.' },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic (Claude)',
    docsUrl: 'https://docs.claude.com/en/api/messages',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    help: 'Uses the Messages API. Billed per token by Anthropic.',
    defaultBaseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-6',
    models: ['claude-sonnet-4-6', 'claude-opus-4-1', 'claude-haiku-4-5'],
    requiresApiKey: true,
    fields: [
      { key: 'apiKey', label: 'API key', placeholder: 'sk-ant-…', required: true, secret: true },
      { key: 'model', label: 'Model', placeholder: 'claude-sonnet-4-6', required: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.anthropic.com', required: false },
    ],
  },
  {
    id: 'gemini',
    label: 'Google Gemini',
    docsUrl: 'https://ai.google.dev/gemini-api/docs',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    help: 'Google AI Studio key. Has a free tier with rate limits.',
    defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.5-pro'],
    requiresApiKey: true,
    fields: [
      { key: 'apiKey', label: 'API key', placeholder: 'AIza…', required: true, secret: true },
      { key: 'model', label: 'Model', placeholder: 'gemini-2.0-flash', required: true },
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://generativelanguage.googleapis.com/v1beta', required: false },
    ],
  },
  {
    id: 'ollama-local',
    label: 'Ollama (self-hosted)',
    docsUrl: 'https://github.com/ollama/ollama/blob/main/docs/api.md',
    help: 'A local or on-premise Ollama server. No API key needed. Best fit for air-gapped deployments.',
    defaultBaseUrl: 'http://localhost:11434',
    defaultModel: 'llama3.1:8b',
    models: ['llama3.1:8b', 'llama3.3:70b', 'mistral', 'qwen2.5', 'phi4'],
    requiresApiKey: false,
    fields: [
      { key: 'baseUrl', label: 'Server URL', placeholder: 'http://localhost:11434', required: true },
      { key: 'model', label: 'Model', placeholder: 'llama3.1:8b', required: true },
      { key: 'apiKey', label: 'API key (optional)', placeholder: '', required: false, secret: true, help: 'Only if your server sits behind an authenticating proxy.' },
    ],
  },
  {
    id: 'custom',
    label: 'Other (OpenAI-compatible)',
    docsUrl: '',
    help: 'Any endpoint exposing POST /chat/completions in OpenAI\'s format — Groq, Together, OpenRouter, Mistral, vLLM, LM Studio, and so on.',
    defaultBaseUrl: '',
    defaultModel: '',
    models: [],
    requiresApiKey: false,
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.groq.com/openai/v1', required: true, help: 'Include the version path. /chat/completions is appended automatically.' },
      { key: 'model', label: 'Model', placeholder: 'llama-3.3-70b-versatile', required: true },
      { key: 'apiKey', label: 'API key', placeholder: '', required: false, secret: true },
    ],
  },
];

export function getAiProvider(id) {
  return AI_PROVIDERS.find((p) => p.id === id) || null;
}

export function aiProviderCatalog() {
  return AI_PROVIDERS;
}

/** Validates input against the provider spec. Returns { error } or { value }. */
export function resolveAiInput(providerId, input) {
  const provider = getAiProvider(providerId);
  if (!provider) return { error: `Unknown AI provider "${providerId}".` };

  const value = {
    provider: provider.id,
    label: String(input.label || provider.label).trim(),
    model: String(input.model || provider.defaultModel || '').trim(),
    baseUrl: String(input.baseUrl || provider.defaultBaseUrl || '').trim().replace(/\/+$/, ''),
    apiKey: input.apiKey === undefined ? undefined : String(input.apiKey),
    temperature: input.temperature === undefined ? 0.2 : Number(input.temperature),
    maxTokens: input.maxTokens === undefined ? 1024 : Number(input.maxTokens),
  };

  if (!value.model) return { error: `A model name is required for ${provider.label}.` };
  if (!value.baseUrl) return { error: `A base URL is required for ${provider.label}.` };
  if (!/^https?:\/\//.test(value.baseUrl)) return { error: 'Base URL must be an http(s) URL.' };
  if (Number.isNaN(value.temperature) || value.temperature < 0 || value.temperature > 2) {
    return { error: 'Temperature must be between 0 and 2.' };
  }
  if (Number.isNaN(value.maxTokens) || value.maxTokens < 1 || value.maxTokens > 200000) {
    return { error: 'Max tokens must be between 1 and 200000.' };
  }
  return { value };
}
