import AiProviderConfig from '../../models/AiProviderConfig.js';
import { decryptSecret } from '../../utils/secretVault.js';
import { getAiProvider } from './aiProviders.js';

/**
 * Calls whichever AI provider the tenant has configured as default.
 *
 * This sits above providers/llmProvider.js: that module is the env-driven
 * adapter (LLM_PROVIDER=…) and remains the fallback, while this one honours
 * what an admin picked in Settings → AI Integration. Resolution order is
 * DB default → enabled DB provider → env adapter.
 */

const REQUEST_TIMEOUT_MS = 120000;

async function postJson(url, { headers = {}, body, timeoutMs = REQUEST_TIMEOUT_MS }) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }
    if (!res.ok) {
      const message =
        data?.error?.message || data?.error || data?.message || `Request failed with status ${res.status}.`;
      const err = new Error(typeof message === 'string' ? message : JSON.stringify(message));
      err.status = res.status >= 500 ? 502 : 400;
      err.code = 'AI_PROVIDER_ERROR';
      throw err;
    }
    return data;
  } catch (err) {
    if (err.name === 'AbortError') {
      const timeout = new Error('The AI provider did not respond in time.');
      timeout.status = 504;
      timeout.code = 'AI_PROVIDER_TIMEOUT';
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ------------------------------------------------------------------ */
/* Per-provider calls                                                  */
/* ------------------------------------------------------------------ */

/** Ollama Cloud and self-hosted Ollama share POST /api/chat. */
async function callOllama({ baseUrl, apiKey, model, messages, temperature, maxTokens }) {
  const data = await postJson(`${baseUrl}/api/chat`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    body: {
      model,
      messages,
      stream: false,
      options: { temperature, num_predict: maxTokens },
    },
  });
  return {
    text: data?.message?.content ?? '',
    usage: {
      promptTokens: data?.prompt_eval_count,
      completionTokens: data?.eval_count,
    },
  };
}

/** OpenAI + anything OpenAI-compatible (Groq, Together, OpenRouter, vLLM, …). */
async function callOpenAiCompatible({ baseUrl, apiKey, model, messages, temperature, maxTokens }) {
  const data = await postJson(`${baseUrl}/chat/completions`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
    body: { model, messages, temperature, max_tokens: maxTokens },
  });
  return {
    text: data?.choices?.[0]?.message?.content ?? '',
    usage: {
      promptTokens: data?.usage?.prompt_tokens,
      completionTokens: data?.usage?.completion_tokens,
    },
  };
}

/** Anthropic Messages API keeps the system prompt outside the messages array. */
async function callAnthropic({ baseUrl, apiKey, model, messages, temperature, maxTokens }) {
  const systemPrompt = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const rest = messages.filter((m) => m.role !== 'system');
  const data = await postJson(`${baseUrl}/v1/messages`, {
    headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: {
      model,
      max_tokens: maxTokens,
      temperature,
      ...(systemPrompt ? { system: systemPrompt } : {}),
      messages: rest.map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content })),
    },
  });
  return {
    text: (data?.content || []).map((b) => (b.type === 'text' ? b.text : '')).join(''),
    usage: {
      promptTokens: data?.usage?.input_tokens,
      completionTokens: data?.usage?.output_tokens,
    },
  };
}

/** Gemini takes the key as a query param and calls it "systemInstruction". */
async function callGemini({ baseUrl, apiKey, model, messages, temperature, maxTokens }) {
  const systemPrompt = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const contents = messages
    .filter((m) => m.role !== 'system')
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));

  const data = await postJson(
    `${baseUrl}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      body: {
        contents,
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
        generationConfig: { temperature, maxOutputTokens: maxTokens },
      },
    }
  );
  return {
    text: (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join(''),
    usage: {
      promptTokens: data?.usageMetadata?.promptTokenCount,
      completionTokens: data?.usageMetadata?.candidatesTokenCount,
    },
  };
}

/**
 * Dispatches one chat completion against an explicit provider config.
 * @param {{provider:string, baseUrl:string, apiKey:string, model:string, temperature?:number, maxTokens?:number}} config
 * @param {{messages:{role:string,content:string}[]}} params
 */
export async function callProvider(config, { messages }) {
  const spec = getAiProvider(config.provider);
  const baseUrl = (config.baseUrl || spec?.defaultBaseUrl || '').replace(/\/+$/, '');
  const args = {
    baseUrl,
    apiKey: config.apiKey || '',
    model: config.model,
    messages,
    temperature: config.temperature ?? 0.2,
    maxTokens: config.maxTokens ?? 1024,
  };

  switch (config.provider) {
    case 'ollama-cloud':
    case 'ollama-local':
      return callOllama(args);
    case 'anthropic':
      return callAnthropic(args);
    case 'gemini':
      return callGemini(args);
    case 'openai':
    case 'custom':
    default:
      return callOpenAiCompatible(args);
  }
}

/** Decrypts a stored config into something callProvider can use. */
export function toCallableConfig(doc) {
  return {
    provider: doc.provider,
    baseUrl: doc.baseUrl,
    apiKey: decryptSecret(doc.apiKey),
    model: doc.model,
    temperature: doc.temperature,
    maxTokens: doc.maxTokens,
  };
}

/**
 * The tenant's active AI config, or null when nothing is set up — in which case
 * callers fall back to the env-driven adapter in providers/llmProvider.js.
 */
export async function resolveDefaultProvider(tenantId) {
  const doc =
    (await AiProviderConfig.findOne({ tenantId, isDefault: true, enabled: true })) ||
    (await AiProviderConfig.findOne({ tenantId, enabled: true }).sort({ createdAt: 1 }));
  return doc ? { doc, config: toCallableConfig(doc) } : null;
}

/** Cheap round-trip used by the "Test connection" button in Settings. */
export async function testAiConnection(config) {
  try {
    const result = await callProvider(config, {
      messages: [
        { role: 'system', content: 'You are a connectivity check. Reply with the single word: ok' },
        { role: 'user', content: 'Reply with: ok' },
      ],
    });
    const text = (result.text || '').trim();
    if (!text) return { ok: false, message: 'The provider responded but returned no text.' };
    return { ok: true, message: `Responded successfully (${text.slice(0, 40)}).` };
  } catch (err) {
    return { ok: false, message: err.message || 'The provider rejected the request.' };
  }
}
