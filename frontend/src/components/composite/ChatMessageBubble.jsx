import CitationChip from './CitationChip.jsx';
import ConfidenceMeter from './ConfidenceMeter.jsx';
import { ThumbsUp, ThumbsDown } from 'lucide-react';

export default function ChatMessageBubble({ message, onFeedback, isStreaming }) {
  const isUser = message.role === 'user';
  const isGrounded = !isUser && message.citations && message.citations.length > 0;
  const isUngrounded = !isUser && !isGrounded && !isStreaming;

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="bg-ink text-white rounded-component px-4 py-3.5 text-[13.5px] leading-relaxed max-w-[560px]">
          {message.text}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3">
      <div
        className={`rounded-component px-4 py-3.5 text-[13.5px] leading-relaxed max-w-[560px] ${
          isUngrounded
            ? 'border border-dashed border-line text-ink-muted italic'
            : 'bg-surface-raised border border-line'
        }`}
      >
        {isStreaming ? <span className="animate-pulse">{message.text || 'Thinking…'}</span> : message.text}

        {isGrounded && (
          <>
            <div className="flex gap-2.5 flex-wrap mt-3">
              {message.citations.map((c) => (
                <CitationChip key={c.chunkId} {...c} />
              ))}
            </div>
            <ConfidenceMeter score={message.confidence} />
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs text-ink-muted">Was this helpful?</span>
              <button
                onClick={() => onFeedback?.(message._id, 'up')}
                className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                  message.feedback === 'up' ? 'bg-accent-tint text-accent-dim border-transparent' : 'border-line text-ink-muted'
                }`}
              >
                <ThumbsUp size={14} />
              </button>
              <button
                onClick={() => onFeedback?.(message._id, 'down')}
                className={`w-7 h-7 rounded-full border flex items-center justify-center ${
                  message.feedback === 'down' ? 'bg-accent-tint text-accent-dim border-transparent' : 'border-line text-ink-muted'
                }`}
              >
                <ThumbsDown size={14} />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
