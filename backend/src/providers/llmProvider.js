import OpenAI from 'openai';
import { env } from '../config/env.js';
import { resolveDefaultProvider, callProvider } from '../services/ai/aiGateway.js';

let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  return openaiClient;
}

/**
 * @param {{systemPrompt: string, context: string, question: string}} params
 * @returns {Promise<{text: string, usage: object}>}
 */
async function generateWithOpenAI({ systemPrompt, context, question }) {
  const client = getOpenAI();
  const completion = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.2,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
    ],
  });
  return {
    text: completion.choices[0].message.content,
    usage: completion.usage,
  };
}

async function generateWithAnthropic({ systemPrompt, context, question }) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': env.anthropicApiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic request failed: ${res.status}`);
  const data = await res.json();
  const text = data.content.map((block) => (block.type === 'text' ? block.text : '')).join('');
  return { text, usage: data.usage };
}

async function generateWithOllama({ systemPrompt, context, question }) {
  const res = await fetch(`${env.ollamaBaseUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.ollamaApiKey ? { Authorization: `Bearer ${env.ollamaApiKey}` } : {}),
    },
    body: JSON.stringify({
      model: env.ollamaModel,
      prompt: `${systemPrompt}\n\nContext:\n${context}\n\nQuestion: ${question}`,
      stream: false,
    }),
  });
  if (!res.ok) throw new Error(`Ollama generate request failed: ${res.status}`);
  const data = await res.json();
  return { text: data.response, usage: {} };
}

export const DEFAULT_SYSTEM_PROMPT = `You are EKIP, an enterprise knowledge assistant. Answer ONLY using the
provided context. Every factual claim must be traceable to a chunk in the context. If the context does
not contain enough information to answer confidently, say so plainly instead of guessing — never fall
back to general knowledge. Keep answers concise and in plain business language.`;

/**
 * Single interface the rest of the app depends on (see docs/02-system-architecture.md §3.1).
 *
 * Resolution order:
 *   1. Whatever the tenant's admin selected in Settings → AI Integration
 *      (stored in MongoDB, default Ollama Cloud `gpt-oss:120b`).
 *   2. The env-driven adapter below (LLM_PROVIDER=openai|anthropic|ollama).
 *
 * The DB path comes first so a provider can be swapped from the UI without a
 * redeploy, but the env path is kept as the fallback so the RAG pipeline still
 * works on a fresh install before anyone has visited Settings — and so the
 * ingestion worker isn't blocked on a config row existing.
 */
export const llmProvider = {
  /**
   * @param {{systemPrompt?: string, context: string, question: string, tenantId?: string}} params
   * @returns {Promise<{text: string, usage: object, provider?: string, model?: string}>}
   */
  async generate({ systemPrompt = DEFAULT_SYSTEM_PROMPT, context, question, tenantId }) {
    if (tenantId) {
      try {
        const resolved = await resolveDefaultProvider(tenantId);
        // A provider with no API key is "configured but not usable" — fall
        // through to env rather than firing a request guaranteed to 401.
        if (resolved && (resolved.config.apiKey || resolved.doc.provider === 'ollama-local')) {
          const result = await callProvider(resolved.config, {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: `Context:\n${context}\n\nQuestion: ${question}` },
            ],
          });
          return { ...result, provider: resolved.doc.provider, model: resolved.doc.model };
        }
      } catch (err) {
        // A misconfigured tenant provider degrades to the env adapter instead of
        // failing the user's question outright (graceful degradation NFR).
        console.warn('[llm] configured provider failed, falling back to env adapter:', err.message);
      }
    }

    switch (env.llmProvider) {
      case 'anthropic':
        return generateWithAnthropic({ systemPrompt, context, question });
      case 'ollama':
        return generateWithOllama({ systemPrompt, context, question });
      case 'openai':
      default:
        return generateWithOpenAI({ systemPrompt, context, question });
    }
  },
};
