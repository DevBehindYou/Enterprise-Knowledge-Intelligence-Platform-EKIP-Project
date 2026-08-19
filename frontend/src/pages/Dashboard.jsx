import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useConversationHistoryViewModel } from '../viewmodels/useConversationHistoryViewModel.js';
import Skeleton from '../components/foundations/Skeleton.jsx';

export default function Dashboard() {
  const { user } = useAuth();
  const { conversations, isLoading } = useConversationHistoryViewModel();
  const [prompt, setPrompt] = useState('');
  const navigate = useNavigate();
  const firstName = user?.name?.split(' ')[0] || 'there';

  function askNow() {
    if (!prompt.trim()) return;
    navigate('/chat', { state: { prefill: prompt } });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Good to see you, {firstName}</h1>
        <p className="text-ink-muted text-[13.5px] mt-1.5">Here's what's happening across your knowledge base today.</p>
      </div>

      <div className="bg-ink text-white rounded-component p-5 mb-7">
        <div className="flex items-center gap-2 text-[#B7B7C2] text-xs uppercase tracking-wide mb-3">
          <Sparkles size={14} /> Ask anything
        </div>
        <div className="flex gap-2.5">
          <input
            className="flex-1 bg-[#1E1E26] border border-[#2A2A32] rounded-component px-3.5 py-2.5 text-white text-[13.5px] outline-none"
            placeholder="What is the reimbursement policy for international travel?"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && askNow()}
          />
          <button className="btn-primary" onClick={askNow}>
            Ask
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-semibold mb-3">Recent conversations</h3>
          <div className="flex flex-col gap-2">
            {isLoading && [1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full rounded-component" />)}
            {!isLoading && conversations.length === 0 && (
              <div className="border border-dashed border-line rounded-component p-6 text-center text-ink-muted text-sm">
                No conversations yet — ask your first question above.
              </div>
            )}
            {!isLoading &&
              conversations.slice(0, 5).map((c) => (
                <button
                  key={c._id}
                  onClick={() => navigate(`/chat/${c._id}`)}
                  className="card-flat flex justify-between items-center text-left"
                >
                  <div>
                    <div className="font-semibold text-[13.5px]">{c.title}</div>
                    <div className="text-ink-muted text-xs mt-0.5">
                      {new Date(c.updatedAt).toLocaleDateString()} · {c.messageCount} messages
                    </div>
                  </div>
                  <ExternalLink size={16} className="text-ink-muted" />
                </button>
              ))}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-semibold mb-3">Suggested questions</h3>
          <div className="flex flex-col gap-2">
            {[
              { q: 'What is our AWS cloud migration strategy?', tag: 'Engineering' },
              { q: 'What is our SOC2 Type II compliance status?', tag: 'Security' },
              { q: 'What are the 2026 security protocols and MFA requirements?', tag: 'IT Policy' },
              { q: 'What were our Q3 sales results and targets for North America?', tag: 'Sales' },
              { q: 'What is our PTO and remote work equipment stipend policy?', tag: 'HR' }
            ].map((item) => (
              <button
                key={item.q}
                onClick={() => navigate('/chat', { state: { prefill: item.q } })}
                className="card-flat text-left text-[13px] flex items-center justify-between group hover:border-accent transition-colors"
              >
                <span className="font-medium text-ink group-hover:text-accent">"{item.q}"</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-accent/10 text-accent flex-shrink-0 ml-2">
                  {item.tag}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
