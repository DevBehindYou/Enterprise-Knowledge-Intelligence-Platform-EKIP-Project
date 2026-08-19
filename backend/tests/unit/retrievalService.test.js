import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/models/DocumentChunk.js', () => ({
  default: { aggregate: vi.fn() },
}));
vi.mock('../../src/providers/embeddingProvider.js', () => ({
  embeddingProvider: { embed: vi.fn() },
}));

const { retrieve, computeConfidence } = await import('../../src/services/rag/retrievalService.js');
const DocumentChunk = (await import('../../src/models/DocumentChunk.js')).default;
const { embeddingProvider } = await import('../../src/providers/embeddingProvider.js');

describe('computeConfidence', () => {
  it('returns 0 for no chunks', () => {
    expect(computeConfidence([])).toBe(0);
  });

  it('scores higher when multiple chunks agree above the relevance threshold', () => {
    const oneStrongChunk = [{ score: 0.9 }];
    const threeStrongChunks = [{ score: 0.9 }, { score: 0.85 }, { score: 0.8 }];
    expect(computeConfidence(threeStrongChunks)).toBeGreaterThan(computeConfidence(oneStrongChunk));
  });

  it('never exceeds 1', () => {
    const chunks = [{ score: 1 }, { score: 1 }, { score: 1 }, { score: 1 }];
    expect(computeConfidence(chunks)).toBeLessThanOrEqual(1);
  });
});

describe('retrieve', () => {
  const user = { id: 'user-1', tenantId: '507f1f77bcf86cd799439011', role: 'employee', department: 'HR' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('embeds the question and runs a $vectorSearch aggregation scoped to the tenant/department', async () => {
    embeddingProvider.embed.mockResolvedValue([0.1, 0.2, 0.3]);
    DocumentChunk.aggregate.mockResolvedValue([{ _id: 'chunk-1', text: 'Some policy text', score: 0.9 }]);

    const results = await retrieve('What is the leave policy?', user, { topK: 5 });

    expect(embeddingProvider.embed).toHaveBeenCalledWith('What is the leave policy?');
    expect(DocumentChunk.aggregate).toHaveBeenCalledTimes(1);

    const pipeline = DocumentChunk.aggregate.mock.calls[0][0];
    const vectorSearchStage = pipeline[0].$vectorSearch;
    expect(vectorSearchStage.queryVector).toEqual([0.1, 0.2, 0.3]);
    expect(vectorSearchStage.limit).toBe(5);
    // The permission filter must be present INSIDE the vector search stage itself.
    expect(vectorSearchStage.filter.securityLevel.$in).toEqual(['public', 'internal']);
    expect(vectorSearchStage.filter.$or).toContainEqual({ department: 'HR' });

    expect(results).toEqual([{ _id: 'chunk-1', text: 'Some policy text', score: 0.9 }]);
  });

  it('returns an empty array when no chunks clear the vector search', async () => {
    embeddingProvider.embed.mockResolvedValue([0.1, 0.2, 0.3]);
    DocumentChunk.aggregate.mockResolvedValue([]);
    const results = await retrieve('An unrelated question', user);
    expect(results).toEqual([]);
  });
});
