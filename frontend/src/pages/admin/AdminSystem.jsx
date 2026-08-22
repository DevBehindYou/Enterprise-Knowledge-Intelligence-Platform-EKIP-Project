import { useEffect, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { apiClient } from '../../lib/apiClient.js';
import { adminService } from '../../services/adminService.js';
import StatusBadge from '../../components/composite/StatusBadge.jsx';
import Button from '../../components/foundations/Button.jsx';

const STAGE_TO_STATUS = {
  extraction: 'processing',
  chunking: 'processing',
  embedding: 'processing',
  indexing: 'processing',
  done: 'ready',
  failed: 'failed',
};

export default function AdminSystem() {
  const [health, setHealth] = useState(null);
  const [queue, setQueue] = useState(null);
  const [isLoadingQueue, setIsLoadingQueue] = useState(true);

  async function loadHealth() {
    try {
      const { data } = await apiClient.get('/health');
      setHealth(data);
    } catch {
      setHealth({ status: 'unreachable' });
    }
  }

  async function loadQueue() {
    setIsLoadingQueue(true);
    try {
      const data = await adminService.getIngestionQueue();
      setQueue(data);
    } catch {
      setQueue(null);
    } finally {
      setIsLoadingQueue(false);
    }
  }

  useEffect(() => {
    loadHealth();
    loadQueue();
  }, []);

  const counts = queue?.counts || {};

  return (
    <div>
      <div className="flex justify-between items-start gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">System health</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">Ingestion queue, provider status, and infrastructure at a glance.</p>
        </div>
        <Button variant="secondary" onClick={() => { loadHealth(); loadQueue(); }} className="shrink-0">
          <RefreshCw size={16} /> Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <div className="text-xs uppercase text-ink-muted">API</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${health?.status === 'ok' ? 'bg-success' : 'bg-danger'}`} />
            <span className="font-semibold">{health?.status === 'ok' ? 'Operational' : 'Unreachable'}</span>
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-ink-muted">MongoDB Atlas</div>
          <div className="flex items-center gap-2 mt-2">
            <span className={`w-1.5 h-1.5 rounded-full ${health?.mongoConnected ? 'bg-success' : 'bg-danger'}`} />
            <span className="font-semibold">{health?.mongoConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </div>
        <div className="card">
          <div className="text-xs uppercase text-ink-muted">Checked at</div>
          <div className="font-mono text-sm mt-2">{health?.timestamp ? new Date(health.timestamp).toLocaleTimeString() : '—'}</div>
        </div>
      </div>

      <div className="card mb-6">
        <div className="flex justify-between items-center gap-3 flex-wrap mb-4">
          <div className="text-sm font-semibold">Ingestion queue (BullMQ / Redis)</div>
          {!isLoadingQueue && (
            <div className="flex gap-2 flex-wrap">
              <span className="badge">{counts.waiting ?? 0} waiting</span>
              <span className="badge-warning badge">{counts.active ?? 0} active</span>
              <span className="badge-danger badge">{counts.failed ?? 0} failed</span>
            </div>
          )}
        </div>

        {isLoadingQueue ? (
          <div className="text-ink-muted text-sm py-4">Loading queue…</div>
        ) : !queue ? (
          <div className="text-ink-muted text-sm py-4">
            Could not reach the ingestion queue. Make sure Redis is running and <span className="font-mono">worker.js</span> is started
            (<span className="font-mono">npm run worker</span>).
          </div>
        ) : queue.recentJobs.length === 0 ? (
          <div className="text-ink-muted text-sm py-4">No ingestion jobs yet.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead>
              <tr>
                {['Document', 'Stage', 'Attempts', 'Started', ''].map((h) => (
                  <th key={h} className="text-left text-[11.5px] uppercase tracking-wide text-ink-muted font-semibold px-3 py-2 border-b border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {queue.recentJobs.map((job) => (
                <tr key={job._id}>
                  <td className="px-3 py-3 border-b border-line font-semibold">{job.documentName}</td>
                  <td className="px-3 py-3 border-b border-line">
                    <StatusBadge status={STAGE_TO_STATUS[job.stage] || 'queued'} />
                    <span className="ml-2 text-xs text-ink-muted capitalize">{job.stage}</span>
                  </td>
                  <td className="px-3 py-3 border-b border-line font-mono">{job.attempts}</td>
                  <td className="px-3 py-3 border-b border-line text-ink-muted">{new Date(job.startedAt).toLocaleString()}</td>
                  <td className="px-3 py-3 border-b border-line text-right text-ink-muted text-xs">{job.lastError || ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
