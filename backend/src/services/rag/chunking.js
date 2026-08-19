/**
 * Recursive-ish chunking by approximate character count (using a ~4 chars/token
 * heuristic to avoid pulling in a full tokenizer dependency for this scaffold).
 * Splits on paragraph boundaries first, falling back to sentence boundaries
 * for oversized paragraphs, with ~15% overlap carried into the next chunk so
 * context isn't lost at a chunk boundary.
 */
const TARGET_CHARS = 2400; // ~600 tokens
const OVERLAP_CHARS = 360; // ~15%

export function chunkText(text) {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  const chunks = [];
  let buffer = '';

  function pushCurrentChunk() {
    if (buffer.trim().length > 0) chunks.push(buffer.trim());
  }

  // Captures the overlap BEFORE clearing the buffer — the earlier version of this
  // function cleared `buffer` first and then read from it, which meant overlap was
  // always computed from an already-empty string and silently did nothing.
  function startNewChunk(nextPiece) {
    const overlap = buffer.slice(-OVERLAP_CHARS);
    pushCurrentChunk();
    buffer = overlap ? `${overlap} ${nextPiece}` : nextPiece;
  }

  for (const para of paragraphs) {
    if (para.length > TARGET_CHARS) {
      // Oversized paragraph: split on sentence boundaries instead.
      const sentences = para.split(/(?<=[.!?])\s+/);
      for (const sentence of sentences) {
        const wouldOverflow = (buffer + ' ' + sentence).length > TARGET_CHARS;
        if (wouldOverflow && buffer.length > 0) {
          startNewChunk(sentence);
        } else {
          buffer += buffer ? ` ${sentence}` : sentence;
        }
      }
      continue;
    }

    const wouldOverflow = (buffer + '\n\n' + para).length > TARGET_CHARS;
    if (wouldOverflow && buffer.length > 0) {
      startNewChunk(para);
    } else {
      buffer += buffer ? `\n\n${para}` : para;
    }
  }
  pushCurrentChunk();

  return chunks.map((chunkText, chunkIndex) => ({ text: chunkText, chunkIndex }));
}
