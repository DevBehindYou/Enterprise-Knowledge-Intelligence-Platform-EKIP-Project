import { describe, it, expect } from 'vitest';
import { AI_PROVIDERS, getAiProvider, resolveAiInput } from '../../src/services/ai/aiProviders.js';

describe('AI provider catalog', () => {
  it('offers Ollama Cloud, OpenAI, Anthropic, Gemini, local Ollama, and a custom option', () => {
    const ids = AI_PROVIDERS.map((p) => p.id);
    expect(ids).toEqual(
      expect.arrayContaining(['ollama-cloud', 'openai', 'anthropic', 'gemini', 'ollama-local', 'custom'])
    );
  });

  it('makes Ollama Cloud running gpt-oss:120b the platform default', () => {
    const ollama = getAiProvider('ollama-cloud');
    expect(ollama.isPlatformDefault).toBe(true);
    expect(ollama.defaultModel).toBe('gpt-oss:120b');
    expect(ollama.defaultBaseUrl).toBe('https://ollama.com');
    // Exactly one provider may claim the platform default.
    expect(AI_PROVIDERS.filter((p) => p.isPlatformDefault)).toHaveLength(1);
  });

  it('lists gpt-oss:120b without the -cloud suffix, which is what the API expects', () => {
    expect(getAiProvider('ollama-cloud').models).toContain('gpt-oss:120b');
    expect(getAiProvider('ollama-cloud').models).not.toContain('gpt-oss:120b-cloud');
  });

  it('gives every provider a default base URL except the fully custom one', () => {
    for (const provider of AI_PROVIDERS) {
      if (provider.id === 'custom') continue;
      expect(provider.defaultBaseUrl).toMatch(/^https?:\/\//);
      expect(provider.defaultModel).toBeTruthy();
    }
  });

  it('marks the API key field secret wherever one is accepted', () => {
    for (const provider of AI_PROVIDERS) {
      const apiKeyField = provider.fields.find((f) => f.key === 'apiKey');
      if (apiKeyField) expect(apiKeyField.secret).toBe(true);
    }
  });

  it('does not require an API key for a self-hosted Ollama server', () => {
    expect(getAiProvider('ollama-local').requiresApiKey).toBe(false);
    expect(getAiProvider('ollama-cloud').requiresApiKey).toBe(true);
  });

  it('returns null for an unknown provider id', () => {
    expect(getAiProvider('bedrock')).toBeNull();
  });
});

describe('resolveAiInput', () => {
  it('fills the base URL and model from the provider defaults', () => {
    const { value, error } = resolveAiInput('ollama-cloud', { apiKey: 'key-123' });
    expect(error).toBeUndefined();
    expect(value.model).toBe('gpt-oss:120b');
    expect(value.baseUrl).toBe('https://ollama.com');
    expect(value.temperature).toBe(0.2);
    expect(value.maxTokens).toBe(1024);
  });

  it('lets the caller override the model and base URL', () => {
    const { value } = resolveAiInput('openai', { apiKey: 'sk-x', model: 'gpt-4o', baseUrl: 'https://proxy.internal/v1' });
    expect(value.model).toBe('gpt-4o');
    expect(value.baseUrl).toBe('https://proxy.internal/v1');
  });

  it('strips a trailing slash from the base URL so path joins do not double up', () => {
    const { value } = resolveAiInput('openai', { apiKey: 'sk-x', baseUrl: 'https://api.openai.com/v1/' });
    expect(value.baseUrl).toBe('https://api.openai.com/v1');
  });

  it('requires a base URL for the fully custom provider', () => {
    const { error } = resolveAiInput('custom', { model: 'llama-3.3-70b' });
    expect(error).toMatch(/base URL is required/i);
  });

  it('requires a model name', () => {
    const { error } = resolveAiInput('custom', { baseUrl: 'https://api.groq.com/openai/v1' });
    expect(error).toMatch(/model name is required/i);
  });

  it('rejects a non-http base URL', () => {
    const { error } = resolveAiInput('custom', { baseUrl: 'ftp://x.example', model: 'm' });
    expect(error).toMatch(/http\(s\) URL/i);
  });

  it('rejects an out-of-range temperature', () => {
    expect(resolveAiInput('openai', { apiKey: 'k', temperature: 5 }).error).toMatch(/Temperature/i);
    expect(resolveAiInput('openai', { apiKey: 'k', temperature: -1 }).error).toMatch(/Temperature/i);
    expect(resolveAiInput('openai', { apiKey: 'k', temperature: 'hot' }).error).toMatch(/Temperature/i);
  });

  it('rejects an out-of-range max tokens', () => {
    expect(resolveAiInput('openai', { apiKey: 'k', maxTokens: 0 }).error).toMatch(/Max tokens/i);
    expect(resolveAiInput('openai', { apiKey: 'k', maxTokens: 999999 }).error).toMatch(/Max tokens/i);
  });

  it('rejects an unknown provider', () => {
    expect(resolveAiInput('bedrock', {}).error).toMatch(/Unknown AI provider/i);
  });

  it('leaves apiKey undefined when the caller omits it, so an update can mean "unchanged"', () => {
    const { value } = resolveAiInput('ollama-local', { model: 'llama3.1:8b' });
    expect(value.apiKey).toBeUndefined();
  });
});
