import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { MessageCircle, Download } from 'lucide-react';
import { documentService } from '../services/documentService.js';
import Badge from '../components/foundations/Badge.jsx';
import Skeleton from '../components/foundations/Skeleton.jsx';

const LEVEL_VARIANT = { public: 'success', internal: 'accent', confidential: 'warning', restricted: 'danger' };

export default function DocumentPreview() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [doc, setDoc] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      setIsLoading(true);
      try {
        const data = await documentService.getOne(id);
        setDoc(data);
      } catch (err) {
        if (err.response?.status === 404) setError('not-found');
        else setError('generic');
      } finally {
        setIsLoading(false);
      }
    })();
  }, [id]);

  if (isLoading) {
    return (
      <div className="max-w-3xl">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error === 'not-found') {
    return (
      <div className="border border-dashed border-line rounded-component p-10 text-center text-ink-muted">
        This document doesn't exist, or you don't have access to it.
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <Link to="/documents" className="text-[12.5px] text-ink-muted">
            ← Document library
          </Link>
          <h1 className="text-2xl font-bold mt-2">{doc.originalName}</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">
            {doc.department} · {doc.securityLevel} · Updated {new Date(doc.updatedAt).toLocaleDateString()} · v{doc.version}
          </p>
        </div>
        <div className="flex gap-2.5">
          <button className="btn-secondary" onClick={() => navigate('/chat', { state: { prefill: `About ${doc.originalName}: ` } })}>
            <MessageCircle size={16} /> Ask about this document
          </button>
          {doc.accessLevel === 'cite' && (
            <button className="btn-secondary" onClick={() => documentService.downloadFile(doc._id, doc.originalName)}>
              <Download size={16} /> Download
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_300px] gap-6">
        <div className="card min-h-[420px]">
          <div className="flex justify-between items-center mb-4">
            <span className="font-mono text-xs text-ink-muted">
              {doc.pageCount ? `${doc.pageCount} pages` : 'Preview'}
            </span>
          </div>
          <div className="bg-white border border-line rounded p-8 text-[13px] leading-loose text-[#2b2b30]">
            Full document rendering (PDF/DOCX viewer) goes here in production — wire in
            <span className="font-mono"> react-pdf</span> or a DOCX-to-HTML renderer bound to{' '}
            <span className="font-mono">doc.storageUrl</span>. When arrived at via a Citation Chip's
            <span className="font-mono"> ?chunk=</span> param, this view should auto-scroll to and highlight that chunk.
          </div>
        </div>
        <div>
          <div className="card mb-4">
            <div className="text-xs uppercase tracking-wide text-ink-muted mb-3">Metadata</div>
            <div className="flex flex-col gap-2.5 text-[13px]">
              <div className="flex justify-between"><span className="text-ink-muted">Department</span><span>{doc.department}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Security level</span><Badge variant={LEVEL_VARIANT[doc.securityLevel]}>{doc.securityLevel}</Badge></div>
              <div className="flex justify-between"><span className="text-ink-muted">Version</span><span className="font-mono">v{doc.version}</span></div>
              <div className="flex justify-between"><span className="text-ink-muted">Your access</span><span className="capitalize">{doc.accessLevel}</span></div>
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-wide text-ink-muted mb-3">Tags</div>
            <div className="flex gap-1.5 flex-wrap">
              {(doc.tags || []).map((t) => (
                <Badge key={t}>{t}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
