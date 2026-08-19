import { useNavigate } from 'react-router-dom';
import { useConversationHistoryViewModel } from '../viewmodels/useConversationHistoryViewModel.js';
import { useDialog } from '../context/DialogContext.jsx';
import Table from '../components/foundations/Table.jsx';
import Button from '../components/foundations/Button.jsx';

export default function ConversationHistory() {
  const { conversations, isLoading, rename, remove } = useConversationHistoryViewModel();
  const { confirm, prompt } = useDialog();
  const navigate = useNavigate();

  const handleRename = async (row) => {
    const title = await prompt({
      title: 'Rename conversation',
      message: 'Enter a new title for this conversation thread.',
      defaultValue: row.title,
      placeholder: 'e.g. Q3 Strategy Discussion'
    });
    if (title && title.trim()) {
      rename(row._id, title.trim());
    }
  };

  const handleDelete = async (row) => {
    const ok = await confirm({
      title: 'Delete conversation',
      message: `Are you sure you want to delete "${row.title}"? This action cannot be undone.`,
      confirmText: 'Delete',
      variant: 'danger'
    });
    if (ok) {
      remove(row._id);
    }
  };

  const columns = [
    {
      key: 'title',
      label: 'Title',
      render: (row) => (
        <button className="font-semibold text-left hover:text-accent transition-colors" onClick={() => navigate(`/chat/${row._id}`)}>
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
            onClick={() => handleRename(row)}
          >
            Rename
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="!text-danger hover:!bg-danger/10"
            onClick={() => handleDelete(row)}
          >
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
