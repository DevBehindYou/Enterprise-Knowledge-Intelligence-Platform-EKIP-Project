import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/models/Document.js', () => ({
  default: { find: vi.fn() },
}));
vi.mock('../../src/providers/llmProvider.js', () => ({
  llmProvider: { generate: vi.fn() },
}));
vi.mock('../../src/services/rag/retrievalService.js', () => ({
  retrieve: vi.fn(),
  computeConfidence: vi.fn(),
}));

const { answerQuestion } = await import('../../src/services/rag/generationService.js');
const Document = (await import('../../src/models/Document.js')).default;
const { llmProvider } = await import('../../src/providers/llmProvider.js');
const { retrieve, computeConfidence } = await import('../../src/services/rag/retrievalService.js');

const user = { id: 'user-1', tenantId: 'tenant-1', role: 'employee', department: 'HR' };

describe('answerQuestion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns an explicit "not found" answer with no citations when retrieval finds nothing', async () => {
    retrieve.mockResolvedValue([]);

    const result = await answerQuestion('What is the alien abduction policy?', user);

    expect(result.grounded).toBe(false);
    expect(result.citations).toEqual([]);
    expect(result.confidence).toBe(0);
    expect(llmProvider.generate).not.toHaveBeenCalled(); // never calls the LLM with no context at all
  });

  it('returns a grounded answer with mapped citations when the LLM produces a real answer', async () => {
    retrieve.mockResolvedValue([
      { _id: 'chunk-1', documentId: 'doc-1', text: 'Reimbursed up to ₹80,000 per trip.', page: 4, score: 0.91 },
    ]);
    computeConfidence.mockReturnValue(0.91);
    llmProvider.generate.mockResolvedValue({ text: 'Employees are reimbursed up to ₹80,000 per trip.', usage: {} });
    Document.find.mockReturnValue({ lean: vi.fn().mockResolvedValue([{ _id: 'doc-1', originalName: 'Travel_Policy.pdf' }]) });

    const result = await answerQuestion('What is the travel reimbursement limit?', user);

    expect(result.grounded).toBe(true);
    expect(result.confidence).toBe(0.91);
    expect(result.citations).toHaveLength(1);
    expect(result.citations[0]).toMatchObject({ documentName: 'Travel_Policy.pdf', page: 4 });
  });

  it('treats the model\'s explicit "not found" marker as ungrounded even when chunks were retrieved', async () => {
    retrieve.mockResolvedValue([{ _id: 'chunk-1', documentId: 'doc-1', text: 'Unrelated text', score: 0.7 }]);
    computeConfidence.mockReturnValue(0.7);
    llmProvider.generate.mockResolvedValue({ text: 'NOT_FOUND_IN_CONTEXT', usage: {} });

    const result = await answerQuestion('A question the context does not cover', user);

    expect(result.grounded).toBe(false);
    expect(result.citations).toEqual([]);
  });

  it('treats a low-confidence answer as ungrounded even if the LLM produced text', async () => {
    retrieve.mockResolvedValue([{ _id: 'chunk-1', documentId: 'doc-1', text: 'Marginally related text', score: 0.2 }]);
    computeConfidence.mockReturnValue(0.2); // below the CONFIDENCE_FLOOR
    llmProvider.generate.mockResolvedValue({ text: 'A guess-shaped answer.', usage: {} });

    const result = await answerQuestion('A borderline question', user);

    expect(result.grounded).toBe(false);
  });
});
