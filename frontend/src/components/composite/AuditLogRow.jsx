import Badge from '../foundations/Badge.jsx';

export default function AuditLogRow({ entry }) {
  return (
    <tr className="hover:bg-black/[0.015]">
      <td className="px-3.5 py-3.5 border-b border-line text-[13px]">{entry.actorId?.name || 'Unknown'}</td>
      <td className="px-3.5 py-3.5 border-b border-line text-[13px]">
        <Badge>{entry.action}</Badge>
      </td>
      <td className="px-3.5 py-3.5 border-b border-line text-[13px]">{entry.targetType}</td>
      <td className="px-3.5 py-3.5 border-b border-line text-[13px] text-ink-muted">
        {Object.entries(entry.metadata || {}).map(([k, v]) => `${k}: ${v}`).join(', ')}
      </td>
      <td className="px-3.5 py-3.5 border-b border-line font-mono text-[12px] text-ink-muted">
        {new Date(entry.createdAt).toLocaleString()}
      </td>
    </tr>
  );
}
