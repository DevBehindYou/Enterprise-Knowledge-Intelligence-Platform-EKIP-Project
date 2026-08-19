import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';
import { documentService } from '../services/documentService.js';
import Badge from '../components/foundations/Badge.jsx';
import Button from '../components/foundations/Button.jsx';
import Skeleton from '../components/foundations/Skeleton.jsx';

const RISK_VARIANT = { low: 'success', medium: 'warning', high: 'danger' };

export default function DocumentSummarizer() {
  const { id } = useParams();
  const [doc, setDoc] = useState(null);
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  async function runSummary() {
    setIsLoading(true);
    setError(null);
    try {
      const result = await documentService.summarize(id);
      setSummary(result);
    } catch {
      setError('Could not generate a summary. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    (async () => {
      const docData = await documentService.getOne(id).catch(() => null);
      setDoc(docData);
      await runSummary();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  return (
    <div>
      <div className="flex justify-between items-start mb-6 gap-4 flex-wrap">
        <div>
          <Link to="/documents" className="text-[12.5px] text-ink-muted">
            ← Document library
          </Link>
          <h1 className="text-2xl font-bold mt-2">Summarize {doc?.originalName || '…'}</h1>
          {doc && <p className="text-ink-muted text-[13.5px] mt-1.5">{doc.department} · {doc.securityLevel}</p>}
        </div>
        <Button onClick={runSummary} loading={isLoading}>
          <Sparkles size={16} /> Re-run summary
        </Button>
      </div>

      {error && <div className="text-danger text-sm mb-4">{error}</div>}

      {isLoading ? (
        <div className="grid grid-cols-2 gap-5">
          <Skeleton className="h-32 rounded-component" />
          <Skeleton className="h-32 rounded-component" />
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-2 gap-5 mb-5">
            <div className="card">
              <div className="text-xs uppercase tracking-wide text-ink-muted mb-2.5">Purpose</div>
              <p className="text-[13.5px] leading-relaxed">{summary.purpose}</p>
            </div>
            <div className="card">
              <div className="text-xs uppercase tracking-wide text-ink-muted mb-2.5">Risk flag</div>
              <Badge variant={RISK_VARIANT[summary.riskFlag] || 'warning'}>{summary.riskFlag} risk</Badge>
            </div>
          </div>
          <div className="card">
            <div className="text-xs uppercase tracking-wide text-ink-muted mb-3.5">Key points</div>
            <ul className="flex flex-col gap-3 list-disc pl-5 text-[13px]">
              {(summary.keyPoints || []).map((point, i) => (
                <li key={i}>{point}</li>
              ))}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
