import OpenAI from 'openai';
import { env } from '../config/env.js';

let openaiClient = null;
function getOpenAI() {
  if (!openaiClient) openaiClient = new OpenAI({ apiKey: env.openaiApiKey });
  return openaiClient;
}

/**
 * L2-normalise a vector to unit length. gemini-embedding-001 only returns
 * pre-normalised vectors at its full 3072 dims — at any smaller
 * outputDimensionality (we request 1536) the values come back un-normalised,
 * which quietly degrades cosine similarity in $vectorSearch. Normalising here
 * makes the vectors safe for both cosine and dotProduct index similarity.
 */
function l2normalize(vector) {
  let sumSq = 0;
  for (const v of vector) sumSq += v * v;
  const mag = Math.sqrt(sumSq);
  return mag > 0 ? vector.map((v) => v / mag) : vector;
}

/** @param {string} text @returns {Promise<number[]>} */
async function embedWithOpenAI(text) {
  const client = getOpenAI();
  const res = await client.embeddings.create({
    model: 'text-embedding-3-small', // 1536 dimensions — matches VECTOR_DIMENSIONS default
    input: text,
  });
  return res.data[0].embedding;
}

/** @param {string} text @returns {Promise<number[]>} */
async function embedWithOllama(text) {
  const res = await fetch(`${env.ollamaEmbeddingBaseUrl}/api/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(env.ollamaEmbeddingApiKey ? { Authorization: `Bearer ${env.ollamaEmbeddingApiKey}` } : {}),
    },
    body: JSON.stringify({ model: env.ollamaEmbeddingModel, prompt: text }),
  });
  if (!res.ok) throw new Error(`Ollama embedding request failed: ${res.status}`);
  const data = await res.json();
  return data.embedding;
}

/**
 * Google Gemini embeddings (free tier). Uses the REST `:embedContent` endpoint —
 * no SDK needed, which keeps this deployable on any free host as a plain HTTPS call.
 * The API key goes in the `x-goog-api-key` header (not the URL) to keep it out of logs.
 * @param {string} text @returns {Promise<number[]>}
 */
async function embedWithGemini(text) {
  if (!env.geminiApiKey) throw new Error('GEMINI_API_KEY is not set — required for EMBEDDING_PROVIDER=gemini.');
  const model = env.geminiEmbeddingModel;
  const res = await fetch(`${env.geminiEmbeddingBaseUrl}/models/${model}:embedContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
    body: JSON.stringify({
      model: `models/${model}`,
      content: { parts: [{ text }] },
      outputDimensionality: env.vectorDimensions,
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini embedding request failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const values = data?.embedding?.values;
  if (!Array.isArray(values)) throw new Error('Gemini embedding response had no embedding.values array.');
  return l2normalize(values);
}

/**
 * Batched Gemini embeddings via `:batchEmbedContents` — one round-trip for many
 * chunks, which matters for ingestion throughput and staying under the free-tier
 * request/day cap.
 * @param {string[]} texts @returns {Promise<number[][]>}
 */
async function embedBatchWithGemini(texts) {
  if (!env.geminiApiKey) throw new Error('GEMINI_API_KEY is not set — required for EMBEDDING_PROVIDER=gemini.');
  const model = env.geminiEmbeddingModel;
  const res = await fetch(`${env.geminiEmbeddingBaseUrl}/models/${model}:batchEmbedContents`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiApiKey },
    body: JSON.stringify({
      requests: texts.map((text) => ({
        model: `models/${model}`,
        content: { parts: [{ text }] },
        outputDimensionality: env.vectorDimensions,
      })),
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    throw new Error(`Gemini batch embedding request failed: ${res.status} ${detail.slice(0, 200)}`);
  }
  const data = await res.json();
  const embeddings = data?.embeddings;
  if (!Array.isArray(embeddings)) throw new Error('Gemini batch response had no embeddings array.');
  return embeddings.map((e) => l2normalize(e.values));
}

/**
 * Single interface the rest of the app depends on. Swapping providers is a
 * one-line env change (EMBEDDING_PROVIDER) — no caller needs to know which
 * concrete provider is behind it. See docs/02-system-architecture.md §3.1.
 */
export const embeddingProvider = {
  /** @param {string} text @returns {Promise<number[]>} */
  async embed(text) {
    switch (env.embeddingProvider) {
      case 'gemini':
        return embedWithGemini(text);
      case 'ollama':
        return embedWithOllama(text);
      case 'openai':
      default:
        return embedWithOpenAI(text);
    }
  },

  /** @param {string[]} texts @returns {Promise<number[][]>} */
  async embedBatch(texts) {
    // Providers with native batch endpoints get one round-trip; everything else
    // falls back to sequential per-text calls.
    if (env.embeddingProvider === 'openai') {
      const client = getOpenAI();
      const res = await client.embeddings.create({ model: 'text-embedding-3-small', input: texts });
      return res.data.map((d) => d.embedding);
    }
    if (env.embeddingProvider === 'gemini') {
      return embedBatchWithGemini(texts);
    }
    return Promise.all(texts.map((t) => this.embed(t)));
  },
};
