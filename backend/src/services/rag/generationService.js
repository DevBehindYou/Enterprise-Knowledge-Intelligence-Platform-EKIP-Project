import Document from '../../models/Document.js';
import { llmProvider } from '../../providers/llmProvider.js';
import { retrieve, computeConfidence } from './retrievalService.js';

const NO_ANSWER_MARKER = 'NOT_FOUND_IN_CONTEXT';
const CONFIDENCE_FLOOR = 0.35; // below this, treat as ungrounded regardless of what the LLM produced

const SYSTEM_PROMPT = `You are EKIP, an enterprise knowledge assistant. Answer ONLY using the provided
context chunks. Every claim must be traceable to the context. If the context does not contain enough
information to answer, respond with exactly: ${NO_ANSWER_MARKER}
Do not apologize, do not explain — just output that exact token and nothing else in that case.
Otherwise, answer concisely in plain business language.`;

/**
 * Full ask → answer flow: retrieve permitted chunks, generate a grounded
 * answer, map citations back to source documents, and compute confidence.
 * See docs/02-system-architecture.md §5.3.
 */
export async function answerQuestion(question, user, conversationHistory = []) {
  const chunks = await retrieve(question, user, { topK: 8 });

  if (chunks.length === 0) {
    return {
      answer: "I couldn't find anything about this in the documents you have access to.",
      citations: [],
      confidence: 0,
      grounded: false,
    };
  }

  const context = chunks
    .map((c, i) => `[Chunk ${i + 1}] (score: ${c.score?.toFixed(2)})\n${c.text}`)
    .join('\n\n');

  const historyContext = conversationHistory
    .slice(-4) // last N turns for short-term memory, per FR-3.5
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.text}`)
    .join('\n');

  const fullQuestion = historyContext ? `${historyContext}\nUser: ${question}` : question;

  const { text } = await llmProvider.generate({
    systemPrompt: SYSTEM_PROMPT,
    context,
    question: fullQuestion,
    tenantId: user.tenantId, // lets Settings → AI Integration override the env default
  });
  const confidence = computeConfidence(chunks);

  if (text.trim() === NO_ANSWER_MARKER || confidence < CONFIDENCE_FLOOR) {
    return {
      answer: "I couldn't find a confident answer to this in the documents you have access to.",
      citations: [],
      confidence: 0,
      grounded: false,
    };
  }

  // Map the top 1-3 chunks used into resolvable citations (document name + page/section).
  const topChunks = chunks.slice(0, 3);
  const documentIds = [...new Set(topChunks.map((c) => String(c.documentId)))];
  const documents = await Document.find({ _id: { $in: documentIds } }).lean();
  const docById = Object.fromEntries(documents.map((d) => [String(d._id), d]));

  const citations = topChunks.map((c) => ({
    documentId: c.documentId,
    documentName: docById[String(c.documentId)]?.originalName ?? 'Unknown document',
    page: c.page,
    section: c.section,
    chunkId: c._id,
  }));

  return { answer: text.trim(), citations, confidence, grounded: true };
}
