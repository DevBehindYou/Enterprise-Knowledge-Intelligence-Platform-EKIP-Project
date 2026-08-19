import { useNavigate } from 'react-router-dom';
import { useConversationHistoryViewModel } from '../viewmodels/useConversationHistoryViewModel.js';
import Table from '../components/foundations/Table.jsx';
import Button from '../components/foundations/Button.jsx';

export default function ConversationHistory() {
  const { conversations, isLoading, rename, remove } = useConversationHistoryViewModel();
  const navigate = useNavigate();

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (row) => (
        <button className="font-semibold text-left" onClick={() => navigate(`/chat/${row._id}`)}>
          {row.title}
        </button>
      ),
    },
    { key: 'messageCount', label: 'Length', render: (row) => <span className="font-mono text-ink-muted">{row.messageCount} messages</span> },
    { key: 'updatedAt', label: 'Last activity', render: (row) => <span className="text-ink-muted">{new Date(row.updatedAt).toLocaleDateString()}</span> },
    {
      key: 'actions',
      label: '',
      render: (row) => (
        <div className="flex gap-1.5 justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const title = window.prompt('Rename conversation', row.title);
              if (title) rename(row._id, title);
            }}
          >
            Rename
          </Button>
          <Button variant="ghost" size="sm" className="!text-danger" onClick={() => window.confirm('Delete this conversation?') && remove(row._id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-bold">Conversations</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">Your past questions and answers. Only you can see the content of these.</p>
        </div>
      </div>
      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-ink-muted text-sm">Loading…</div>
        ) : (
          <Table columns={columns} rows={conversations} emptyLabel="No conversations yet — ask your first question in Chat." />
        )}
      </div>
    </div>
  );
}
