import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MessageCircle, Folder } from 'lucide-react';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        onClose(false); // toggled by parent — see AppShell
      }
      if (e.key === 'Escape') onClose(true);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-signal/50 flex items-start justify-center pt-[15vh] z-50" onClick={() => onClose(true)}>
      <div className="bg-surface rounded-card p-5 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 border border-line rounded-component px-3.5 py-3">
          <Search size={16} className="text-ink-muted" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-transparent outline-none text-[13.5px]"
            placeholder="Ask a question or search documents…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                navigate('/chat', { state: { prefill: query } });
                onClose(true);
              }
            }}
          />
          <span className="font-mono text-[11px] text-ink-muted">ESC</span>
        </div>
        <div className="text-xs text-ink-muted uppercase tracking-wide mt-3.5 mb-2">Suggested</div>
        <button
          className="nav-item text-ink w-full"
          onClick={() => {
            navigate('/chat');
            onClose(true);
          }}
        >
          <MessageCircle size={16} /> Ask the assistant a question
        </button>
        <button
          className="nav-item text-ink w-full"
          onClick={() => {
            navigate('/documents');
            onClose(true);
          }}
        >
          <Folder size={16} /> Browse the document library
        </button>
      </div>
    </div>
  );
}
