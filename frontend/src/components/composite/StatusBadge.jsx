import Badge from '../foundations/Badge.jsx';

const STATUS_VARIANT = { ready: 'success', processing: 'warning', failed: 'danger', queued: 'neutral' };
const STATUS_LABEL = { ready: 'Ready', processing: 'Processing', failed: 'Failed', queued: 'Queued' };
const DOT_COLOR = { ready: 'bg-success', processing: 'bg-warning', failed: 'bg-danger', queued: 'bg-ink-muted' };

export default function StatusBadge({ status }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-1.5 h-1.5 rounded-full ${DOT_COLOR[status]}`} />
      <Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]}</Badge>
    </span>
  );
}
