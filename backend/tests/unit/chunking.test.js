import { describe, it, expect } from 'vitest';
import { chunkText } from '../../src/services/rag/chunking.js';

describe('chunkText', () => {
  it('returns a single chunk for short text', () => {
    const chunks = chunkText('This is a short policy paragraph about travel reimbursement.');
    expect(chunks).toHaveLength(1);
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].text).toContain('travel reimbursement');
  });

  it('splits long text into multiple chunks with increasing chunkIndex', () => {
    const paragraph = 'Employees must submit receipts within fifteen days of travel completion. '.repeat(80);
    const longText = [paragraph, paragraph, paragraph].join('\n\n');
    const chunks = chunkText(longText);

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => {
      expect(chunk.chunkIndex).toBe(i);
      expect(chunk.text.length).toBeGreaterThan(0);
    });
  });

  it('preserves overlap so context is not lost at chunk boundaries', () => {
    const paragraph = 'Section 3.2 covers international travel reimbursement rules in detail. '.repeat(100);
    const chunks = chunkText(paragraph);
    if (chunks.length > 1) {
      // The end of chunk N should share some text with the start of chunk N+1 (overlap window).
      const tailOfFirst = chunks[0].text.slice(-50);
      expect(chunks[1].text.includes(tailOfFirst.slice(-20))).toBe(true);
    }
  });

  it('ignores empty/whitespace-only input gracefully', () => {
    expect(chunkText('   \n\n   ')).toEqual([]);
  });
});
