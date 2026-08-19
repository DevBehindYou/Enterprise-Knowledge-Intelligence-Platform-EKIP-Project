import { useNavigate } from 'react-router-dom';

/**
 * The product's one signature UI motif (docs/05-uiux-design-system.md §5).
 * Reserved exclusively for grounded AI-answer citations — never used decoratively.
 */
export default function CitationChip({ documentId, documentName, page, section, chunkId }) {
  const navigate = useNavigate();
  const locationLabel = page ? `Page ${page}` : section || '';

  return (
    <button
      className="citation-chip"
      onClick={() => navigate(`/documents/${documentId}?chunk=${chunkId}`)}
      title={`Open ${documentName}`}
    >
      <span className="cap" />
      <span className="body">
        <div className="text-[12.5px] font-semibold">{documentName}</div>
        {locationLabel && <div className="font-mono text-[11px] opacity-85 mt-0.5">{locationLabel}</div>}
      </span>
    </button>
  );
}
