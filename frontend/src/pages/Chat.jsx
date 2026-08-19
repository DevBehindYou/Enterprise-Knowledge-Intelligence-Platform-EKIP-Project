import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useChatViewModel } from '../viewmodels/useChatViewModel.js';
import { useConversationHistoryViewModel } from '../viewmodels/useConversationHistoryViewModel.js';
import ChatMessageBubble from '../components/composite/ChatMessageBubble.jsx';

export default function Chat() {
  const { conversationId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { messages, isAsking, error, sendMessage, giveFeedback } = useChatViewModel(conversationId);
  const { conversations } = useConversationHistoryViewModel();
  const [input, setInput] = useState('');
  const threadEndRef = useRef(null);

  // Support being navigated here with a prefilled question (from Dashboard / CommandPalette).
  useEffect(() => {
    if (location.state?.prefill) {
      setInput(location.state.prefill);
    }
  }, [location.state]);

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function onSend() {
    if (!input.trim() || isAsking) return;
    const text = input;
    setInput('');
    await sendMessage(text);
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-6 h-[calc(100vh-160px)]">
      <div className="overflow-y-auto">
        <button onClick={() => navigate('/chat')} className="btn-secondary w-full justify-start mb-3.5">
          <Plus size={16} /> New conversation
        </button>
        <div className="flex flex-col gap-0.5">
          {conversations.map((c) => (
            <button
              key={c._id}
              onClick={() => navigate(`/chat/${c._id}`)}
              className={`nav-item text-ink w-full text-left ${c._id === conversationId ? 'nav-item-active !text-white' : ''}`}
            >
              {c.title}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto pr-2">
          <div className="flex flex-col gap-4.5 max-w-[720px]">
            {messages.length === 0 && (
              <div className="border border-dashed border-line rounded-component p-8 text-center text-ink-muted text-sm">
                Ask anything about company policy, benefits, or procedures — EKIP always cites its source.
              </div>
            )}
            {messages.map((m) => (
              <ChatMessageBubble key={m._id} message={m} onFeedback={giveFeedback} />
            ))}
            {isAsking && (
              <ChatMessageBubble message={{ _id: 'streaming', role: 'assistant', text: '' }} isStreaming />
            )}
            <div ref={threadEndRef} />
          </div>
        </div>

        <div className="border-t border-line pt-3.5 mt-3.5">
          {error && <div className="text-danger text-xs mb-2">{error}</div>}
          <div className="flex gap-2.5">
            <input
              className="input flex-1"
              placeholder="Ask a follow-up question…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSend()}
            />
            <button className="btn-primary" onClick={onSend} disabled={isAsking}>
              Ask
            </button>
          </div>
          <div className="text-[11.5px] text-ink-muted mt-2">
            Answers are generated from documents you're permitted to see. EKIP always cites its source, or tells you when it can't find one.
          </div>
        </div>
      </div>
    </div>
  );
}
