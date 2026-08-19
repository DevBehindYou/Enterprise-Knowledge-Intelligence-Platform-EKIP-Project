import mongoose from 'mongoose';
import DocumentChunk from '../../models/DocumentChunk.js';
import { embeddingProvider } from '../../providers/embeddingProvider.js';
import { permissionService } from '../permissionService.js';
import { env } from '../../config/env.js';

/**
 * Retrieves the top-K permitted chunks for a question.
 *
 * The permission filter is applied INSIDE the $vectorSearch stage itself
 * (not as a post-query .filter()) — this is what makes retrieval genuinely
 * permission-aware rather than "usually fine." See docs/02-system-architecture.md §5.2.
 *
 * This module is intentionally the only place that talks to the vector index,
 * so migrating to a dedicated vector engine later (docs/02 §9) only touches this file.
 */
export async function retrieve(question, user, { topK = 8 } = {}) {
  const queryEmbedding = await embeddingProvider.embed(question);
  const allowedLevels = permissionService.defaultAllowedLevels(user.role);

  const pipeline = [
    {
      $vectorSearch: {
        index: env.vectorIndexName,
        path: 'embedding',
        queryVector: queryEmbedding,
        numCandidates: topK * 15,
        limit: topK,
        filter: {
          tenantId: new mongoose.Types.ObjectId(user.tenantId),
          securityLevel: { $in: allowedLevels },
          $or: [{ department: user.department }, { securityLevel: 'public' }],
        },
      },
    },
    {
      $project: {
        text: 1,
        documentId: 1,
        page: 1,
        section: 1,
        chunkIndex: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ];

  const results = await DocumentChunk.aggregate(pipeline);
  return results; // [{ _id, text, documentId, page, section, score, ... }]
}

/**
 * Confidence heuristic: blends the top chunk's similarity score with how many
 * of the returned chunks clear a "relevant" threshold. Replace with a learned
 * groundedness classifier in Phase 3 (see docs/01-brd-srs.md, evaluation FRs).
 */
export function computeConfidence(chunks) {
  if (!chunks.length) return 0;
  const topScore = chunks[0].score ?? 0;
  const relevantCount = chunks.filter((c) => (c.score ?? 0) > 0.65).length;
  const spread = Math.min(relevantCount / 3, 1); // caps out once 3+ chunks agree
  return Math.min(1, topScore * 0.75 + spread * 0.25);
}
