import { useState } from 'react';
import { useAnalyticsViewModel } from '../../viewmodels/useAnalyticsViewModel.js';
import { analyticsService } from '../../services/analyticsService.js';
import Modal from '../../components/foundations/Modal.jsx';
import Button from '../../components/foundations/Button.jsx';
import Badge from '../../components/foundations/Badge.jsx';

function confidenceBadge(score) {
  if (score >= 0.8) return <Badge variant="accent">{score.toFixed(2)}</Badge>;
  if (score >= 0.5) return <Badge variant="warning">{score.toFixed(2)}</Badge>;
  return <Badge variant="danger">{score.toFixed(2)}</Badge>;
}

export default function AdminEvaluation() {
  const { data, isLoading } = useAnalyticsViewModel({ evaluation: true });
  const [reviewing, setReviewing] = useState(null);
  const [notes, setNotes] = useState('');

  async function markReviewed() {
    await analyticsService.markEvaluationReviewed(reviewing._id, notes);
    setReviewing(null);
    setNotes('');
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Evaluation dashboard</h1>
        <p className="text-ink-muted text-[13.5px] mt-1.5">Retrieval quality, hallucination review, and confidence distribution.</p>
      </div>

      {isLoading ? (
        <div className="text-ink-muted text-sm">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 mb-6">
            <div className="card">
              <div className="text-xs uppercase text-ink-muted">Citation coverage</div>
              <div className="font-display text-2xl font-bold mt-1.5">{Math.round((data?.upRate || 0) * 100)}%</div>
            </div>
            <div className="card">
              <div className="text-xs uppercase text-ink-muted">Flagged for review</div>
              <div className="font-display text-2xl font-bold mt-1.5">{data?.flaggedForReview ?? 0}</div>
            </div>
            <div className="card">
              <div className="text-xs uppercase text-ink-muted">Avg. confidence</div>
              <div className="font-display text-2xl font-bold mt-1.5">{(data?.avgConfidence || 0).toFixed(2)}</div>
            </div>
            <div className="card">
              <div className="text-xs uppercase text-ink-muted">Total feedback</div>
              <div className="font-display text-2xl font-bold mt-1.5">{data?.total ?? 0}</div>
            </div>
          </div>

          <div className="card">
            <div className="text-sm font-semibold mb-1">Hallucination review queue</div>
            <p className="text-xs text-ink-muted mb-4">
              Answers flagged 👎, awaiting triage. Only retrieval scores are shown here — never full conversation content.
            </p>
            {(data?.reviewQueue || []).length === 0 ? (
              <div className="text-ink-muted text-sm py-4">Nothing flagged right now.</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr>
                    {['Message ID', 'Confidence', 'Flagged', ''].map((h) => (
                      <th key={h} className="text-left text-[11.5px] uppercase tracking-wide text-ink-muted font-semibold px-3 py-2 border-b border-line">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.reviewQueue.map((item) => (
                    <tr key={item._id}>
                      <td className="px-3 py-3 border-b border-line font-mono text-xs">{item.messageId}</td>
                      <td className="px-3 py-3 border-b border-line">{confidenceBadge(item.retrievalScoreAtTime || 0)}</td>
                      <td className="px-3 py-3 border-b border-line text-ink-muted text-xs">{new Date(item.createdAt).toLocaleString()}</td>
                      <td className="px-3 py-3 border-b border-line text-right">
                        <Button variant="secondary" size="sm" onClick={() => setReviewing(item)}>
                          Review
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      <Modal isOpen={Boolean(reviewing)} onClose={() => setReviewing(null)} title="Review flagged answer">
        <p className="text-xs text-ink-muted mb-4">
          Confidence at time of answer: {reviewing?.retrievalScoreAtTime?.toFixed(2)}
        </p>
        <label className="block text-[12.5px] font-semibold mb-1.5">Notes</label>
        <textarea className="input mb-4" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. source doc doesn't cover this case — needs new content" />
        <div className="flex gap-2.5 justify-end">
          <Button variant="secondary" onClick={() => setReviewing(null)}>
            Close
          </Button>
          <Button onClick={markReviewed}>Mark reviewed</Button>
        </div>
      </Modal>
    </div>
  );
}
