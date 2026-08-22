import { Download } from 'lucide-react';
import { useAuditLogViewModel } from '../../viewmodels/useAuditLogViewModel.js';
import AuditLogRow from '../../components/composite/AuditLogRow.jsx';
import Button from '../../components/foundations/Button.jsx';

export default function AdminAudit() {
  const { entries, isLoading } = useAuditLogViewModel();

  return (
    <div>
      <div className="flex justify-between items-start gap-3 flex-wrap mb-6">
        <div>
          <h1 className="text-2xl font-bold">Audit log</h1>
          <p className="text-ink-muted text-[13.5px] mt-1.5">Append-only record of every login, document access, and permission change.</p>
        </div>
        <Button variant="secondary" className="shrink-0">
          <Download size={16} /> Export CSV
        </Button>
      </div>

      <div className="card !p-0 overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-ink-muted text-sm">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-10 text-center text-ink-muted text-sm">No audit events yet.</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr>
                {['Actor', 'Action', 'Target', 'Detail', 'Timestamp'].map((h) => (
                  <th key={h} className="text-left text-[11.5px] uppercase tracking-wide text-ink-muted font-semibold px-3.5 py-2.5 border-b border-line">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <AuditLogRow key={entry._id} entry={entry} />
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
