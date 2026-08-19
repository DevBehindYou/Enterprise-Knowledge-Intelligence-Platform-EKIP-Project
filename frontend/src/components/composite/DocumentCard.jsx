import { useNavigate } from 'react-router-dom';
import { FileText } from 'lucide-react';
import Badge from '../foundations/Badge.jsx';

const LEVEL_VARIANT = { public: 'success', internal: 'accent', confidential: 'warning', restricted: 'danger' };
const LEVEL_LABEL = { public: 'Public', internal: 'Internal', confidential: 'Confidential', restricted: 'Restricted' };

export default function DocumentCard({ document }) {
  const navigate = useNavigate();
  return (
    <button
      className="doc-card text-left bg-surface-raised border border-line rounded-component p-4 hover:border-accent"
      onClick={() => navigate(`/documents/${document._id}`)}
    >
      <div className="w-9 h-9 rounded-lg bg-accent-tint text-accent-dim flex items-center justify-center mb-3">
        <FileText size={16} />
      </div>
      <div className="font-semibold text-[13.5px] mb-2">{document.originalName}</div>
      <div className="flex gap-1.5 flex-wrap mb-2.5">
        <Badge>{document.department}</Badge>
        <Badge variant={LEVEL_VARIANT[document.securityLevel]}>{LEVEL_LABEL[document.securityLevel]}</Badge>
      </div>
      <div className="text-[11.5px] text-ink-muted">
        Updated {new Date(document.updatedAt).toLocaleDateString()}
      </div>
    </button>
  );
}
